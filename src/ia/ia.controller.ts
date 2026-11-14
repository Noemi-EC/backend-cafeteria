import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { OpenRouterService } from './openrouter.service';
import { CATALOGO } from './catalogo';

/**
 * Diagnóstico de la integración de IA.
 *
 * Sirve para dos cosas: comprobar desde Postman que la clave quedó bien
 * configurada, y poder mostrar en la exposición que la app funciona igual
 * con la IA encendida o apagada.
 *
 * Nunca devuelve la API key, solo si existe.
 */
@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(private readonly openRouter: OpenRouterService) {}

  @Get('estado')
  @Mensaje('Estado de la integración de IA')
  async estado() {
    return {
      proveedor: 'OpenRouter',
      ...(await this.openRouter.estado()),
      productosEnCatalogo: CATALOGO.length,
    };
  }
}
