import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Código temporal para recuperar la contraseña.
 *
 * Se guarda cifrado, igual que una contraseña: si alguien leyera la base
 * de datos no podría usar los códigos pendientes. Cada uno vence y solo
 * sirve una vez.
 */
@Entity('codigos_recuperacion')
export class CodigoRecuperacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'codigo_hash' })
  codigoHash: string;

  @Column({ name: 'expira_en', type: 'timestamp' })
  expiraEn: Date;

  @Column({ name: 'usado_en', type: 'timestamp', nullable: true })
  usadoEn: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
