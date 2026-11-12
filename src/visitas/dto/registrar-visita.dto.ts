import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarVisitaDto {
  // El código que identifica al cliente. Hoy se escribe a mano;
  // cuando entre la cámara, el escáner llenará exactamente este campo.
  @IsString()
  @IsNotEmpty({ message: 'El código del cliente es obligatorio' })
  codigoQr: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'La nota no puede pasar de 120 caracteres' })
  nota?: string;
}
