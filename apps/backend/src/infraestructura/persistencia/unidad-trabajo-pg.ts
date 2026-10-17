import type { PuertoUnidadTrabajo, Transaccion } from '../../dominio/puertos';
import type { BaseDatos } from './base-datos';

// Unidad de trabajo sobre una transacción de PostgreSQL (ADR-01).
export class UnidadTrabajoPg implements PuertoUnidadTrabajo {
  constructor(private readonly db: BaseDatos) {}

  ejecutar<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => trabajo(tx as unknown as Transaccion));
  }
}
