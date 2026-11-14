import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Configuración que se puede cambiar sin tocar el código ni reiniciar.
 *
 * El valor se guarda cifrado, no en texto plano: así un respaldo de la
 * base de datos tampoco expone las claves de los servicios externos.
 * La llave para descifrar vive en el .env, que nunca se sube al repositorio.
 */
@Entity('configuraciones')
export class Configuracion {
  @PrimaryColumn()
  clave: string;

  @Column({ name: 'valor_cifrado', type: 'text' })
  valorCifrado: string;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
