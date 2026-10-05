import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Local } from '../../locales/entities/local.entity';

export enum Rol {
  CLIENTE = 'CLIENTE',
  BARISTA = 'BARISTA',
  ADMIN = 'ADMIN',
}

@Entity('usuarios')
@Unique(['localId', 'contacto'])
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'local_id' })
  localId: string;

  @ManyToOne(() => Local, { nullable: false })
  @JoinColumn({ name: 'local_id' })
  local: Local;

  @Column()
  contacto: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.CLIENTE })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}