// Validadores de formato de la capa 1 (D3 V-01: «validación de formato de los
// campos»). Repiten en el navegador las reglas que el dominio verifica de nuevo
// (PA-05): DIS-19, DIS-21 y DIS-22. Devuelven el mensaje o null.
export type Validador = (valor: string) => string | null;

export const obligatorio =
  (mensaje: string): Validador =>
  (valor) =>
    valor.trim() ? null : mensaje;

export const patron =
  (expresion: RegExp, mensaje: string): Validador =>
  (valor) =>
    !valor.trim() || expresion.test(valor.trim()) ? null : mensaje;

export const longitud =
  (minimo: number, maximo: number, mensaje: string): Validador =>
  (valor) =>
    !valor || ([...valor].length >= minimo && [...valor].length <= maximo) ? null : mensaje;

export function validar(valor: string, validadores: readonly Validador[]): string | null {
  for (const validador of validadores) {
    const mensaje = validador(valor);
    if (mensaje) return mensaje;
  }
  return null;
}
