import { sql } from 'drizzle-orm';
import { BandejaSalidaMemoria } from '../../src/infraestructura/bandeja-salida/bandeja-salida-memoria';
import { BandejaSalidaPg } from '../../src/infraestructura/bandeja-salida/bandeja-salida-pg';
import { crearBaseDatos, type BaseDatos } from '../../src/infraestructura/persistencia/base-datos';
import { UnidadTrabajoMemoria } from '../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import { UnidadTrabajoPg } from '../../src/infraestructura/persistencia/unidad-trabajo-pg';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { contratoBandejaSalida } from './bandeja-salida.contrato';

contratoBandejaSalida({
  nombre: 'memoria',
  crear: async () => ({ bandeja: new BandejaSalidaMemoria(), unidadTrabajo: new UnidadTrabajoMemoria() }),
});

describe('con PostgreSQL real', () => {
  let bd: BaseDatosPrueba;
  let conexion: ReturnType<typeof crearBaseDatos>;
  let db: BaseDatos;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    conexion = crearBaseDatos(bd.urlApp);
    db = conexion.db;
  }, 120000);

  afterAll(async () => {
    await conexion.pool.end();
    await bd.detener();
  });

  contratoBandejaSalida({
    nombre: 'PostgreSQL',
    crear: async () => {
      // Cada caso parte de una bandeja vacía; se limpia con el rol propietario.
      const propietario = crearBaseDatos(bd.urlPropietario, 1);
      await propietario.db.execute(sql`TRUNCATE plataforma.bandeja_salida`);
      await propietario.pool.end();
      return { bandeja: new BandejaSalidaPg(db), unidadTrabajo: new UnidadTrabajoPg(db) };
    },
  });
});
