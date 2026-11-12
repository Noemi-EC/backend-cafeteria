import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ClientesController } from './clientes.controller';
import { Visita } from '../visitas/entities/visita.entity';
import { ClientesService } from './clientes.service';

/**
 * Va en su propio módulo y no dentro de UsuariosModule a propósito:
 * AuthModule ya importa UsuariosModule, así que si UsuariosModule
 * importara AuthModule para usar el guard, se formaría una dependencia
 * circular. Con un módulo aparte las flechas van en un solo sentido.
 */
@Module({
  // UsuariosModule reexporta TypeOrmModule con Usuario y PerfilCliente.
  // AuthModule exporta JwtModule, que necesita el JwtAuthGuard.
  // forFeature([Visita]) aquí también: el repositorio se puede registrar
  // en varios módulos, y así este no depende de VisitasModule.
  imports: [TypeOrmModule.forFeature([Visita]), UsuariosModule, AuthModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
