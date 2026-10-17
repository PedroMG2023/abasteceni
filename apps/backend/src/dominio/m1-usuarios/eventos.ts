import type { EventoDominio } from '../puertos';
import type { TipoCuenta } from './tipos';

export const CUENTA_REGISTRADA = 'CuentaRegistrada';
export const CUENTA_APROBADA = 'CuentaAprobada';
export const CUENTA_RECHAZADA = 'CuentaRechazada';

type Contacto = {
  cuentaId: string;
  telefonoMovil: string;
  correo: string;
};

// Evento publicado al registrarse una cuenta (IT-01; ADR-01). Lleva solo los
// datos de contacto que el trabajador necesita para notificar (DIS-20).
export type CuentaRegistrada = EventoDominio<typeof CUENTA_REGISTRADA, Contacto & { tipo: TipoCuenta }>;

// Eventos de la decisión del Administrador (SYS-FN-03; D1 PM-01: «rechazo
// motivado y notificado»).
export type CuentaAprobada = EventoDominio<typeof CUENTA_APROBADA, Contacto>;
export type CuentaRechazada = EventoDominio<typeof CUENTA_RECHAZADA, Contacto & { justificacion: string }>;
