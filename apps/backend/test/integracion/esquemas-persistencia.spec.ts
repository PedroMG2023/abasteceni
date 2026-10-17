import type { PgSchema } from 'drizzle-orm/pg-core';
import { Client } from 'pg';
import { esquema as m1 } from '../../src/infraestructura/persistencia/m1-usuarios/esquema';
import { esquema as m2 } from '../../src/infraestructura/persistencia/m2-seguridad/esquema';
import { esquema as m3 } from '../../src/infraestructura/persistencia/m3-demandas/esquema';
import { esquema as m4 } from '../../src/infraestructura/persistencia/m4-ofertas/esquema';
import { esquema as m5 } from '../../src/infraestructura/persistencia/m5-busqueda/esquema';
import { esquema as m6 } from '../../src/infraestructura/persistencia/m6-cotizaciones/esquema';
import { esquema as m7 } from '../../src/infraestructura/persistencia/m7-chat/esquema';
import { esquema as m8 } from '../../src/infraestructura/persistencia/m8-reputacion/esquema';
import { esquema as m9 } from '../../src/infraestructura/persistencia/m9-administracion/esquema';
import { esquema as plataforma } from '../../src/infraestructura/persistencia/plataforma/esquema';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';

const DEFINICIONES: PgSchema[] = [plataforma, m1, m2, m3, m4, m5, m6, m7, m8, m9];

describe('Definiciones de esquema de la persistencia frente a las migraciones (PA-02)', () => {
  let bd: BaseDatosPrueba;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
  }, 120000);

  afterAll(async () => {
    await bd.detener();
  });

  it('cada esquema declarado en el código existe en la base migrada y no hay esquemas no declarados', async () => {
    const cliente = new Client({ connectionString: bd.urlApp });
    await cliente.connect();
    try {
      const { rows } = await cliente.query<{ nombre: string }>(
        `SELECT nspname AS nombre FROM pg_namespace
          WHERE nspname NOT IN ('public', 'information_schema') AND nspname NOT LIKE 'pg\\_%'`,
      );
      const enBaseDatos = rows.map((f) => f.nombre).sort();
      const declarados = DEFINICIONES.map((e) => e.schemaName).sort();
      expect(enBaseDatos).toEqual(declarados);
    } finally {
      await cliente.end();
    }
  });
});
