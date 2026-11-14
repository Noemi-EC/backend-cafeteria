import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class RestablecerDto {
  @IsString()
  @IsNotEmpty({ message: 'Indica tu correo o número' })
  contacto: string;

  @IsString()
  @Length(6, 6, { message: 'El código tiene 6 dígitos' })
  codigo: string;

  @IsString()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  passwordNueva: string;
}
