import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IaController } from './ia.controller';
import { OpenRouterService } from './openrouter.service';

@Module({
  imports: [AuthModule], // para el JwtAuthGuard del endpoint de estado
  controllers: [IaController],
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class IaModule {}
