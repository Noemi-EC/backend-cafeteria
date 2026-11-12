import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Rol } from '../../usuarios/entities/usuario.entity';

// Lo que viaja dentro del JWT. Firmado, no cifrado: nada sensible aquí.
export interface PayloadToken {
  sub: string; // id del usuario
  rol: Rol;
  localId: string;
}

/**
 * Corre ANTES del controlador. Si el token no es válido, el controlador
 * nunca se ejecuta. Deja el payload en req.usuario para que cada endpoint
 * sepa quién pregunta sin recibirlo por parámetro.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const cabecera = req.headers.authorization;

    if (!cabecera?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No se envió el token de sesión');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadToken>(
        cabecera.slice(7),
      );
      (req as Request & { usuario?: PayloadToken }).usuario = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}
