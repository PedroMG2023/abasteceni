import type { Rol } from './rol';

// Estado de habilitación de la credencial (DIS-25): solo las cuentas «Activa»
// y el Administrador de la plataforma inician sesión.
export type Habilitacion = 'habilitada' | 'pendiente' | 'rechazada';

export interface Credencial {
  readonly id: string;
  readonly cuentaId: string | null;
  readonly correo: string;
  readonly hashContrasena: string;
  readonly rol: Rol;
  readonly habilitacion: Habilitacion;
  readonly creadaEn: Date;
  // SYS-FN-07: intentos fallidos consecutivos y fin del bloqueo temporal.
  readonly intentosFallidos: number;
  readonly bloqueadaHasta: Date | null;
}

export function credencialBloqueada(credencial: Credencial, ahora: Date): boolean {
  return credencial.bloqueadaHasta !== null && credencial.bloqueadaHasta.getTime() > ahora.getTime();
}

// Sesión de renovación: solo se guarda la huella de la credencial (ADR-04).
export interface SesionRenovacion {
  readonly id: string;
  readonly credencialId: string;
  readonly huella: string;
  readonly creadaEn: Date;
  readonly expiraEn: Date;
  readonly revocadaEn: Date | null;
}

export function sesionVigente(sesion: SesionRenovacion, ahora: Date): boolean {
  return sesion.revocadaEn === null && sesion.expiraEn.getTime() > ahora.getTime();
}

// Solicitud de recuperación de la contraseña (SYS-FN-05; DIS-36): enlace de un
// solo uso del que solo se guarda la huella. Una solicitud nueva anula la anterior.
export interface SolicitudRecuperacion {
  readonly id: string;
  readonly credencialId: string;
  readonly huella: string;
  readonly creadaEn: Date;
  readonly expiraEn: Date;
  readonly usadaEn: Date | null;
  readonly anuladaEn: Date | null;
}

export function recuperacionVigente(solicitud: SolicitudRecuperacion, ahora: Date): boolean {
  return solicitud.usadaEn === null && solicitud.anuladaEn === null && solicitud.expiraEn.getTime() > ahora.getTime();
}
