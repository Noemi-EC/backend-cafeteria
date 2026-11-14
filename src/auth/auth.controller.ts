import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { RegistroDto } from './dto/registro.dto';
import { RecuperarDto } from './dto/recuperar.dto';
import { RestablecerDto } from './dto/restablecer.dto';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { UsuariosService } from '../usuarios/usuarios.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Mensaje('Inicio de sesión correcto')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @Mensaje('Cuenta creada correctamente')
  registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto);
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  @Mensaje('Solicitud recibida')
  recuperar(@Body() dto: RecuperarDto) {
    return this.authService.recuperar(dto);
  }

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  @Mensaje('Contraseña restablecida')
  restablecer(@Body() dto: RestablecerDto) {
    return this.authService.restablecer(dto);
  }

  /**
   * Quién es el dueño de esta sesión. El id sale del token, nunca de un
   * parámetro: así nadie puede pedir los datos de otra cuenta.
   */
  @Get('yo')
  @UseGuards(JwtAuthGuard)
  @Mensaje('Sesión actual')
  async yo(@UsuarioActual('sub') usuarioId: string) {
    const usuario = await this.usuariosService.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NotFoundException('El usuario de esta sesión ya no existe');
    }

    return {
      id: usuario.id,
      contacto: usuario.contacto,
      rol: usuario.rol,
      activo: usuario.activo,
      creadoEn: usuario.creadoEn,
      local: usuario.local
        ? { id: usuario.local.id, nombre: usuario.local.nombre }
        : null,
    };
  }
}
