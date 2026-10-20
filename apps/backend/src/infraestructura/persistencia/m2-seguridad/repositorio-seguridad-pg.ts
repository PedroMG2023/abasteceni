import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import type {
  Credencial,
  Habilitacion,
  PuertoRepositorioSeguridad,
  Rol,
  SesionRenovacion,
  SolicitudRecuperacion,
} from '../../../dominio/m2-seguridad';
import { ErrorConflicto, type Transaccion } from '../../../dominio/puertos';
import { conexion, errorPostgres, type BaseDatos } from '../base-datos';
import { credenciales, recuperaciones, sesiones } from './esquema';

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

  async registrarIntentoFallido(credencialId: string, tx: Transaccion): Promise<number> {
    const [fila] = await conexion(this.db, tx)
      .update(credenciales)
      .set({ intentosFallidos: sql`${credenciales.intentosFallidos} + 1` })
      .where(eq(credenciales.id, credencialId))
      .returning({ intentos: credenciales.intentosFallidos });
    return fila?.intentos ?? 0;
  }

  async bloquear(credencialId: string, hasta: Date, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).update(credenciales).set({ bloqueadaHasta: hasta, intentosFallidos: 0 }).where(eq(credenciales.id, credencialId));
  }

  async reiniciarIntentos(credencialId: string): Promise<void> {
    await this.db.update(credenciales).set({ intentosFallidos: 0 }).where(eq(credenciales.id, credencialId));
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

  async listarSesionesVigentes(credencialId: string, ahora: Date, tx: Transaccion): Promise<SesionRenovacion[]> {
    const db = conexion(this.db, tx);
    await db.select({ id: credenciales.id }).from(credenciales).where(eq(credenciales.id, credencialId)).for('update');
    return db
      .select()
      .from(sesiones)
      .where(and(eq(sesiones.credencialId, credencialId), isNull(sesiones.revocadaEn), gt(sesiones.expiraEn, ahora)))
      .orderBy(asc(sesiones.iniciadaEn));
  }

  async desplazarSesion(id: string, revocadaEn: Date, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).update(sesiones).set({ revocadaEn, desplazada: true }).where(eq(sesiones.id, id));
  }

  async revocarSesionesDe(credencialId: string, revocadaEn: Date, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx)
      .update(sesiones)
      .set({ revocadaEn })
      .where(and(eq(sesiones.credencialId, credencialId), isNull(sesiones.revocadaEn)));
  }

  async anularRecuperaciones(credencialId: string, anuladaEn: Date, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx)
      .update(recuperaciones)
      .set({ anuladaEn })
      .where(and(eq(recuperaciones.credencialId, credencialId), isNull(recuperaciones.usadaEn), isNull(recuperaciones.anuladaEn)));
  }

  async guardarRecuperacion(solicitud: SolicitudRecuperacion, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).insert(recuperaciones).values(solicitud);
  }

  // Bloquea la fila: dos usos simultáneos del mismo enlace no pueden prosperar ambos.
  async buscarRecuperacionPorHuella(huella: string, tx: Transaccion): Promise<SolicitudRecuperacion | null> {
    const [fila] = await conexion(this.db, tx)
      .select()
      .from(recuperaciones)
      .where(eq(recuperaciones.huella, huella))
      .limit(1)
      .for('update');
    return fila ?? null;
  }

  async marcarRecuperacionUsada(id: string, usadaEn: Date, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).update(recuperaciones).set({ usadaEn }).where(eq(recuperaciones.id, id));
  }

  async restablecerContrasena(credencialId: string, hashContrasena: string, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx)
      .update(credenciales)
      .set({ hashContrasena, intentosFallidos: 0, bloqueadaHasta: null })
      .where(eq(credenciales.id, credencialId));
  }
}
