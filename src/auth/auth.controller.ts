import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { RegistroDto } from './dto/registro.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
