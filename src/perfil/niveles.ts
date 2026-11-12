/**
 * Los niveles de membresía de Raíz Contigo.
 *
 * Por ahora viven en código y no en base de datos: con un solo local no hay
 * nada que configurar por establecimiento. Cuando exista la plataforma web
 * de administración, esto pasa a la tabla `niveles` con su local_id.
 */
export const NIVELES = [
  { nombre: 'Visitante', desde: 0 },
  { nombre: 'Conocido', desde: 2 },
  { nombre: 'Habitué', desde: 5 },
  { nombre: 'Raíz', desde: 12 },
] as const;

export interface EstadoNivel {
  nivel: string;
  siguienteNivel: string | null;
  visitasParaSiguiente: number;
  progreso: number; // 0 a 1, para la barra de progreso
}

export function calcularNivel(totalVisitas: number): EstadoNivel {
  let indice = 0;
  for (let i = 0; i < NIVELES.length; i++) {
    if (totalVisitas >= NIVELES[i].desde) indice = i;
  }

  const actual = NIVELES[indice];
  const siguiente = NIVELES[indice + 1] ?? null;

  const visitasParaSiguiente = siguiente ? siguiente.desde - totalVisitas : 0;

  const progreso = siguiente
    ? (totalVisitas - actual.desde) / (siguiente.desde - actual.desde)
    : 1;

  return {
    nivel: actual.nombre,
    siguienteNivel: siguiente?.nombre ?? null,
    visitasParaSiguiente,
    progreso: Math.min(Math.max(progreso, 0), 1),
  };
}
