import { Global, Module } from '@nestjs/common';
import { CorreoService } from './correo.service';

/**
 * Global porque lo usan varios módulos (auth y perfil) y no aporta nada
 * importarlo en cada uno: no tiene estado propio ni dependencias cruzadas.
 */
@Global()
@Module({
  providers: [CorreoService],
  exports: [CorreoService],
})
export class CorreoModule {}
