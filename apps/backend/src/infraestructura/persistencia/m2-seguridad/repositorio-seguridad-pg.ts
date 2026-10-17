import { eq } from 'drizzle-orm';
import type {
  Credencial,
  Habilitacion,
  PuertoRepositorioSeguridad,
  Rol,
  SesionRenovacion,
} from '../../../dominio/m2-seguridad';
import { ErrorConflicto, type Transaccion } from '../../../dominio/puertos';
import { conexion, errorPostgres, type BaseDatos } from '../base-datos';
import { credenciales, sesiones } from './esquema';

type FilaCredencial = typeof credenciales.$inferSelect;

function aCredencial(fila: FilaCredencial): Credencial {
  return { ...fila, rol: fila.rol as Rol, habilitacion: fila.habilitacion as Habilitacion };
}

export class RepositorioSeguridadPg implements PuertoRepositorioSeguridad {
  constructor(private readonly db: BaseDatos) {}

  async existeCorreo(correo: string, tx: Transaccion): Promise<boolean> {
    const filas = await conexion(this.db, tx)
      .select({ id: credenciales.id })
      .from(credenciales)
      .where(eq(credenciales.correo, correo))
      .limit(1);
    return filas.length > 0;
  }

  async guardarCredencial(credencial: Credencial, tx: Transaccion): Promise<void> {
    try {
      await conexion(this.db, tx).insert(credenciales).values(credencial);
    } catch (error) {
      if (errorPostgres(error).restriccion === 'credenciales_correo_unico') throw new ErrorConflicto('CORREO_REGISTRADO');
      throw error;
    }
  }

  async buscarCredencialPorCorreo(correo: string): Promise<Credencial | null> {
    const [fila] = await this.db.select().from(credenciales).where(eq(credenciales.correo, correo)).limit(1);
    return fila ? aCredencial(fila) : null;
  }

  async buscarCredencialPorId(id: string, tx?: Transaccion): Promise<Credencial | null> {
    const [fila] = await conexion(this.db, tx).select().from(credenciales).where(eq(credenciales.id, id)).limit(1);
    return fila ? aCredencial(fila) : null;
  }

  async cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).update(credenciales).set({ habilitacion }).where(eq(credenciales.cuentaId, cuentaId));
  }

  async guardarSesion(sesion: SesionRenovacion, tx?: Transaccion): Promise<void> {
    await conexion(this.db, tx).insert(sesiones).values(sesion);
  }

  async buscarSesionPorHuella(huella: string, tx?: Transaccion): Promise<SesionRenovacion | null> {
    const [fila] = await conexion(this.db, tx)
      .select()
      .from(sesiones)
      .where(eq(sesiones.huella, huella))
      .limit(1)
      .for('update');
    return fila ?? null;
  }

  async revocarSesion(id: string, revocadaEn: Date, tx?: Transaccion): Promise<void> {
    await conexion(this.db, tx).update(sesiones).set({ revocadaEn }).where(eq(sesiones.id, id));
  }
}
