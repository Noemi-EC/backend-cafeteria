import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { ClientesService } from './clientes.service';

// Todo el controlador es solo para barista y admin: el @Roles de la clase
// aplica a cada endpoint, no hace falta repetirlo en cada método.
@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.BARISTA, Rol.ADMIN)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @Mensaje('Clientes obtenidos')
  listar(@UsuarioActual('localId') localId: string) {
    return this.clientesService.listar(localId);
  }

  @Delete(':usuarioId')
  @Mensaje('Cliente desactivado')
  desactivar(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @UsuarioActual('localId') localId: string,
  ) {
    return this.clientesService.desactivar(usuarioId, localId);
  }

  @Patch(':usuarioId/restaurar')
  @Mensaje('Cliente restaurado')
  restaurar(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @UsuarioActual('localId') localId: string,
  ) {
    return this.clientesService.restaurar(usuarioId, localId);
  }
}
