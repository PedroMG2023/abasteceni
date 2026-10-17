import { Client } from 'pg';
import { aplicarMigraciones } from '../../src/infraestructura/persistencia/migrador';
import { CARPETA_MIGRACIONES, iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';

const ESQUEMAS_DE_MODULO = [
  'm1_usuarios',
  'm2_seguridad',
  'm3_demandas',
  'm4_ofertas',
  'm5_busqueda',
  'm6_cotizaciones',
  'm7_chat',
  'm8_reputacion',
  'm9_administracion',
];
const TODOS_LOS_ESQUEMAS = ['plataforma', ...ESQUEMAS_DE_MODULO];

async function conectar(url: string): Promise<Client> {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  return cliente;
}

describe('Migraciones y esquemas (PA-02, ADR-01, ADR-05)', () => {
  let bd: BaseDatosPrueba;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba({ migrar: false });
  });

  afterAll(async () => {
    await bd.detener();
  });

  it('las migraciones aplican desde cero y una segunda ejecución no tiene efecto', async () => {
    await aplicarMigraciones(bd.urlPropietario, CARPETA_MIGRACIONES);
    await aplicarMigraciones(bd.urlPropietario, CARPETA_MIGRACIONES);

    const cliente = await conectar(bd.urlPropietario);
    try {
      const { rows } = await cliente.query('SELECT count(*)::int AS aplicadas FROM plataforma.migraciones');
      expect(rows[0].aplicadas).toBe(2);
    } finally {
      await cliente.end();
    }
  });

  it('existe un esquema por módulo y el esquema transversal plataforma, propiedad de abasteceni_propietario', async () => {
    const cliente = await conectar(bd.urlPropietario);
    try {
      const { rows } = await cliente.query<{ nombre: string; propietario: string }>(
        `SELECT n.nspname AS nombre, r.rolname AS propietario
           FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner
          WHERE n.nspname = ANY($1::text[])`,
        [TODOS_LOS_ESQUEMAS],
      );
      expect(rows.map((f) => f.nombre).sort()).toEqual([...TODOS_LOS_ESQUEMAS].sort());
      expect(new Set(rows.map((f) => f.propietario))).toEqual(new Set(['abasteceni_propietario']));
    } finally {
      await cliente.end();
    }
  });

  it('abasteceni_app usa los esquemas pero no puede crear objetos en ninguno', async () => {
    const cliente = await conectar(bd.urlApp);
    try {
      for (const esquema of [...TODOS_LOS_ESQUEMAS, 'public']) {
        const { rows } = await cliente.query(
          `SELECT has_schema_privilege($1, 'USAGE') AS uso, has_schema_privilege($1, 'CREATE') AS crear`,
          [esquema],
        );
        expect({ esquema, crear: rows[0].crear }).toEqual({ esquema, crear: false });
        if (esquema !== 'public') expect({ esquema, uso: rows[0].uso }).toEqual({ esquema, uso: true });
      }
      await expect(cliente.query('CREATE TABLE m1_usuarios.intrusa (id int)')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await cliente.end();
    }
  });

  it('abasteceni_app no tiene privilegios de rol elevados', async () => {
    const cliente = await conectar(bd.urlApp);
    try {
      const { rows } = await cliente.query(
        `SELECT rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolbypassrls
           FROM pg_roles WHERE rolname = current_user`,
      );
      expect(rows[0]).toEqual({ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolinherit: false, rolbypassrls: false });
    } finally {
      await cliente.end();
    }
  });
});
