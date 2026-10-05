import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('locales')
export class Local {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  ruc: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ default: true })
  activo: boolean;
}