import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Debes escribir tu contraseña actual' })
  passwordActual: string;

  @IsString()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  passwordNueva: string;
}
