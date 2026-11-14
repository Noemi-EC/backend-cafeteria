/**
 * Las únicas claves que se pueden guardar.
 *
 * Es una lista blanca a propósito: sin ella, el endpoint de configuración
 * sería un almacén libre donde cualquiera con rol ADMIN podría escribir
 * cualquier cosa, y nadie sabría qué significa cada fila.
 */
export interface DefinicionClave {
  clave: string;
  descripcion: string;
  /** Si es secreta, nunca se devuelve completa: solo los últimos caracteres. */
  secreta: boolean;
}

export const CLAVES: DefinicionClave[] = [
  {
    clave: 'OPENROUTER_API_KEY',
    descripcion: 'Clave de OpenRouter para redactar los beneficios',
    secreta: true,
  },
  {
    clave: 'OPENROUTER_MODEL',
    descripcion: 'Modelo a usar, por ejemplo cohere/north-mini-code:free',
    secreta: false,
  },
  {
    clave: 'IA_ACTIVA',
    descripcion: 'true o false. En false se usan los textos de plantilla',
    secreta: false,
  },
  {
    clave: 'VISITA_MINUTOS_ESPERA',
    descripcion: 'Minutos entre dos visitas del mismo cliente. 0 lo desactiva',
    secreta: false,
  },
  {
    clave: 'SMTP_USER',
    descripcion: 'Cuenta de correo desde la que se envían los códigos',
    secreta: false,
  },
  {
    clave: 'SMTP_PASS',
    descripcion: 'Contraseña de aplicación del correo',
    secreta: true,
  },
];

export const CLAVES_VALIDAS = CLAVES.map((c) => c.clave);

export function esClaveValida(clave: string): boolean {
  return CLAVES_VALIDAS.includes(clave);
}

/** "sk-or-v1-abc…" -> "••••••••cdef". Suficiente para reconocerla, inútil para usarla. */
export function enmascarar(valor: string): string {
  if (valor.length <= 4) return '••••';
  return `••••••••${valor.slice(-4)}`;
}
