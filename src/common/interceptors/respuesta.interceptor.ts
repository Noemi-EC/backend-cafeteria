import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { MENSAJE_KEY } from '../decorators/mensaje.decorator';

export interface RespuestaApi<T> {
  status: number;
  message: string;
  data: T | null;
}

@Injectable()
export class RespuestaInterceptor<T> implements NestInterceptor<
  T,
  RespuestaApi<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<RespuestaApi<T>> {
    const res = context.switchToHttp().getResponse<Response>();
    const mensaje =
      this.reflector.get<string>(MENSAJE_KEY, context.getHandler()) ?? 'Operación exitosa';

    return next.handle().pipe(
      map((data) => ({
        status: res.statusCode,
        message: mensaje,
        data: data ?? null,
      })),
    );
  }
}
