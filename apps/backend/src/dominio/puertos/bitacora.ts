import type { Transaccion } from './unidad-trabajo';

// Asiento de la bitácora de auditoría (SYS-FN-35): identificador de usuario,
// acción, marca temporal e IP de origen, más el recurso afectado y el detalle.
export interface AsientoBitacora {
  readonly id: string;
  readonly usuarioId: string | null;
  readonly accion: string;
  readonly recurso: { readonly tipo: string; readonly id: string };
  readonly detalle: Readonly<Record<string, unknown>>;
  readonly ip: string;
  readonly registradoEn: Date;
}

// Puerto de bitácora que consumen M1 y M2 (AS-12): declara únicamente
// registrar. No ofrece lectura, modificación ni borrado (PA-06, ADR-05); la
// lectura administrativa de IT-09 será otra interfaz.
export interface PuertoBitacora {
  registrar(asiento: AsientoBitacora, tx: Transaccion): Promise<void>;
}
