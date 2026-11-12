import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IaModule } from '../ia/ia.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { BeneficiosController } from './beneficios.controller';
import { BeneficiosService } from './beneficios.service';

@Module({
  imports: [UsuariosModule, AuthModule, IaModule],
  controllers: [BeneficiosController],
  providers: [BeneficiosService],
})
export class BeneficiosModule {}
