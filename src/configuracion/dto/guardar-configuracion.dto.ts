import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GuardarConfiguracionDto {
  @IsString()
  @IsNotEmpty({ message: 'El valor no puede estar vacío' })
  @MaxLength(500, { message: 'El valor es demasiado largo' })
  valor: string;
}
