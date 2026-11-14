import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Envío de correo.
 *
 * Igual que el servicio de IA, este nunca lanza excepciones hacia arriba:
 * si el correo no sale, la operación que lo pidió no debe fallar por eso.
 *
 * Si no hay SMTP configurado, el mensaje se escribe en la consola del
 * servidor. Así el flujo completo se puede probar y demostrar sin depender
 * de una cuenta de correo.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private transporte: Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  private async credenciales() {
    return {
      usuario: await this.configuracion.obtener('SMTP_USER'),
      clave: await this.configuracion.obtener('SMTP_PASS'),
    };
  }

  async configurado(): Promise<boolean> {
    const { usuario, clave } = await this.credenciales();
    return Boolean(usuario && clave);
  }

  private obtenerTransporte(usuario: string, clave: string): Transporter {
    if (!this.transporte) {
      const puerto = Number(this.config.get<string>('SMTP_PORT') ?? 465);

      this.transporte = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
        port: puerto,
        secure: puerto === 465, // 465 va cifrado desde el inicio; 587 negocia después
        auth: { user: usuario, pass: clave },
      });
    }

    return this.transporte;
  }

  private async enviar(para: string, asunto: string, cuerpo: string) {
    const { usuario, clave } = await this.credenciales();

    if (!usuario || !clave) {
      this.logger.warn(
        `SMTP no configurado. Correo que se habría enviado a ${para}:\n${asunto}\n${cuerpo}`,
      );
      return;
    }

    try {
      await this.obtenerTransporte(usuario, clave).sendMail({
        from: this.config.get<string>('MAIL_FROM') ?? `Café Link <${usuario}>`,
        to: para,
        subject: asunto,
        text: cuerpo,
      });
      this.logger.log(`Correo enviado a ${para}`);
    } catch (e) {
      const motivo = e instanceof Error ? e.message : 'desconocido';
      this.logger.warn(`No se pudo enviar el correo a ${para}: ${motivo}`);
    }
  }

  async enviarCodigoRecuperacion(
    para: string,
    codigo: string,
    minutos: number,
  ) {
    await this.enviar(
      para,
      'Tu código para recuperar la contraseña',
      [
        'Recibimos una solicitud para restablecer tu contraseña en Raíz Contigo.',
        '',
        `Tu código es: ${codigo}`,
        '',
        `Vence en ${minutos} minutos y solo se puede usar una vez.`,
        'Si no fuiste tú, ignora este mensaje: tu contraseña no cambió.',
        '',
        'Café Link',
      ].join('\n'),
    );
  }

  async enviarAvisoCambioPassword(para: string) {
    await this.enviar(
      para,
      'Tu contraseña fue cambiada',
      [
        'La contraseña de tu cuenta en Raíz Contigo acaba de cambiar.',
        '',
        'Si fuiste tú, no tienes que hacer nada.',
        'Si no reconoces este cambio, avísanos en el local cuanto antes.',
        '',
        'Café Link',
      ].join('\n'),
    );
  }
}
