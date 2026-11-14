import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Repository } from 'typeorm';
import { CLAVES, enmascarar } from './catalogo';
import { Configuracion } from './entities/configuracion.entity';

const ALGORITMO = 'aes-256-gcm';
const LARGO_IV = 12;
const LARGO_TAG = 16;

/**
 * Lee y escribe la configuración de la aplicación.
 *
 * Orden de búsqueda: primero la base de datos, y si ahí no está, el .env.
 * Así se puede cambiar una clave desde la app sin reiniciar el servidor,
 * y el .env sigue sirviendo como respaldo en una instalación nueva.
 *
 * Los valores se cifran con AES-256-GCM. GCM además de cifrar autentica:
 * si alguien modificara la fila a mano, el descifrado falla en vez de
 * devolver basura.
 */
@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  /** Caché en memoria: sin esto cada beneficio generado haría una consulta. */
  private readonly cache = new Map<string, string | null>();

  constructor(
    @InjectRepository(Configuracion)
    private readonly repo: Repository<Configuracion>,
    private readonly config: ConfigService,
  ) {}

  /** 32 bytes derivados del secreto del .env. */
  private get llave(): Buffer {
    const secreto =
      this.config.get<string>('CONFIG_SECRET') ??
      this.config.get<string>('JWT_SECRET') ??
      '';

    if (!secreto) {
      throw new Error('Falta CONFIG_SECRET en el .env');
    }

    return createHash('sha256').update(secreto).digest();
  }

  private cifrar(texto: string): string {
    const iv = randomBytes(LARGO_IV);
    const cifrador = createCipheriv(ALGORITMO, this.llave, iv);
    const datos = Buffer.concat([
      cifrador.update(texto, 'utf8'),
      cifrador.final(),
    ]);

    // iv + tag + datos, todo junto en base64
    return Buffer.concat([iv, cifrador.getAuthTag(), datos]).toString('base64');
  }

  private descifrar(paquete: string): string | null {
    try {
      const bruto = Buffer.from(paquete, 'base64');
      const iv = bruto.subarray(0, LARGO_IV);
      const tag = bruto.subarray(LARGO_IV, LARGO_IV + LARGO_TAG);
      const datos = bruto.subarray(LARGO_IV + LARGO_TAG);

      const descifrador = createDecipheriv(ALGORITMO, this.llave, iv);
      descifrador.setAuthTag(tag);

      return Buffer.concat([
        descifrador.update(datos),
        descifrador.final(),
      ]).toString('utf8');
    } catch {
      // Pasa si cambió CONFIG_SECRET o si la fila fue alterada.
      this.logger.warn('No se pudo descifrar un valor de configuración');
      return null;
    }
  }

  /** El valor efectivo: primero la base de datos, después el .env. */
  async obtener(clave: string): Promise<string | null> {
    if (this.cache.has(clave)) return this.cache.get(clave) ?? null;

    const fila = await this.repo.findOne({ where: { clave } });
    const valor = fila
      ? this.descifrar(fila.valorCifrado)
      : (this.config.get<string>(clave) ?? null);

    this.cache.set(clave, valor);
    return valor;
  }

  async guardar(clave: string, valor: string): Promise<void> {
    await this.repo.save({ clave, valorCifrado: this.cifrar(valor) });
    this.cache.delete(clave);
  }

  async eliminar(clave: string): Promise<void> {
    await this.repo.delete({ clave });
    this.cache.delete(clave);
  }

  /**
   * Lo que ve el administrador. Las claves secretas nunca salen completas:
   * una vez guardadas, solo se pueden reemplazar.
   */
  async listar() {
    const filas = await this.repo.find();
    const guardadas = new Map(filas.map((f) => [f.clave, f]));

    return Promise.all(
      CLAVES.map(async (definicion) => {
        const fila = guardadas.get(definicion.clave);
        const valor = await this.obtener(definicion.clave);

        return {
          clave: definicion.clave,
          descripcion: definicion.descripcion,
          secreta: definicion.secreta,
          definido: Boolean(valor),
          origen: fila ? 'base de datos' : valor ? 'archivo .env' : 'sin definir',
          valor: !valor
            ? null
            : definicion.secreta
              ? enmascarar(valor)
              : valor,
          actualizadoEn: fila?.actualizadoEn ?? null,
        };
      }),
    );
  }
}
