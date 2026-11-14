import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { esClaveValida } from './catalogo';
import { ConfiguracionService } from './configuracion.service';
import { GuardarConfiguracionDto } from './dto/guardar-configuracion.dto';

/**
 * Solo ADMIN. Un barista no tiene por qué poder cambiar la clave de un
 * servicio externo, y un cliente menos.
 */
@Controller('configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  @Mensaje('Configuración actual')
  listar() {
    return this.configuracion.listar();
  }

  @Put(':clave')
  @Mensaje('Configuración guardada')
  async guardar(
    @Param('clave') clave: string,
    @Body() dto: GuardarConfiguracionDto,
  ) {
    this.verificar(clave);
    await this.configuracion.guardar(clave, dto.valor.trim());
    return { clave, guardado: true };
  }

  @Delete(':clave')
  @Mensaje('Configuración eliminada')
  async eliminar(@Param('clave') clave: string) {
    this.verificar(clave);
    await this.configuracion.eliminar(clave);
    return { clave, eliminado: true };
  }

  private verificar(clave: string) {
    if (!esClaveValida(clave)) {
      throw new BadRequestException(`La clave "${clave}" no está permitida`);
    }
  }
}
