import type { EventoDominio, PuertoPublicacionEventos } from '../../dominio/puertos';

export interface ResultadoEntrega {
  publicados: number;
  fallidos: number;
}

// Contrato común de las dos implementaciones de la bandeja (AS-10): persistir
// dentro de la transacción recibida y entregar en orden de publicación.
export interface BandejaSalida extends PuertoPublicacionEventos {
  // Entrega los eventos pendientes cuyo reintento ya venció. Un fallo deja el
  // evento pendiente y programa su siguiente intento.
  entregarPendientes(
    entregar: (evento: EventoDominio) => Promise<void>,
    opciones: { limite: number; ahora: Date },
  ): Promise<ResultadoEntrega>;
}

// Espera exponencial entre reintentos, acotada a un minuto: mientras el circuito
// está abierto las notificaciones se acumulan y se entregan con retraso (ADR-02),
// dentro del umbral de 60 s de R-02.
export function esperaReintentoMs(intentos: number): number {
  return Math.min(1000 * 2 ** Math.max(intentos - 1, 0), 60_000);
}

// Causa del fallo sin datos personales (V-03): solo el tipo de error.
export function causaFallo(error: unknown): string {
  return error instanceof Error ? error.name : 'Error';
}
