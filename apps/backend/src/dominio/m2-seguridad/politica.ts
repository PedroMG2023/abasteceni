import type { DetalleValidacion } from '../puertos';

// Vida de las credenciales (ADR-04; DIS-06, aprobada por el equipo).
export const VIDA_ACCESO_SEGUNDOS = 15 * 60;
export const VIDA_RENOVACION_SEGUNDOS = 7 * 24 * 60 * 60;

// Longitud de la contraseña (DIS-22; OWASP ASVS 4.0.3 V2.1.1 y V2.1.2).
export const CONTRASENA_MINIMA = 12;
export const CONTRASENA_MAXIMA = 128;

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CORREO_MAXIMO = 254;

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

export function validarDatosCredencial(datos: { correo?: string; contrasena?: string }): DetalleValidacion[] {
  const detalles: DetalleValidacion[] = [];
  const correo = normalizarCorreo(datos.correo ?? '');
  if (!correo) detalles.push({ campo: 'correo', motivo: 'obligatorio' });
  else if (correo.length > CORREO_MAXIMO || !PATRON_CORREO.test(correo)) detalles.push({ campo: 'correo', motivo: 'formato' });

  const contrasena = datos.contrasena ?? '';
  if (!contrasena) detalles.push({ campo: 'contrasena', motivo: 'obligatorio' });
  else if ([...contrasena].length < CONTRASENA_MINIMA || [...contrasena].length > CONTRASENA_MAXIMA) {
    detalles.push({ campo: 'contrasena', motivo: 'longitud' });
  }
  return detalles;
}
