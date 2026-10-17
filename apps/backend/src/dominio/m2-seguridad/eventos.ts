import type { EventoDominio } from '../puertos';

export const CUENTA_BLOQUEADA = 'CuentaBloqueada';

// Bloqueo temporal por intentos fallidos (SYS-FN-07): el trabajador avisa al
// correo registrado (DIS-34).
export type CuentaBloqueada = EventoDominio<typeof CUENTA_BLOQUEADA, { credencialId: string; correo: string; bloqueadaHasta: string }>;
