import { asc, sql } from 'drizzle-orm';
import type { AsientoBitacora } from '../../src/dominio/puertos';
import { BitacoraMemoria } from '../../src/infraestructura/auditoria/bitacora-memoria';
import { BitacoraPg } from '../../src/infraestructura/auditoria/bitacora-pg';
import { crearBaseDatos } from '../../src/infraestructura/persistencia/base-datos';
import { bitacora as tablaBitacora } from '../../src/infraestructura/persistencia/m9-administracion/esquema';
import { UnidadTrabajoMemoria } from '../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import { UnidadTrabajoPg } from '../../src/infraestructura/persistencia/unidad-trabajo-pg';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { contratoBitacora } from './bitacora.contrato';

contratoBitacora({
  nombre: 'memoria',
  crear: async () => {
    const bitacora = new BitacoraMemoria();
    return { bitacora, unidadTrabajo: new UnidadTrabajoMemoria(), leer: async () => [...bitacora.asientos] };
  },
});

describe('con PostgreSQL real', () => {
  let bd: BaseDatosPrueba;
  let conexion: ReturnType<typeof crearBaseDatos>;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    conexion = crearBaseDatos(bd.urlApp);
  }, 120000);

  afterAll(async () => {
    await conexion.pool.end();
    await bd.detener();
  });

  contratoBitacora({
    nombre: 'PostgreSQL',
    crear: async () => {
      // La aplicación no puede vaciar la bitácora (ADR-05): se vacía con el rol propietario.
      const propietario = crearBaseDatos(bd.urlPropietario, 1);
      await propietario.db.execute(sql`TRUNCATE m9_administracion.bitacora`);
      await propietario.pool.end();
      const leer = async (): Promise<AsientoBitacora[]> =>
        (await conexion.db.select().from(tablaBitacora).orderBy(asc(tablaBitacora.registradoEn))).map((f) => ({
          id: f.id,
          usuarioId: f.usuarioId,
          accion: f.accion,
          recurso: { tipo: f.recursoTipo, id: f.recursoId },
          detalle: f.detalle as Record<string, unknown>,
          ip: f.ip,
          registradoEn: f.registradoEn,
        }));
      return { bitacora: new BitacoraPg(conexion.db), unidadTrabajo: new UnidadTrabajoPg(conexion.db), leer };
    },
  });
});
