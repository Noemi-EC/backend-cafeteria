import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistroDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(60)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El contacto es obligatorio' })
  @MaxLength(120)
  contacto: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  productoFavorito?: string;
}
