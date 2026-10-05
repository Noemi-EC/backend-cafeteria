import { SetMetadata } from '@nestjs/common';

export const MENSAJE_KEY = 'mensaje_respuesta';
export const Mensaje = (mensaje: string) => SetMetadata(MENSAJE_KEY, mensaje);
