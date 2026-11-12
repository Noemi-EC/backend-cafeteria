import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { ActualizarVisitaDto } from './dto/actualizar-visita.dto';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';
import { VisitasService } from './visitas.service';

/**
 * Los dos guards van en este orden a propósito: primero se verifica el
 * token y recién después el rol, porque RolesGuard necesita saber quién es
 * el usuario para poder compararlo con la lista de @Roles.
 */
@Controller('visitas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  // --- Registrar datos -----------------------------------------------
  @Post()
  @Roles(Rol.BARISTA, Rol.ADMIN)
  @Mensaje('Visita registrada')
  registrar(
    @Body() dto: RegistrarVisitaDto,
    @UsuarioActual('localId') localId: string,
    @UsuarioActual('sub') baristaId: string,
  ) {
    return this.visitasService.registrar(dto, localId, baristaId);
  }

  // --- Consultar información -----------------------------------------
  // Sin @Roles: cualquier usuario autenticado ve su propio historial.
  @Get('mias')
  @Mensaje('Historial obtenido')
  mias(@UsuarioActual('sub') usuarioId: string) {
    return this.visitasService.listarDeCliente(usuarioId);
  }

  @Get()
  @Roles(Rol.BARISTA, Rol.ADMIN)
  @Mensaje('Visitas del local obtenidas')
  delLocal(@UsuarioActual('localId') localId: string) {
    return this.visitasService.listarDelLocal(localId);
  }

  // --- Actualizar registros -------------------------------------------
  @Patch(':id')
  @Roles(Rol.BARISTA, Rol.ADMIN)
  @Mensaje('Visita actualizada')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarVisitaDto,
    @UsuarioActual('localId') localId: string,
  ) {
    return this.visitasService.actualizarNota(id, localId, dto);
  }

  // --- Eliminar registros (borrado lógico) -----------------------------
  @Delete(':id')
  @Roles(Rol.BARISTA, Rol.ADMIN)
  @Mensaje('Visita anulada')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual('localId') localId: string,
  ) {
    return this.visitasService.anular(id, localId);
  }
}
