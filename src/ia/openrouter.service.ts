import { Injectable, Logger } from '@nestjs/common';
import { ConfiguracionService } from '../configuracion/configuracion.service';

interface RespuestaOpenRouter {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number };
}

/**
 * Único punto de la aplicación que habla con el proveedor de IA.
 *
 * Dos decisiones importantes:
 *
 * 1. La API key vive SOLO aquí, en el servidor, leída del .env. Nunca viaja
 *    a la app: lo que se instala en un teléfono se puede abrir y leer, así
 *    que una clave dentro del APK es una clave pública.
 *
 * 2. Este servicio nunca lanza excepciones hacia arriba. Si el proveedor
 *    falla, tarda o devuelve algo que no se puede leer, retorna null y
 *    quien lo llamó decide qué hacer. La funcionalidad no puede caerse
 *    porque un servicio externo tuvo un mal día.
 */
@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private static readonly URL =
    'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly configuracion: ConfiguracionService) {}

  /**
   * La clave ya no se lee del .env directamente: la resuelve el servicio
   * de configuración, que busca primero en la base de datos. Por eso estos
   * métodos son asíncronos.
   */
  async modelo(): Promise<string> {
    return (
      (await this.configuracion.obtener('OPENROUTER_MODEL')) ??
      'cohere/north-mini-code:free'
    );
  }

  async estado() {
    const clave = await this.configuracion.obtener('OPENROUTER_API_KEY');
    const activa = await this.configuracion.obtener('IA_ACTIVA');

    return {
      claveConfigurada: Boolean(clave),
      habilitada: Boolean(clave) && activa !== 'false',
      modelo: await this.modelo(),
    };
  }

  /**
   * Pide una respuesta en JSON y la devuelve ya parseada, o null.
   * El tipo T es lo que el llamador espera; igual hay que validarlo,
   * porque un modelo puede devolver JSON válido con contenido inventado.
   */
  async completarJson<T>(sistema: string, usuario: string): Promise<T | null> {
    const { habilitada, modelo } = await this.estado();
    if (!habilitada) return null;

    const clave = await this.configuracion.obtener('OPENROUTER_API_KEY');

    // Si el proveedor tarda demasiado, se corta: el usuario no puede
    // quedarse mirando un spinner por culpa de un modelo lento.
    const controlador = new AbortController();
    const corte = setTimeout(() => controlador.abort(), 15000);

    try {
      const respuesta = await fetch(OpenRouterService.URL, {
        method: 'POST',
        signal: controlador.signal,
        headers: {
          Authorization: `Bearer ${clave}`,
          'Content-Type': 'application/json',
          'X-Title': 'Raiz Contigo',
        },
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: 'system', content: sistema },
            { role: 'user', content: usuario },
          ],
          temperature: 0.8,
          // Los modelos gratuitos suelen razonar antes de responder,
          // así que hay que dejar margen o la respuesta llega cortada.
          max_tokens: 600,
        }),
      });

      if (!respuesta.ok) {
        this.logger.warn(`OpenRouter respondió ${respuesta.status}`);
        return null;
      }

      const cuerpo = (await respuesta.json()) as RespuestaOpenRouter;

      // OpenRouter puede devolver 200 con un error adentro.
      if (cuerpo.error) {
        this.logger.warn(`OpenRouter: ${cuerpo.error.message ?? 'error'}`);
        return null;
      }

      const texto = cuerpo.choices?.[0]?.message?.content;
      if (!texto) return null;

      return this.extraerJson<T>(texto);
    } catch (e) {
      const motivo = e instanceof Error ? e.message : 'desconocido';
      this.logger.warn(`No se pudo consultar OpenRouter: ${motivo}`);
      return null;
    } finally {
      clearTimeout(corte);
    }
  }

  /**
   * Los modelos suelen envolver el JSON en ```json ... ``` o acompañarlo
   * de texto. Se recorta desde la primera llave hasta la última.
   */
  private extraerJson<T>(texto: string): T | null {
    const inicio = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (inicio === -1 || fin === -1 || fin <= inicio) return null;

    try {
      return JSON.parse(texto.slice(inicio, fin + 1)) as T;
    } catch {
      this.logger.warn('La respuesta del modelo no era JSON válido');
      return null;
    }
  }
}
