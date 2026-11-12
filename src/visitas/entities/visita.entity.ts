import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Local } from '../../locales/entities/local.entity';
import { PerfilCliente } from '../../usuarios/entities/perfil-cliente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Una visita del cliente a la cafetería.
 *
 * No se borra nunca de verdad: eliminar una visita la marca como anulada
 * (borrado lógico). Si se borrara la fila, se perdería el historial y el
 * total de visitas dejaría de cuadrar con lo que pasó en el local.
 */
@Entity('visitas')
export class Visita {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'local_id' })
  localId: string;

  @ManyToOne(() => Local, { nullable: false })
  @JoinColumn({ name: 'local_id' })
  local: Local;

  @Column({ name: 'cliente_id' })
  clienteId: string;

  @ManyToOne(() => PerfilCliente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cliente_id' })
  cliente: PerfilCliente;

  // Quién la registró: el barista que atendió.
  @Column({ name: 'registrada_por_id' })
  registradaPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'registrada_por_id' })
  registradaPor: Usuario;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nota: string | null;

  @Column({ default: false })
  anulada: boolean;

  @Column({ name: 'anulada_en', type: 'timestamp', nullable: true })
  anuladaEn: Date | null;

  @CreateDateColumn({ name: 'registrada_en' })
  registradaEn: Date;
}
