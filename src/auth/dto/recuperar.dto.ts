import { IsNotEmpty, IsString } from 'class-validator';

export class RecuperarDto {
  @IsString()
  @IsNotEmpty({ message: 'Indica tu correo o número' })
  contacto: string;
}
