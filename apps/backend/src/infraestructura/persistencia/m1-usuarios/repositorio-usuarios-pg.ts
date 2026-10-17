import { asc, eq } from 'drizzle-orm';
import {
  CuentaComercial,
  Ruc,
  Ubicacion,
  type EstadoCuenta,
  type PuertoRepositorioUsuarios,
  type TipoCuenta,
  type TipoRegistroLegal,
} from '../../../dominio/m1-usuarios';
import { ErrorConflicto, type Transaccion } from '../../../dominio/puertos';
import { conexion, errorPostgres, type BaseDatos } from '../base-datos';
import { cuentasComerciales } from './esquema';

type Fila = typeof cuentasComerciales.$inferSelect;

// El repositorio reconstruye la entidad directamente desde la fila (R-04).
function aEntidad(fila: Fila): CuentaComercial {
  return CuentaComercial.reconstruir({
    id: fila.id,
    tipo: fila.tipo as TipoCuenta,
    razonSocial: fila.razonSocial,
    ruc: Ruc.crear(fila.ruc),
    ubicacion: new Ubicacion(fila.departamento, fila.municipio),
    rubro: fila.rubro,
    telefonoMovil: fila.telefonoMovil,
    correo: fila.correo,
    estado: fila.estado as EstadoCuenta,
    registradaEn: fila.registradaEn,
    consentimientoAceptadoEn: fila.consentimientoAceptadoEn,
    registroLegal: { clave: fila.registroLegalClave, tipo: fila.registroLegalTipo as TipoRegistroLegal },
  });
}

export class RepositorioUsuariosPg implements PuertoRepositorioUsuarios {
  constructor(private readonly db: BaseDatos) {}

  async existeRuc(ruc: string, tx: Transaccion): Promise<boolean> {
    const filas = await conexion(this.db, tx)
      .select({ id: cuentasComerciales.id })
      .from(cuentasComerciales)
      .where(eq(cuentasComerciales.ruc, ruc))
      .limit(1);
    return filas.length > 0;
  }

  async guardar(cuenta: CuentaComercial, tx: Transaccion): Promise<void> {
    const fila = {
      id: cuenta.id,
      tipo: cuenta.tipo,
      razonSocial: cuenta.razonSocial,
      ruc: cuenta.ruc.numero,
      departamento: cuenta.ubicacion.departamento,
      municipio: cuenta.ubicacion.municipio,
      rubro: cuenta.rubro,
      telefonoMovil: cuenta.telefonoMovil,
      correo: cuenta.correo,
      estado: cuenta.estado,
      registradaEn: cuenta.registradaEn,
      consentimientoAceptadoEn: cuenta.consentimientoAceptadoEn,
      registroLegalClave: cuenta.registroLegal.clave,
      registroLegalTipo: cuenta.registroLegal.tipo,
    };
    try {
      await conexion(this.db, tx)
        .insert(cuentasComerciales)
        .values(fila)
        .onConflictDoUpdate({ target: cuentasComerciales.id, set: { estado: fila.estado } });
    } catch (error) {
      // Dos registros simultáneos con el mismo RUC: la restricción de unicidad decide.
      if (errorPostgres(error).restriccion === 'cuentas_comerciales_ruc_unico') throw new ErrorConflicto('RUC_REGISTRADO');
      throw error;
    }
  }

  async buscarPorId(id: string, tx?: Transaccion): Promise<CuentaComercial | null> {
    const consulta = conexion(this.db, tx).select().from(cuentasComerciales).where(eq(cuentasComerciales.id, id)).limit(1);
    const [fila] = tx ? await consulta.for('update') : await consulta;
    return fila ? aEntidad(fila) : null;
  }

  async listar(filtro: { estado?: EstadoCuenta }): Promise<CuentaComercial[]> {
    const consulta = this.db.select().from(cuentasComerciales);
    const filas = await (filtro.estado ? consulta.where(eq(cuentasComerciales.estado, filtro.estado)) : consulta).orderBy(
      asc(cuentasComerciales.registradaEn),
    );
    return filas.map(aEntidad);
  }
}
