import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PayloadToken } from '../../auth/guards/jwt-auth.guard';

/**
 * Lee el payload que dejó el JwtAuthGuard en la petición.
 *
 *   @UsuarioActual()        -> { sub, rol, localId }
 *   @UsuarioActual('sub')   -> solo el id del usuario
 */
export const UsuarioActual = createParamDecorator(
  (campo: keyof PayloadToken | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ usuario?: PayloadToken }>();
    return campo ? req.usuario?.[campo] : req.usuario;
  },
);
