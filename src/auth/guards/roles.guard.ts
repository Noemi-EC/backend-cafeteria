import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { PayloadToken } from './jwt-auth.guard';

/**
 * Control de permisos (punto 3.2 de la rúbrica).
 *
 * Corre DESPUÉS del JwtAuthGuard, por eso puede confiar en req.usuario:
 * el orden lo define @UseGuards(JwtAuthGuard, RolesGuard).
 *
 * Diferencia importante:
 *   401 Unauthorized -> no sé quién eres (lo resuelve JwtAuthGuard)
 *   403 Forbidden    -> sé quién eres y no te corresponde (lo resuelve este)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca @Roles primero en el método y, si no hay, en la clase.
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint sin @Roles: basta con estar autenticado.
    if (!permitidos || permitidos.length === 0) return true;

    const req = context
      .switchToHttp()
      .getRequest<{ usuario?: PayloadToken }>();
    const usuario = req.usuario;

    if (!usuario) {
      throw new UnauthorizedException('No se encontró la sesión');
    }

    if (!permitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'Tu rol no tiene permiso para realizar esta acción',
      );
    }

    return true;
  }
}
