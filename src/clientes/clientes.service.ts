import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visita } from '../visitas/entities/visita.entity';
import { calcularNivel } from '../perfil/niveles';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

/**
 * Gestión de usuarios (punto 3.1 de la rúbrica), desde el lado del barista.
 *
 * Eliminar un cliente NO borra su fila: lo marca como inactivo. Restaurar
 * lo vuelve a activar. Es la misma pieza vista desde los dos lados, y es
 * lo correcto: un cliente con historial de visitas no se puede borrar sin
 * dejar visitas huérfanas.
 */
@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
  ) {}

  private presentar(perfil: PerfilCliente, ultimaVisitaEn: Date | null = null) {
    return {
      ultimaVisitaEn,
      usuarioId: perfil.usuarioId,
      nombre: perfil.nombre,
      contacto: perfil.usuario?.contacto ?? null,
      codigoQr: perfil.codigoQr,
      totalVisitas: perfil.totalVisitas,
      productoFavorito: perfil.productoFavorito,
      activo: perfil.usuario?.activo ?? true,
      ...calcularNivel(perfil.totalVisitas),
    };
  }

  /**
   * Lista los clientes del local, activos e inactivos.
   *
   * Van ordenados por última visita, del más reciente al más antiguo, y al
   * final los que nunca vinieron. Un barista atiende a quien está delante:
   * el orden alfabético no le sirve de nada.
   */
  async listar(localId: string) {
    const perfiles = await this.perfiles.find({
      where: { usuario: { localId, rol: Rol.CLIENTE } },
      relations: { usuario: true },
    });

    // Una sola consulta agrupada en vez de una por cliente.
    const filas = await this.visitas
      .createQueryBuilder('v')
      .select('v.cliente_id', 'clienteId')
      .addSelect('MAX(v.registrada_en)', 'ultima')
      .where('v.local_id = :localId', { localId })
      .andWhere('v.anulada = false')
      .groupBy('v.cliente_id')
      .getRawMany<{ clienteId: string; ultima: Date }>();

    const ultimas = new Map(filas.map((f) => [f.clienteId, f.ultima]));

    return perfiles
      .map((p) => this.presentar(p, ultimas.get(p.id) ?? null))
      .sort((a, b) => {
        if (!a.ultimaVisitaEn && !b.ultimaVisitaEn) {
          return a.nombre.localeCompare(b.nombre);
        }
        if (!a.ultimaVisitaEn) return 1;
        if (!b.ultimaVisitaEn) return -1;
        return (
          new Date(b.ultimaVisitaEn).getTime() -
          new Date(a.ultimaVisitaEn).getTime()
        );
      });
  }

  /** Eliminar (lógico): desactiva la cuenta del cliente. */
  async desactivar(usuarioId: string, localId: string) {
    const usuario = await this.buscarCliente(usuarioId, localId);

    if (!usuario.activo) {
      throw new ConflictException('Este cliente ya estaba desactivado');
    }

    usuario.activo = false;
    await this.usuarios.save(usuario);

    return this.presentar(await this.buscarPerfil(usuarioId), await this.ultimaVisita(usuarioId));
  }

  /** Restauración de usuarios: vuelve a activar la cuenta. */
  async restaurar(usuarioId: string, localId: string) {
    const usuario = await this.buscarCliente(usuarioId, localId);

    if (usuario.activo) {
      throw new ConflictException('Este cliente ya estaba activo');
    }

    usuario.activo = true;
    await this.usuarios.save(usuario);

    return this.presentar(await this.buscarPerfil(usuarioId), await this.ultimaVisita(usuarioId));
  }

  /**
   * Solo clientes y solo del mismo local: un barista no puede desactivar
   * a otro barista, ni tocar usuarios de otra cafetería.
   */
  private async buscarCliente(
    usuarioId: string,
    localId: string,
  ): Promise<Usuario> {
    const usuario = await this.usuarios.findOne({
      where: { id: usuarioId, localId, rol: Rol.CLIENTE },
    });

    if (!usuario) {
      throw new NotFoundException('El cliente no existe en este local');
    }

    return usuario;
  }

  private async ultimaVisita(usuarioId: string): Promise<Date | null> {
    const perfil = await this.perfiles.findOne({ where: { usuarioId } });
    if (!perfil) return null;

    const visita = await this.visitas.findOne({
      where: { clienteId: perfil.id, anulada: false },
      order: { registradaEn: 'DESC' },
    });

    return visita?.registradaEn ?? null;
  }

  private async buscarPerfil(usuarioId: string): Promise<PerfilCliente> {
    const perfil = await this.perfiles.findOne({
      where: { usuarioId },
      relations: { usuario: true },
    });

    if (!perfil) {
      throw new NotFoundException('Este usuario no tiene perfil de cliente');
    }

    return perfil;
  }
}
