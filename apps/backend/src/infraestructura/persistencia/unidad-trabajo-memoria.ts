import type { PuertoUnidadTrabajo, Transaccion } from '../../dominio/puertos';

// Transacción en memoria: las escrituras se aplican solo al confirmar.
export class TransaccionMemoria {
  private readonly acciones: (() => void)[] = [];

  alConfirmar(accion: () => void): void {
    this.acciones.push(accion);
  }

  confirmar(): void {
    for (const accion of this.acciones) accion();
  }
}

export function comoTransaccionMemoria(tx: Transaccion): TransaccionMemoria {
  if (!(tx instanceof TransaccionMemoria)) throw new TypeError('Se esperaba una transacción en memoria.');
  return tx;
}

// Doble de la unidad de trabajo con la misma semántica de confirmación y reversión.
export class UnidadTrabajoMemoria implements PuertoUnidadTrabajo {
  async ejecutar<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    const tx = new TransaccionMemoria();
    const resultado = await trabajo(tx as unknown as Transaccion);
    tx.confirmar();
    return resultado;
  }
}
