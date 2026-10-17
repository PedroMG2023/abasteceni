import CircuitBreaker from 'opossum';
import { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from '../../dominio/puertos';

// Parámetros técnicos del interruptor (ADR-02). Se registran en
// docs/evidencia/iteraciones.md; no son reglas de negocio.
export interface OpcionesInterruptor {
  tiempoMaximoMs: number;
  umbralErroresPorcentaje: number;
  volumenMinimo: number;
  reaperturaMs: number;
  ventanaMs: number;
}

export const OPCIONES_INTERRUPTOR: OpcionesInterruptor = {
  tiempoMaximoMs: 10_000,
  umbralErroresPorcentaje: 50,
  volumenMinimo: 3,
  reaperturaMs: 30_000,
  ventanaMs: 60_000,
};

export type EstadoCircuito = 'cerrado' | 'abierto' | 'semiabierto';

// Error del circuito abierto: la entrega se suspende sin llamar al proveedor.
export class ErrorCircuitoAbierto extends ErrorEntregaNotificacion {
  constructor(canal: string) {
    super(canal, `Circuito abierto en el canal ${canal}: entrega suspendida temporalmente.`);
    this.name = 'ErrorCircuitoAbierto';
  }
}

// Interruptor de circuito que envuelve un adaptador de notificación (ADR-02).
// Vive solo en el trabajador; la API nunca lo instancia (MD-03).
export class NotificadorConInterruptor implements PuertoNotificacion {
  private readonly circuito: CircuitBreaker<[Notificacion], void>;

  constructor(
    interno: PuertoNotificacion,
    private readonly canal: string,
    opciones: OpcionesInterruptor = OPCIONES_INTERRUPTOR,
    alCambiarEstado: (estado: EstadoCircuito) => void = () => undefined,
  ) {
    this.circuito = new CircuitBreaker((notificacion: Notificacion) => interno.notificar(notificacion), {
      timeout: opciones.tiempoMaximoMs,
      errorThresholdPercentage: opciones.umbralErroresPorcentaje,
      volumeThreshold: opciones.volumenMinimo,
      resetTimeout: opciones.reaperturaMs,
      rollingCountTimeout: opciones.ventanaMs,
    });
    this.circuito.on('open', () => alCambiarEstado('abierto'));
    this.circuito.on('halfOpen', () => alCambiarEstado('semiabierto'));
    this.circuito.on('close', () => alCambiarEstado('cerrado'));
  }

  get estado(): EstadoCircuito {
    if (this.circuito.opened) return 'abierto';
    return this.circuito.halfOpen ? 'semiabierto' : 'cerrado';
  }

  async notificar(notificacion: Notificacion): Promise<void> {
    try {
      await this.circuito.fire(notificacion);
    } catch (error) {
      const codigo = (error as { code?: string }).code;
      if (codigo === 'EOPENBREAKER') throw new ErrorCircuitoAbierto(this.canal);
      if (error instanceof ErrorEntregaNotificacion) throw error;
      throw new ErrorEntregaNotificacion(this.canal, 'La entrega de la notificación falló.', { cause: error });
    }
  }

  // Libera los temporizadores de las estadísticas del circuito.
  apagar(): void {
    this.circuito.shutdown();
  }
}
