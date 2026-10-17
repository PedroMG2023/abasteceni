import type { components } from '@abasteceni/contrato';

// Puerto de la capa 1 hacia la API REST (PA-07, ADR-06, AS-18). Hooks y
// componentes dependen de esta interfaz y nunca del cliente HTTP concreto.
export type Salud = components['schemas']['Salud'];
export type ErrorRespuesta = components['schemas']['Error'];

export interface ClienteApi {
  consultarSalud(): Promise<Salud>;
}

// Error de la API con la forma uniforme del contrato.
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly cuerpo: ErrorRespuesta,
  ) {
    super(cuerpo.mensaje);
    this.name = 'ErrorApi';
  }
}
