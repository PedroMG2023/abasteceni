import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Transaccion } from '../../dominio/puertos';

export type BaseDatos = NodePgDatabase;

// Conexión de la aplicación: siempre con el rol abasteceni_app (ADR-05).
export function crearBaseDatos(url: string, maximoConexiones = 10): { db: BaseDatos; pool: Pool } {
  const pool = new Pool({ connectionString: url, max: maximoConexiones });
  return { db: drizzle(pool), pool };
}

// Usa la transacción recibida si la hay; si no, la conexión general.
export function conexion(db: BaseDatos, tx?: Transaccion): BaseDatos {
  return tx ? (tx as unknown as BaseDatos) : db;
}

// Código SQLSTATE y restricción de un error del controlador, aunque venga envuelto.
export function errorPostgres(error: unknown): { codigo?: string; restriccion?: string } {
  const pg = (error as { cause?: unknown })?.cause ?? error;
  const { code, constraint } = (pg ?? {}) as { code?: string; constraint?: string };
  return { codigo: code, restriccion: constraint };
}
