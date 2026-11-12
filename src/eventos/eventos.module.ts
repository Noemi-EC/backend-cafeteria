import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventosGateway } from './eventos.gateway';

@Module({
  imports: [AuthModule], // JwtModule, para verificar el token del handshake
  providers: [EventosGateway],
  exports: [EventosGateway],
})
export class EventosModule {}
