import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  private presentar(perfil: PerfilCliente) {
    return {
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

  /** Lista los clientes del local, activos e inactivos. */
  async listar(localId: string) {
    const perfiles = await this.perfiles.find({
      where: { usuario: { localId, rol: Rol.CLIENTE } },
      relations: { usuario: true },
      order: { nombre: 'ASC' },
    });

    return perfiles.map((p) => this.presentar(p));
  }

  /** Eliminar (lógico): desactiva la cuenta del cliente. */
  async desactivar(usuarioId: string, localId: string) {
    const usuario = await this.buscarCliente(usuarioId, localId);

    if (!usuario.activo) {
      throw new ConflictException('Este cliente ya estaba desactivado');
    }

    usuario.activo = false;
    await this.usuarios.save(usuario);

    return this.presentar(await this.buscarPerfil(usuarioId));
  }

  /** Restauración de usuarios: vuelve a activar la cuenta. */
  async restaurar(usuarioId: string, localId: string) {
    const usuario = await this.buscarCliente(usuarioId, localId);

    if (usuario.activo) {
      throw new ConflictException('Este cliente ya estaba activo');
    }

    usuario.activo = true;
    await this.usuarios.save(usuario);

    return this.presentar(await this.buscarPerfil(usuarioId));
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
