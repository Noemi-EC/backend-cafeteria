/**
 * El catálogo real de la cafetería, del lado del servidor.
 *
 * Existe por una razón de seguridad, no de comodidad: es contra esta lista
 * que se valida lo que escribe el modelo de lenguaje. Si la IA inventa un
 * producto que no se vende, la respuesta se descarta y se usa la plantilla.
 */
export const CATALOGO = [
  'Flat White',
  'Americano',
  'Cappuccino',
  'Latte',
  'Espresso',
  'Mocha',
  'Cold Brew',
] as const;

export type Producto = (typeof CATALOGO)[number];

export function existeEnCatalogo(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  const limpio = nombre.trim().toLowerCase();
  return CATALOGO.some((p) => p.toLowerCase() === limpio);
}
