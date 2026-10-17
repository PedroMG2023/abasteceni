import { Client } from 'pg';

// Consulta directa con el rol propietario, solo para comprobar el estado de la base en las pruebas.
export async function consultar<T extends Record<string, unknown>>(url: string, texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}
