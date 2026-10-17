import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Esquema y tabla donde el migrador registra las migraciones aplicadas.
// Residen en el esquema transversal, al que la aplicación no tiene acceso.
export const ESQUEMA_MIGRACIONES = 'plataforma';
export const TABLA_MIGRACIONES = 'migraciones';

// Aplica las migraciones pendientes. Debe invocarse con la conexión del rol
// abasteceni_propietario, nunca con la de la aplicación (ADR-05, PA-06).
export async function aplicarMigraciones(urlPropietario: string, carpeta: string): Promise<void> {
  const pool = new Pool({ connectionString: urlPropietario, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: carpeta,
      migrationsSchema: ESQUEMA_MIGRACIONES,
      migrationsTable: TABLA_MIGRACIONES,
    });
  } finally {
    await pool.end();
  }
}
