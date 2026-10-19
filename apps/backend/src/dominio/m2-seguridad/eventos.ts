import type { EventoDominio } from '../puertos';

export const CUENTA_BLOQUEADA = 'CuentaBloqueada';

// Bloqueo temporal por intentos fallidos (SYS-FN-07): el trabajador avisa al
// correo registrado (DIS-34).
export type CuentaBloqueada = EventoDominio<typeof CUENTA_BLOQUEADA, { credencialId: string; correo: string; bloqueadaHasta: string }>;

export const RECUPERACION_SOLICITADA = 'RecuperacionSolicitada';

// Recuperación de la contraseña (SYS-FN-05; DIS-36): el trabajador envía el
// enlace al correo registrado. El secreto viaja en la bandeja de salida porque
// solo el trabajador arma el enlace; es de un solo uso y vence en 15 minutos.
export type RecuperacionSolicitada = EventoDominio<
  typeof RECUPERACION_SOLICITADA,
  { credencialId: string; correo: string; secreto: string; expiraEn: string }
>;
