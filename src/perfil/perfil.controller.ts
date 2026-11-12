import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { PerfilService } from './perfil.service';

// El guard protege TODO el controlador: ningún endpoint de aquí
// responde sin un token válido.
@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  @Mensaje('Perfil obtenido')
  obtener(@UsuarioActual('sub') usuarioId: string) {
    return this.perfilService.obtener(usuarioId);
  }

  @Patch()
  @Mensaje('Perfil actualizado')
  actualizar(
    @UsuarioActual('sub') usuarioId: string,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.perfilService.actualizar(usuarioId, dto);
  }

  // Ruta distinta a la de arriba: PATCH /perfil/password
  @Patch('password')
  @Mensaje('Contraseña actualizada')
  cambiarPassword(
    @UsuarioActual('sub') usuarioId: string,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.perfilService.cambiarPassword(usuarioId, dto);
  }
}
