import { Client } from 'pg';

export const ROL_PROPIETARIO = 'abasteceni_propietario';
export const ROL_APP = 'abasteceni_app';

export interface OpcionesProvision {
  nombreBaseDatos: string;
  clavePropietario: string;
  claveApp: string;
}

// Crea los dos roles de ADR-05 y la base de datos, propiedad de
// abasteceni_propietario. Se ejecuta una sola vez con un superusuario, antes de
// las migraciones. Las sentencias DDL no admiten parámetros: los valores viajan
// como parámetros de set_config y se citan con format(%L) dentro del servidor.
export async function provisionarBaseDatos(urlSuperusuario: string, opciones: OpcionesProvision): Promise<void> {
  const cliente = new Client({ connectionString: urlSuperusuario });
  await cliente.connect();
  try {
    await cliente.query(
      `SELECT set_config('abasteceni.clave_propietario', $1, false),
              set_config('abasteceni.clave_app', $2, false),
              set_config('abasteceni.base_datos', $3, false)`,
      [opciones.clavePropietario, opciones.claveApp, opciones.nombreBaseDatos],
    );
    await cliente.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROL_PROPIETARIO}') THEN
          EXECUTE format('CREATE ROLE ${ROL_PROPIETARIO} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
                         current_setting('abasteceni.clave_propietario'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROL_APP}') THEN
          EXECUTE format('CREATE ROLE ${ROL_APP} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
                         current_setting('abasteceni.clave_app'));
        END IF;
      END
      $$`);
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [opciones.nombreBaseDatos]);
    if (rowCount === 0) {
      const nombre = cliente.escapeIdentifier(opciones.nombreBaseDatos);
      await cliente.query(`CREATE DATABASE ${nombre} OWNER ${ROL_PROPIETARIO}`);
      await cliente.query(`REVOKE ALL ON DATABASE ${nombre} FROM PUBLIC`);
      await cliente.query(`GRANT CONNECT ON DATABASE ${nombre} TO ${ROL_APP}`);
    }
  } finally {
    await cliente.end();
  }
}
