import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu correo o número' })
  contacto: string;

  /**
   * Acá no se valida el largo a propósito.
   *
   * Exigir un mínimo al iniciar sesión no aporta seguridad — la regla ya
   * se aplicó al crear la cuenta — y sí causa problemas: si mañana cambia
   * la política, las contraseñas antiguas dejarían de poder usarse. Lo
   * único que importa es que venga algo.
   */
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu contraseña' })
  password: string;
}
