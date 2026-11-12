import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { calcularNivel } from './niveles';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  private async buscar(usuarioId: string): Promise<PerfilCliente> {
    const perfil = await this.perfiles.findOne({
      where: { usuarioId },
      relations: { usuario: true },
    });

    if (!perfil) {
      throw new NotFoundException('Este usuario no tiene perfil de cliente');
    }

    return perfil;
  }

  // Forma única de la respuesta, para que la app siempre reciba lo mismo.
  private presentar(perfil: PerfilCliente) {
    return {
      id: perfil.id,
      nombre: perfil.nombre,
      contacto: perfil.usuario?.contacto ?? null,
      // El cliente necesita ver su propio código: es lo que el barista
      // registra hoy a mano y lo que mañana llevará el QR.
      codigoQr: perfil.codigoQr,
      productoFavorito: perfil.productoFavorito,
      totalVisitas: perfil.totalVisitas,
      fotoUrl: perfil.fotoUrl,
      notificacionesActivas: perfil.notificacionesActivas,
      ...calcularNivel(perfil.totalVisitas),
    };
  }

  async obtener(usuarioId: string) {
    return this.presentar(await this.buscar(usuarioId));
  }

  async actualizar(usuarioId: string, dto: ActualizarPerfilDto) {
    const perfil = await this.buscar(usuarioId);
    Object.assign(perfil, dto);
    await this.perfiles.save(perfil);
    return this.presentar(perfil);
  }

  /**
   * Cambio de contraseña (punto 3.1 de la rúbrica).
   *
   * Pide la contraseña actual aunque el usuario ya esté autenticado: si
   * alguien deja el teléfono desbloqueado, el token por sí solo no debería
   * alcanzar para quedarse con la cuenta.
   */
  async cambiarPassword(usuarioId: string, dto: CambiarPasswordDto) {
    // passwordHash tiene select:false, por eso hay que pedirlo a mano.
    const usuario = await this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.id = :id', { id: usuarioId })
      .getOne();

    if (!usuario) {
      throw new NotFoundException('El usuario no existe');
    }

    const coincide = await bcrypt.compare(
      dto.passwordActual,
      usuario.passwordHash,
    );
    if (!coincide) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    if (dto.passwordActual === dto.passwordNueva) {
      throw new ConflictException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    // Se guarda el hash, nunca la contraseña: bcrypt no tiene vuelta atrás.
    usuario.passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    await this.usuarios.save(usuario);

    return { actualizada: true };
  }
}
