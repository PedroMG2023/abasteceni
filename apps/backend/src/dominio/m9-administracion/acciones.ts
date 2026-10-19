// Acciones que M1 y M2 registran en la bitácora en IT-02 (SYS-FN-35, 36 y 05).
export const ACCIONES_BITACORA = {
  cuentaRegistrada: 'CUENTA_REGISTRADA',
  consentimientoAceptado: 'CONSENTIMIENTO_ACEPTADO',
  registroLegalCargado: 'REGISTRO_LEGAL_CARGADO',
  cuentaAprobada: 'CUENTA_APROBADA',
  cuentaRechazada: 'CUENTA_RECHAZADA',
  // SYS-FN-05 (DIS-36).
  contrasenaRestablecida: 'CONTRASENA_RESTABLECIDA',
} as const;
export type AccionBitacora = (typeof ACCIONES_BITACORA)[keyof typeof ACCIONES_BITACORA];
