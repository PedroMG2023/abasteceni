import type { DetalleValidacion } from '../puertos';

// Vida de las credenciales (ADR-04; DIS-06, aprobada por el equipo).
export const VIDA_ACCESO_SEGUNDOS = 15 * 60;
export const VIDA_RENOVACION_SEGUNDOS = 7 * 24 * 60 * 60;

// Bloqueo por intentos fallidos consecutivos (SYS-FN-07; DIS-34).
export const MAXIMO_INTENTOS_FALLIDOS = 5;
export const BLOQUEO_SEGUNDOS = 15 * 60;

// Validez del enlace de recuperación (SYS-FN-05: «máxima de 15 minutos»).
export const VIDA_RECUPERACION_SEGUNDOS = 15 * 60;

// Longitud de la contraseña (DIS-22; OWASP ASVS 4.0.3 V2.1.1 y V2.1.2).
export const CONTRASENA_MINIMA = 12;
export const CONTRASENA_MAXIMA = 128;

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CORREO_MAXIMO = 254;

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

// El correo y la contraseña se validan por separado en la recuperación (DIS-36).
export function validarCorreo(correo: string | undefined): DetalleValidacion[] {
  const normalizado = normalizarCorreo(correo ?? '');
  if (!normalizado) return [{ campo: 'correo', motivo: 'obligatorio' }];
  if (normalizado.length > CORREO_MAXIMO || !PATRON_CORREO.test(normalizado)) return [{ campo: 'correo', motivo: 'formato' }];
  return [];
}

export function validarContrasena(contrasena: string | undefined): DetalleValidacion[] {
  const valor = contrasena ?? '';
  if (!valor) return [{ campo: 'contrasena', motivo: 'obligatorio' }];
  const longitud = [...valor].length;
  if (longitud < CONTRASENA_MINIMA || longitud > CONTRASENA_MAXIMA) return [{ campo: 'contrasena', motivo: 'longitud' }];
  return [];
}

export function validarDatosCredencial(datos: { correo?: string; contrasena?: string }): DetalleValidacion[] {
  return [...validarCorreo(datos.correo), ...validarContrasena(datos.contrasena)];
}
