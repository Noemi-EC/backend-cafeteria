import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarVisitaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'La nota no puede pasar de 120 caracteres' })
  nota?: string;
}
