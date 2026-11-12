import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

@Module({
  // AuthModule exporta JwtModule, que es lo que necesita el JwtAuthGuard.
  // UsuariosModule aporta el repositorio de Usuario, que hace falta
  // para el cambio de contraseña.
  imports: [TypeOrmModule.forFeature([PerfilCliente]), UsuariosModule, AuthModule],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
