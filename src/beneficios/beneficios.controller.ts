import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { BeneficiosService } from './beneficios.service';

@Controller('beneficios')
@UseGuards(JwtAuthGuard)
export class BeneficiosController {
  constructor(private readonly beneficiosService: BeneficiosService) {}

  // POST y no GET porque cada llamada consulta al proveedor de IA:
  // no es una lectura gratuita ni repetible sin costo.
  @Post('generar')
  @HttpCode(200)
  @Mensaje('Beneficio generado')
  generar(@UsuarioActual('sub') usuarioId: string) {
    return this.beneficiosService.generar(usuarioId);
  }
}
