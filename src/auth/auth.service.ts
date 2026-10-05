import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async login({ contacto, password }: LoginDto) {
    const usuario =
      await this.usuariosService.buscarPorContactoConHash(contacto);
    if (!usuario) {
      throw new UnauthorizedException('Contacto o contraseña incorrectos');
    }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) {
      throw new UnauthorizedException('Contacto o contraseña incorrectos');
    }

    const payload = {
      sub: usuario.id,
      rol: usuario.rol,
      localId: usuario.localId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      rol: usuario.rol,
    };
  }

  async registro({
    nombre,
    contacto,
    password,
    productoFavorito,
  }: RegistroDto) {
    const localId = this.config.get<string>('LOCAL_ID_DEFAULT');
    if (!localId) {
      throw new InternalServerErrorException(
        'Falta configurar LOCAL_ID_DEFAULT',
      );
    }

    const existente = await this.usuariosService.buscarPorContacto(contacto);
    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese contacto');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await this.dataSource.transaction(async (manager) => {
      const nuevo = manager.create(Usuario, {
        localId,
        contacto,
        passwordHash,
        rol: Rol.CLIENTE,
      });
      await manager.save(nuevo);

      const perfil = manager.create(PerfilCliente, {
        usuarioId: nuevo.id,
        nombre,
        codigoQr: randomUUID(),
        productoFavorito: productoFavorito ?? null,
      });
      await manager.save(perfil);

      return nuevo;
    });

    const payload = {
      sub: usuario.id,
      rol: usuario.rol,
      localId: usuario.localId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      rol: usuario.rol,
    };
  }
}
