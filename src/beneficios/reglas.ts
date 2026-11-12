import type { EstadoNivel } from '../perfil/niveles';

export interface ContextoCliente extends EstadoNivel {
  nombre: string;
  totalVisitas: number;
  productoFavorito: string | null;
}

export interface Beneficio {
  codigo: string;
  titulo: string;
  producto: string | null;
  /** Por qué le tocó este beneficio. Va en la respuesta: nada de magia. */
  motivo: string;
  /** Texto que se usa si la IA no está disponible o responde mal. */
  plantilla: string;
}

/**
 * LAS REGLAS DECIDEN QUÉ; LA IA DECIDE CÓMO SE DICE.
 *
 * Esta función es determinista: con los mismos datos devuelve siempre el
 * mismo beneficio. El modelo de lenguaje no elige nunca qué se regala —
 * solo redacta el mensaje. Así el negocio no depende de lo que se le
 * ocurra a un modelo, y el costo de equivocarse es un texto feo, no un
 * café regalado por error.
 */
export function decidirBeneficio(ctx: ContextoCliente): Beneficio {
  const favorito = ctx.productoFavorito;

  if (ctx.totalVisitas === 0) {
    return {
      codigo: 'BIENVENIDA',
      titulo: 'Tu primera taza, con 20% de descuento',
      producto: favorito,
      motivo: 'Aún no registras visitas',
      plantilla:
        'Todavía no nos conocemos en persona. Tu primera taza tiene 20% de descuento, te esperamos.',
    };
  }

  if (ctx.nivel === 'Raíz') {
    return {
      codigo: 'RAIZ_INVITACION',
      titulo: favorito ? `Tu ${favorito} va por la casa` : 'Tu pedido va por la casa',
      producto: favorito,
      motivo: 'Llegó al nivel Raíz',
      plantilla: favorito
        ? `Eres parte de la casa. Tu ${favorito} de hoy lo invitamos nosotros.`
        : 'Eres parte de la casa. Tu pedido de hoy lo invitamos nosotros.',
    };
  }

  if (ctx.nivel === 'Habitué') {
    return {
      codigo: 'HABITUE_ACOMPANAMIENTO',
      titulo: 'Un acompañamiento sin costo',
      producto: favorito,
      motivo: 'Está en nivel Habitué',
      plantilla: favorito
        ? `Ya sabemos que vienes por tu ${favorito}. Hoy lo acompañamos con algo dulce, sin costo.`
        : 'Hoy acompañamos tu pedido con algo dulce, sin costo.',
    };
  }

  if (ctx.visitasParaSiguiente === 1 && ctx.siguienteNivel) {
    return {
      codigo: 'UNA_MAS',
      titulo: `Una visita para ser ${ctx.siguienteNivel}`,
      producto: favorito,
      motivo: 'Le falta una sola visita para subir de nivel',
      plantilla: `Te falta una visita para ser ${ctx.siguienteNivel}. La próxima te guardamos la mesa de la ventana.`,
    };
  }

  return {
    codigo: 'SEGUNDA_TAZA',
    titulo: 'Segunda taza a mitad de precio',
    producto: favorito,
    motivo: 'Beneficio base para clientes en formación',
    plantilla: favorito
      ? `Cada vez que vuelves por tu ${favorito} nos alegra el día. La segunda taza va a mitad de precio.`
      : 'Nos alegra verte de vuelta. Tu segunda taza va a mitad de precio.',
  };
}
