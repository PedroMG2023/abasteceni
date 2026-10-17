import type { Transaccion } from './unidad-trabajo';

// Evento de dominio (PA-03). Se publica en la bandeja de salida dentro de la
// transacción del cambio de estado (ADR-01) y lo entrega el trabajador.
export interface EventoDominio<TTipo extends string = string, TDatos = Record<string, unknown>> {
  readonly id: string;
  readonly tipo: TTipo;
  readonly ocurridoEn: Date;
  readonly datos: TDatos;
}

// MD-03, PuertoPublicacionEventos (≡ BandejaSalida de AS-13, DIS-12).
export interface PuertoPublicacionEventos {
  publicar(evento: EventoDominio, tx: Transaccion): Promise<void>;
}

// Entrada del despachador de eventos del trabajador. El sondeo de la bandeja
// (capa 4) entrega cada evento por este puerto a la capa 2 (AS-02).
export interface PuertoDespachoEventos {
  despachar(evento: EventoDominio): Promise<void>;
}
