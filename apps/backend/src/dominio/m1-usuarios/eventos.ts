import type { EventoDominio } from '../puertos';
import type { TipoCuenta } from './tipos';

export const CUENTA_REGISTRADA = 'CuentaRegistrada';

// Evento publicado al registrarse una cuenta (IT-01; ADR-01). Lleva solo los
// datos de contacto que el trabajador necesita para notificar (DIS-20).
export type CuentaRegistrada = EventoDominio<
  typeof CUENTA_REGISTRADA,
  { cuentaId: string; tipo: TipoCuenta; telefonoMovil: string; correo: string }
>;
