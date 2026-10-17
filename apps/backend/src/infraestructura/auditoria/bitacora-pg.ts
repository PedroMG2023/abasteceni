import type { AsientoBitacora, PuertoBitacora, Transaccion } from '../../dominio/puertos';
import { conexion, type BaseDatos } from '../persistencia/base-datos';
import { bitacora } from '../persistencia/m9-administracion/esquema';

// Bitácora en el esquema de M9 (ADR-05). Solo inserta: el rol de la aplicación
// no tiene permiso para otra cosa.
export class BitacoraPg implements PuertoBitacora {
  constructor(private readonly db: BaseDatos) {}

  async registrar(asiento: AsientoBitacora, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).insert(bitacora).values({
      id: asiento.id,
      usuarioId: asiento.usuarioId,
      accion: asiento.accion,
      recursoTipo: asiento.recurso.tipo,
      recursoId: asiento.recurso.id,
      detalle: asiento.detalle,
      ip: asiento.ip,
      registradoEn: asiento.registradoEn,
    });
  }
}
