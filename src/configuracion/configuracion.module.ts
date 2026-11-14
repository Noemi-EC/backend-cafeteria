import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { Configuracion } from './entities/configuracion.entity';

/**
 * Global porque lo consultan varios servicios (IA, correo, visitas) y
 * no aporta nada importarlo uno por uno.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Configuracion]), AuthModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
