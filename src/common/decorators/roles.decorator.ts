import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../usuarios/entities/usuario.entity';

export const ROLES_KEY = 'roles_permitidos';

/**
 * Marca qué roles pueden ejecutar un endpoint.
 *
 *   @Roles(Rol.BARISTA, Rol.ADMIN)
 *
 * El decorador NO valida nada por sí solo: solo deja la lista guardada como
 * metadata. Quien la lee y decide es el RolesGuard.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
