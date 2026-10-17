import { Client } from 'pg';
import { CuentaComercial } from '../../src/dominio/m1-usuarios';
import { BandejaSalidaPg } from '../../src/infraestructura/bandeja-salida/bandeja-salida-pg';
import { ContadorPeticionesPg } from '../../src/infraestructura/limite-peticiones/contador-peticiones-pg';
import { crearBaseDatos } from '../../src/infraestructura/persistencia/base-datos';
import { RepositorioUsuariosPg } from '../../src/infraestructura/persistencia/m1-usuarios/repositorio-usuarios-pg';
import { UnidadTrabajoPg } from '../../src/infraestructura/persistencia/unidad-trabajo-pg';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { consultar } from '../soporte/consultas';
import { solicitudValida } from '../unitarias/datos';

// Privilegios declarados en las migraciones 0001 y 0003 (ADR-05): ni más ni menos.
const PRIVILEGIOS_DECLARADOS = [
  'm1_usuarios.cuentas_comerciales:INSERT',
  'm1_usuarios.cuentas_comerciales:SELECT',
  'm1_usuarios.cuentas_comerciales:UPDATE',
  'm2_seguridad.credenciales:INSERT',
  'm2_seguridad.credenciales:SELECT',
  'm2_seguridad.credenciales:UPDATE',
  'm2_seguridad.sesiones:INSERT',
  'm2_seguridad.sesiones:SELECT',
  'm2_seguridad.sesiones:UPDATE',
  'plataforma.bandeja_salida:INSERT',
  'plataforma.bandeja_salida:SELECT',
  'plataforma.bandeja_salida:UPDATE',
  'plataforma.contador_peticiones:DELETE',
  'plataforma.contador_peticiones:INSERT',
  'plataforma.contador_peticiones:SELECT',
  'plataforma.contador_peticiones:UPDATE',
];

function cuenta(id: string, ruc: string): CuentaComercial {
  return CuentaComercial.registrar(solicitudValida({ ruc }), { id, ahora: new Date('2026-10-17T12:00:00Z') });
}

describe('Base de datos de la línea base (IT-01)', () => {
  let bd: BaseDatosPrueba;
  let conexion: ReturnType<typeof crearBaseDatos>;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    conexion = crearBaseDatos(bd.urlApp);
  });

  afterAll(async () => {
    await conexion.pool.end();
    await bd.detener();
  });

  it('ADR-05 · los privilegios de abasteceni_app sobre las tablas son exactamente los declarados', async () => {
    const filas = await consultar<{ privilegio: string }>(
      bd.urlPropietario,
      `SELECT table_schema || '.' || table_name || ':' || privilege_type AS privilegio
         FROM information_schema.role_table_grants
        WHERE grantee = 'abasteceni_app'
        ORDER BY 1`,
    );
    expect(filas.map((f) => f.privilegio)).toEqual(PRIVILEGIOS_DECLARADOS);
    const [tablaMigraciones] = await consultar(
      bd.urlPropietario,
      `SELECT has_table_privilege('abasteceni_app', 'plataforma.migraciones', 'SELECT') AS lectura`,
    );
    expect(tablaMigraciones).toEqual({ lectura: false });
  });

  it('ADR-01 · el cambio de estado y su evento se confirman juntos o se revierten juntos', async () => {
    const unidad = new UnidadTrabajoPg(conexion.db);
    const repositorio = new RepositorioUsuariosPg(conexion.db);
    const bandeja = new BandejaSalidaPg(conexion.db);
    const evento = (id: string) => ({ id, tipo: 'CuentaRegistrada', ocurridoEn: new Date(), datos: { cuentaId: id } });
    const idConfirmada = '00000000-0000-4000-8000-000000000001';
    const idRevertida = '00000000-0000-4000-8000-000000000002';

    await unidad.ejecutar(async (tx) => {
      await repositorio.guardar(cuenta(idConfirmada, 'J0310000000001'), tx);
      await bandeja.publicar(evento(idConfirmada), tx);
    });
    await expect(
      unidad.ejecutar(async (tx) => {
        await repositorio.guardar(cuenta(idRevertida, 'J0310000000002'), tx);
        await bandeja.publicar(evento(idRevertida), tx);
        throw new Error('fallo después de escribir ambos');
      }),
    ).rejects.toThrow('fallo después de escribir ambos');

    const cuentas = await consultar(bd.urlPropietario, 'SELECT id FROM m1_usuarios.cuentas_comerciales ORDER BY id');
    const eventos = await consultar(bd.urlPropietario, 'SELECT id FROM plataforma.bandeja_salida ORDER BY id');
    expect(cuentas).toEqual([{ id: idConfirmada }]);
    expect(eventos).toEqual([{ id: idConfirmada }]);
  });

  describe('restricciones de integridad', () => {
    const insertar = async (cambios: Record<string, string | null>) => {
      const cliente = new Client({ connectionString: bd.urlApp });
      await cliente.connect();
      const fila = {
        id: '00000000-0000-4000-8000-0000000000aa',
        tipo: 'Comprador',
        razon_social: 'Farmacia',
        ruc: 'J0310000000050',
        departamento: 'Chinandega',
        municipio: 'El Viejo',
        rubro: 'Farmacia',
        telefono_movil: '+50588887777',
        correo: 'a@b.ni',
        estado: 'Pendiente de validación',
        registrada_en: new Date().toISOString(),
        ...cambios,
      };
      try {
        const columnas = Object.keys(fila);
        await cliente.query(
          `INSERT INTO m1_usuarios.cuentas_comerciales (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})`,
          Object.values(fila),
        );
      } finally {
        await cliente.end();
      }
    };

    it('el RUC es único (SYS-FN-01)', async () => {
      await expect(insertar({ ruc: 'J0310000000001', id: '00000000-0000-4000-8000-0000000000ab' })).rejects.toMatchObject({
        code: '23505',
        constraint: 'cuentas_comerciales_ruc_unico',
      });
    });

    it.each(['razon_social', 'ruc', 'departamento', 'municipio', 'rubro'])('%s es NOT NULL (SYS-FN-01)', async (columna) => {
      await expect(insertar({ [columna]: null })).rejects.toMatchObject({ code: '23502', column: columna });
    });

    it.each(['razon_social', 'departamento', 'municipio', 'rubro'])('%s no admite texto vacío', async (columna) => {
      await expect(insertar({ [columna]: '  ' })).rejects.toMatchObject({ code: '23514', constraint: 'cuentas_comerciales_obligatorios' });
    });

    it('el formato del RUC y los estados de la cuenta están restringidos (DIS-21, DIS-23)', async () => {
      await expect(insertar({ ruc: '12345' })).rejects.toMatchObject({ code: '23514', constraint: 'cuentas_comerciales_ruc_formato' });
      await expect(insertar({ estado: 'Borrada' })).rejects.toMatchObject({ code: '23514', constraint: 'cuentas_comerciales_estado' });
    });

    it('el correo de la credencial es único (DIS-16)', async () => {
      const credencial = (id: string) =>
        consultar(
          bd.urlApp,
          `INSERT INTO m2_seguridad.credenciales (id, correo, hash_contrasena, rol, habilitacion, creada_en)
           VALUES ($1, 'unico@empresa.ni', 'h', 'Comprador', 'pendiente', now())`,
          [id],
        );
      await credencial('00000000-0000-4000-8000-0000000000c1');
      await expect(credencial('00000000-0000-4000-8000-0000000000c2')).rejects.toMatchObject({ code: '23505', constraint: 'credenciales_correo_unico' });
    });
  });

  it('ADR-08 · el contador de peticiones es compartido entre conexiones y atómico bajo concurrencia', async () => {
    const otra = crearBaseDatos(bd.urlApp, 5);
    try {
      const contadores = [new ContadorPeticionesPg(conexion.db), new ContadorPeticionesPg(otra.db)];
      const ventana = new Date('2026-10-17T12:00:00.000Z');

      const cuentas = await Promise.all(Array.from({ length: 40 }, (_, i) => contadores[i % 2].registrar('203.0.113.7', ventana)));

      expect([...cuentas].sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
      expect(await contadores[0].registrar('198.51.100.1', ventana)).toBe(1);
      expect(await contadores[1].purgar(new Date('2026-10-17T12:01:00.000Z'))).toBe(2);
    } finally {
      await otra.pool.end();
    }
  });
});
