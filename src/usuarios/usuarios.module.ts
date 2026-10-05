import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';
import { PerfilCliente } from './entities/perfil-cliente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, PerfilCliente])],
  providers: [UsuariosService],
  exports: [UsuariosService, TypeOrmModule],
})
export class UsuariosModule {}
