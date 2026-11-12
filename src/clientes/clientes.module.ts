import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ClientesController } from './clientes.controller';
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
  imports: [UsuariosModule, AuthModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
