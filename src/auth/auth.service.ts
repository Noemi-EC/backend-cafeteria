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
import { randomInt, randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CorreoService } from '../correo/correo.service';
import { CodigoRecuperacion } from './entities/codigo-recuperacion.entity';
import { RecuperarDto } from './dto/recuperar.dto';
import { RestablecerDto } from './dto/restablecer.dto';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Rol, Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly correo: CorreoService,
    @InjectRepository(CodigoRecuperacion)
    private readonly codigos: Repository<CodigoRecuperacion>,
  ) {}

  /** Minutos de vigencia del código de recuperación. */
  private static readonly MINUTOS_CODIGO = 15;

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

  /**
   * Paso 1: pedir un código.
   *
   * Responde siempre lo mismo, exista o no la cuenta. Si dijera "ese
   * correo no está registrado", cualquiera podría averiguar quiénes son
   * clientes del local probando direcciones.
   */
  async recuperar({ contacto }: RecuperarDto) {
    const respuesta = {
      mensaje:
        'Si la cuenta existe, enviamos un código al contacto registrado',
    };

    const usuario = await this.usuariosService.buscarPorContacto(contacto);
    if (!usuario || !usuario.activo) return respuesta;

    // Un código nuevo invalida los anteriores que siguieran pendientes.
    await this.codigos.update(
      { usuarioId: usuario.id, usadoEn: IsNull() },
      { usadoEn: new Date() },
    );

    // randomInt del módulo crypto, no Math.random: este número es un secreto.
    const codigo = String(randomInt(100000, 1000000));

    await this.codigos.save(
      this.codigos.create({
        usuarioId: usuario.id,
        codigoHash: await bcrypt.hash(codigo, 10),
        expiraEn: new Date(
          Date.now() + AuthService.MINUTOS_CODIGO * 60 * 1000,
        ),
        usadoEn: null,
      }),
    );

    await this.correo.enviarCodigoRecuperacion(
      usuario.contacto,
      codigo,
      AuthService.MINUTOS_CODIGO,
    );

    return respuesta;
  }

  /**
   * Paso 2: canjear el código por una contraseña nueva.
   *
   * Todos los fallos devuelven el mismo mensaje — código equivocado,
   * vencido, ya usado o cuenta inexistente — para no ir revelando en qué
   * parte del proceso se falló.
   */
  async restablecer({ contacto, codigo, passwordNueva }: RestablecerDto) {
    const generico = new UnauthorizedException(
      'El código no es válido o ya venció',
    );

    const usuario = await this.usuariosService.buscarPorContacto(contacto);
    if (!usuario || !usuario.activo) throw generico;

    const registro = await this.codigos.findOne({
      where: { usuarioId: usuario.id, usadoEn: IsNull() },
      order: { creadoEn: 'DESC' },
    });

    if (!registro || registro.expiraEn < new Date()) throw generico;

    const coincide = await bcrypt.compare(codigo, registro.codigoHash);
    if (!coincide) throw generico;

    await this.dataSource.transaction(async (manager) => {
      registro.usadoEn = new Date();
      await manager.save(registro);

      await manager.update(Usuario, usuario.id, {
        passwordHash: await bcrypt.hash(passwordNueva, 10),
      });
    });

    await this.correo.enviarAvisoCambioPassword(usuario.contacto);

    return { actualizada: true };
  }
}
