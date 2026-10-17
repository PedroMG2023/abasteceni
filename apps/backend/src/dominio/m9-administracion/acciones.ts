// Acciones que M1 y M2 registran en la bitácora en IT-02 (SYS-FN-35 y 36).
export const ACCIONES_BITACORA = {
  cuentaRegistrada: 'CUENTA_REGISTRADA',
  consentimientoAceptado: 'CONSENTIMIENTO_ACEPTADO',
  registroLegalCargado: 'REGISTRO_LEGAL_CARGADO',
  cuentaAprobada: 'CUENTA_APROBADA',
  cuentaRechazada: 'CUENTA_RECHAZADA',
} as const;
export type AccionBitacora = (typeof ACCIONES_BITACORA)[keyof typeof ACCIONES_BITACORA];
