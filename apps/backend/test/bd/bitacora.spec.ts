import { Client } from 'pg';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { consultar } from '../soporte/consultas';

// Inmutabilidad de la bitácora verificable en el gestor (ADR-05, PA-06,
// SYS-FN-35; AS-12): la aplicación inserta y lee, pero no modifica ni borra.
describe('SYS-FN-35 · bitácora de solo adición con el rol de la aplicación (ADR-05)', () => {
  let bd: BaseDatosPrueba;
  const ID = '00000000-0000-4000-8000-0000000000b1';

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    await consultar(
      bd.urlApp,
      `INSERT INTO m9_administracion.bitacora (id, usuario_id, accion, recurso_tipo, recurso_id, detalle, ip, registrado_en)
       VALUES ($1, NULL, 'CUENTA_APROBADA', 'CuentaComercial', 'c-1', '{"resultado":"Activa"}', '198.51.100.20', now())`,
      [ID],
    );
  });

  afterAll(async () => {
    await bd.detener();
  });

  it('abasteceni_app puede insertar y leer asientos', async () => {
    expect(await consultar(bd.urlApp, 'SELECT accion FROM m9_administracion.bitacora WHERE id = $1', [ID])).toEqual([{ accion: 'CUENTA_APROBADA' }]);
  });

  it.each([
    ['UPDATE', `UPDATE m9_administracion.bitacora SET detalle = '{"resultado":"Rechazada"}' WHERE id = '${ID}'`],
    ['DELETE', `DELETE FROM m9_administracion.bitacora WHERE id = '${ID}'`],
    ['TRUNCATE', 'TRUNCATE m9_administracion.bitacora'],
  ])('%s sobre la bitácora falla con el rol de la aplicación', async (_operacion, sentencia) => {
    await expect(consultar(bd.urlApp, sentencia)).rejects.toMatchObject({ code: '42501' });
    expect(await consultar(bd.urlPropietario, 'SELECT detalle FROM m9_administracion.bitacora WHERE id = $1', [ID])).toEqual([
      { detalle: { resultado: 'Activa' } },
    ]);
  });

  it('el gestor declara UPDATE, DELETE y TRUNCATE revocados para abasteceni_app', async () => {
    const [privilegios] = await consultar(
      bd.urlPropietario,
      `SELECT has_table_privilege('abasteceni_app', 'm9_administracion.bitacora', 'UPDATE') AS actualizar,
              has_table_privilege('abasteceni_app', 'm9_administracion.bitacora', 'DELETE') AS borrar,
              has_table_privilege('abasteceni_app', 'm9_administracion.bitacora', 'TRUNCATE') AS vaciar,
              has_table_privilege('abasteceni_app', 'm9_administracion.bitacora', 'INSERT') AS insertar,
              has_table_privilege('abasteceni_app', 'm9_administracion.bitacora', 'SELECT') AS leer`,
    );
    expect(privilegios).toEqual({ actualizar: false, borrar: false, vaciar: false, insertar: true, leer: true });
  });

  it('una transacción que inserta un asiento y luego falla no deja el asiento (ADR-01)', async () => {
    const cliente = new Client({ connectionString: bd.urlApp });
    await cliente.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(
        `INSERT INTO m9_administracion.bitacora (id, usuario_id, accion, recurso_tipo, recurso_id, detalle, ip, registrado_en)
         VALUES ('00000000-0000-4000-8000-0000000000b2', NULL, 'CUENTA_RECHAZADA', 'CuentaComercial', 'c-2', '{}', '198.51.100.20', now())`,
      );
      await cliente.query('ROLLBACK');
    } finally {
      await cliente.end();
    }
    expect(await consultar(bd.urlPropietario, "SELECT 1 FROM m9_administracion.bitacora WHERE recurso_id = 'c-2'")).toEqual([]);
  });
});
