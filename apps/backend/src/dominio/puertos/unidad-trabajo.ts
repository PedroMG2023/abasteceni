declare const marcaTransaccion: unique symbol;

// Transacción opaca: el dominio la recibe y la entrega a los puertos sin
// conocer su implementación (PA-01). Hace posible que el cambio de estado y su
// evento se confirmen o se reviertan juntos (ADR-01).
export interface Transaccion {
  readonly [marcaTransaccion]: true;
}

export interface PuertoUnidadTrabajo {
  ejecutar<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T>;
}
