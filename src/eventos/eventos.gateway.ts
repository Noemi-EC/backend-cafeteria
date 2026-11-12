import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { PayloadToken } from '../auth/guards/jwt-auth.guard';

/**
 * Canal en tiempo real.
 *
 * HTTP sirve para que el cliente PREGUNTE. Esto sirve para que el servidor
 * AVISE sin que nadie pregunte: cuando el barista registra una visita, la
 * pantalla del cliente se entera sola, sin recargar y sin estar consultando
 * cada pocos segundos.
 *
 * Cada socket entra a dos "salas":
 *   local:<id>   -> todo el personal de esa cafetería
 *   usuario:<id> -> ese usuario en particular
 *
 * Las salas son lo que evita que un mensaje llegue a quien no le toca.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventosGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventosGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * El WebSocket no pasa por los guards de HTTP, así que la autenticación
   * se hace aquí a mano: el token viaja en el handshake y, si no es válido,
   * la conexión se corta antes de entrar a ninguna sala.
   */
  async handleConnection(socket: Socket) {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadToken>(token);
      socket.data.usuario = payload;

      await socket.join(`local:${payload.localId}`);
      await socket.join(`usuario:${payload.sub}`);

      this.logger.log(`Conectado ${payload.rol} (${payload.sub.slice(0, 8)})`);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const usuario = socket.data.usuario as PayloadToken | undefined;
    if (usuario) {
      this.logger.log(`Desconectado ${usuario.sub.slice(0, 8)}`);
    }
  }

  /** Avisa al local y, aparte, al cliente que acaba de sumar la visita. */
  emitirVisitaRegistrada(
    localId: string,
    usuarioId: string,
    datos: unknown,
  ): void {
    this.server.to(`local:${localId}`).emit('visita.registrada', datos);
    this.server.to(`usuario:${usuarioId}`).emit('mi.visita.registrada', datos);
  }

  emitirVisitaAnulada(localId: string, usuarioId: string, datos: unknown): void {
    this.server.to(`local:${localId}`).emit('visita.anulada', datos);
    this.server.to(`usuario:${usuarioId}`).emit('mi.visita.anulada', datos);
  }
}
