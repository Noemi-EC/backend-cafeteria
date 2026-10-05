import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class RespuestaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RespuestaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado';
    let data: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const cuerpo = exception.getResponse();

      if (typeof cuerpo === 'string') {
        message = cuerpo;
      } else if (cuerpo && typeof cuerpo === 'object') {
        const m = (cuerpo as { message?: string | string[] }).message;
        if (Array.isArray(m)) {
          message = m[0];          // el primero, para mostrar
          data = { errores: m };   // todos, por si los necesitas
        } else if (typeof m === 'string') {
          message = m;
        }
      }
    } else {
      this.logger.error(exception); // un 500 va al log, nunca al cliente
    }

    res.status(status).json({ status, message, data });
  }
}
