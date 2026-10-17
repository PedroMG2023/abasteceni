import type { ClienteApi, Salud } from '../../src/puertos/cliente-api';

// Implementación de prueba del puerto ClienteApi (AS-11): intercambiable con la
// HTTP sin cambios en hooks ni componentes.
export class ClienteApiPrueba implements ClienteApi {
  salud: Salud | Error = { estado: 'operativo' };
  llamadas: string[] = [];

  async consultarSalud(): Promise<Salud> {
    this.llamadas.push('consultarSalud');
    if (this.salud instanceof Error) throw this.salud;
    return this.salud;
  }
}
