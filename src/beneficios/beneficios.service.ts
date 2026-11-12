import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CATALOGO, existeEnCatalogo } from '../ia/catalogo';
import { OpenRouterService } from '../ia/openrouter.service';
import { calcularNivel } from '../perfil/niveles';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { decidirBeneficio, type Beneficio, type ContextoCliente } from './reglas';

/** Lo que se le pide al modelo que devuelva. */
interface RespuestaIa {
  mensaje?: string;
  producto_mencionado?: string | null;
}

const LARGO_MAXIMO = 240;

@Injectable()
export class BeneficiosService {
  private readonly logger = new Logger(BeneficiosService.name);

  constructor(
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
    private readonly openRouter: OpenRouterService,
  ) {}

  async generar(usuarioId: string) {
    const perfil = await this.perfiles.findOne({ where: { usuarioId } });
    if (!perfil) {
      throw new NotFoundException('Este usuario no tiene perfil de cliente');
    }

    const contexto: ContextoCliente = {
      nombre: perfil.nombre,
      totalVisitas: perfil.totalVisitas,
      productoFavorito: perfil.productoFavorito,
      ...calcularNivel(perfil.totalVisitas),
    };

    // 1. La regla decide el beneficio. Esto no lo toca la IA.
    const beneficio = decidirBeneficio(contexto);

    // 2. La IA solo redacta. Si falla, queda la plantilla.
    const redactado = await this.redactar(beneficio, contexto);

    return {
      beneficio: {
        codigo: beneficio.codigo,
        titulo: beneficio.titulo,
        producto: beneficio.producto,
        motivo: beneficio.motivo,
      },
      mensaje: redactado.mensaje,
      generadoPor: redactado.origen,
      modelo: redactado.origen === 'ia' ? this.openRouter.modelo : null,
    };
  }

  private async redactar(
    beneficio: Beneficio,
    ctx: ContextoCliente,
  ): Promise<{ mensaje: string; origen: 'ia' | 'plantilla' }> {
    const sistema = [
      'Eres el barista de Café Link, una cafetería de especialidad en Lima.',
      'Escribes mensajes cortos y cálidos para clientes frecuentes, en español peruano, tuteando.',
      'No inventas productos, precios ni promociones: solo redactas el beneficio que te indican.',
      `Los únicos productos que existen son: ${CATALOGO.join(', ')}.`,
      'Respondes ÚNICAMENTE con un objeto JSON, sin texto antes ni después, con esta forma:',
      '{"mensaje": "...", "producto_mencionado": "nombre exacto del producto o null"}',
      `El mensaje debe tener como máximo ${LARGO_MAXIMO} caracteres y no llevar emojis.`,
    ].join(' ');

    const usuario = [
      `Cliente: ${ctx.nombre}.`,
      `Nivel: ${ctx.nivel}. Visitas acumuladas: ${ctx.totalVisitas}.`,
      `Pedido de siempre: ${ctx.productoFavorito ?? 'todavía no lo eligió'}.`,
      `Beneficio que le corresponde: ${beneficio.titulo}.`,
      `Motivo: ${beneficio.motivo}.`,
      'Redacta el mensaje con el que se lo anunciamos.',
    ].join(' ');

    const respuesta = await this.openRouter.completarJson<RespuestaIa>(
      sistema,
      usuario,
    );

    if (!respuesta) {
      return { mensaje: beneficio.plantilla, origen: 'plantilla' };
    }

    // 3. Validación semántica: no basta con que el JSON sea válido.
    const mensaje = respuesta.mensaje?.trim();

    if (!mensaje || mensaje.length > LARGO_MAXIMO) {
      this.logger.warn('Mensaje de la IA vacío o demasiado largo');
      return { mensaje: beneficio.plantilla, origen: 'plantilla' };
    }

    // Si dice haber mencionado un producto, tiene que existir de verdad.
    const mencionado = respuesta.producto_mencionado;
    if (mencionado && !existeEnCatalogo(mencionado)) {
      this.logger.warn(`La IA inventó un producto: "${mencionado}"`);
      return { mensaje: beneficio.plantilla, origen: 'plantilla' };
    }

    return { mensaje, origen: 'ia' };
  }
}
