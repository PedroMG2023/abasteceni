import type { EventoDominio, PuertoDespachoEventos } from '../../dominio/puertos';

export interface ManejadorEvento {
  manejar(evento: EventoDominio): Promise<void>;
}

// Despachador de eventos del trabajador (AS-02, segunda pieza; AS-06). Resuelve
// los manejadores por tipo de evento, registrados en la raíz de composición: un
// evento nuevo agrega un manejador sin modificar este archivo. La entrega es
// «al menos una vez»: un fallo deja el evento pendiente en la bandeja.
export class DespachadorEventos implements PuertoDespachoEventos {
  private readonly manejadores = new Map<string, ManejadorEvento[]>();

  registrar(tipo: string, manejador: ManejadorEvento): this {
    this.manejadores.set(tipo, [...(this.manejadores.get(tipo) ?? []), manejador]);
    return this;
  }

  async despachar(evento: EventoDominio): Promise<void> {
    for (const manejador of this.manejadores.get(evento.tipo) ?? []) {
      await manejador.manejar(evento);
    }
  }
}
