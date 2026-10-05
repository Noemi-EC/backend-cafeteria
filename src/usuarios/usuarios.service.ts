import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  // El hash está oculto por select:false, hay que pedirlo explícitamente
  buscarPorContactoConHash(contacto: string): Promise<Usuario | null> {
    return this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.contacto = :contacto', { contacto })
      .andWhere('usuario.activo = true')
      .getOne();
  }

  buscarPorContacto(contacto: string): Promise<Usuario | null> {
    return this.usuarios.findOne({ where: { contacto } });
  }
}
