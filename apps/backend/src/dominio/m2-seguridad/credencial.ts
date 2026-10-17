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
