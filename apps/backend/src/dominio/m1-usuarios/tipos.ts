// Tipos de cuenta comercial (MD-01: especializaciones de CuentaComercial; DIS-17).
export const TIPOS_CUENTA = ['Comprador', 'Proveedor', 'Productor'] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

// Estados de la cuenta (D2 SYS-FN-01 y CT-ADM-03; DIS-23).
export const EstadoCuenta = {
  PendienteDeValidacion: 'Pendiente de validación',
  Activa: 'Activa',
  Rechazada: 'Rechazada',
} as const;
export type EstadoCuenta = (typeof EstadoCuenta)[keyof typeof EstadoCuenta];
export const ESTADOS_CUENTA: readonly EstadoCuenta[] = Object.values(EstadoCuenta);
