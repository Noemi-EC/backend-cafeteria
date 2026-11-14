import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede pasar de 60 caracteres' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El contacto es obligatorio' })
  @MaxLength(120, { message: 'El contacto no puede pasar de 120 caracteres' })
  contacto: string;

  // Mismo mínimo que en el cambio y en la recuperación de contraseña:
  // si cada pantalla pidiera algo distinto, el usuario quedaría con una
  // contraseña que una de ellas no acepta.
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  productoFavorito?: string;
}
