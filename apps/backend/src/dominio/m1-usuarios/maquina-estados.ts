import { EstadoCuenta } from './tipos';

// Decisión del Administrador de la plataforma sobre una solicitud (SYS-FN-03).
export const DECISIONES = ['aprobar', 'rechazar'] as const;
export type Decision = (typeof DECISIONES)[number];

// Máquina de estados de la cuenta comercial (AS-01; D3 §2.9.2, nota sobre
// SYS-FN-03): la transición de aprobación o rechazo pertenece a M1. Cualquier
// transición que no figure aquí se rechaza.
const TRANSICIONES: Readonly<Record<EstadoCuenta, Partial<Record<Decision, EstadoCuenta>>>> = {
  [EstadoCuenta.PendienteDeValidacion]: { aprobar: EstadoCuenta.Activa, rechazar: EstadoCuenta.Rechazada },
  [EstadoCuenta.Activa]: {},
  [EstadoCuenta.Rechazada]: {},
};

export function siguienteEstado(actual: EstadoCuenta, decision: Decision): EstadoCuenta | null {
  return TRANSICIONES[actual][decision] ?? null;
}
