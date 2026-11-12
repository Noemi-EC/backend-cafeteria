import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// Todos los campos son opcionales: es un PATCH, se envía solo lo que cambia.
export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  productoFavorito?: string;

  @IsOptional()
  @IsBoolean()
  notificacionesActivas?: boolean;
}
