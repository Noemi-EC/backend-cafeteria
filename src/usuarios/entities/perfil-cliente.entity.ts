import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('perfiles_cliente')
export class PerfilCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column({ name: 'codigo_qr', unique: true })
  codigoQr: string;

  @Column({ name: 'total_visitas', default: 0 })
  totalVisitas: number;

  @Column({ name: 'foto_url', type: 'varchar', nullable: true })
  fotoUrl: string | null;

  @Column({ name: 'notificaciones_activas', default: true })
  notificacionesActivas: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @Column({ name: 'producto_favorito', type: 'varchar', nullable: true })
  productoFavorito: string | null;
}
