import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { Visita } from './entities/visita.entity';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';

@Module({
  imports: [
    // forFeature registra la entidad: sin esto, autoLoadEntities no la ve
    // y la tabla `visitas` nunca se crea.
    TypeOrmModule.forFeature([Visita]),
    // UsuariosModule reexporta TypeOrmModule, de ahí sale el repositorio
    // de PerfilCliente que usa el servicio.
    UsuariosModule,
    // AuthModule exporta JwtModule, que necesita el JwtAuthGuard.
    AuthModule,
  ],
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
