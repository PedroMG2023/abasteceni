import type { AsientoBitacora, PuertoBitacora, Transaccion } from '../../dominio/puertos';
import { comoTransaccionMemoria } from '../persistencia/unidad-trabajo-memoria';

// Bitácora en memoria (AS-08): mismo contrato que la de PostgreSQL. Expone los
// asientos como lista de solo lectura para las pruebas.
export class BitacoraMemoria implements PuertoBitacora {
  private readonly registrados: AsientoBitacora[] = [];

  get asientos(): readonly AsientoBitacora[] {
    return this.registrados.map((a) => Object.freeze({ ...a }));
  }

  async registrar(asiento: AsientoBitacora, tx: Transaccion): Promise<void> {
    comoTransaccionMemoria(tx).alConfirmar(() => this.registrados.push(Object.freeze({ ...asiento })));
  }
}
