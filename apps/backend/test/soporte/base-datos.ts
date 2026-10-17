import path from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { aplicarMigraciones } from '../../src/infraestructura/persistencia/migrador';
import { provisionarBaseDatos, ROL_APP, ROL_PROPIETARIO } from '../../scripts/provisionar';

// Misma imagen que docker-compose.yml. La base de prueba vive en un contenedor
// efímero, separada de la de desarrollo (ISO/IEC 27002:2022, control 8.31).
export const IMAGEN_POSTGRES = 'postgres:18.6-alpine';
export const CARPETA_MIGRACIONES = path.resolve(__dirname, '../../migraciones');

// Claves solo válidas dentro del contenedor efímero de la prueba.
const CLAVE_PROPIETARIO = 'propietario-prueba';
const CLAVE_APP = 'app-prueba';
const NOMBRE_BASE_DATOS = 'abasteceni';

export interface BaseDatosPrueba {
  urlSuperusuario: string;
  urlPropietario: string;
  urlApp: string;
  detener(): Promise<void>;
}

function url(contenedor: StartedPostgreSqlContainer, usuario: string, clave: string, base: string): string {
  return `postgresql://${usuario}:${clave}@${contenedor.getHost()}:${contenedor.getPort()}/${base}`;
}

// Arranca PostgreSQL, crea los roles de ADR-05 y, si se pide, aplica las
// migraciones con el rol propietario.
export async function iniciarBaseDatosPrueba(opciones: { migrar?: boolean } = {}): Promise<BaseDatosPrueba> {
  const contenedor = await new PostgreSqlContainer(IMAGEN_POSTGRES).start();
  const urlSuperusuario = contenedor.getConnectionUri();
  await provisionarBaseDatos(urlSuperusuario, {
    nombreBaseDatos: NOMBRE_BASE_DATOS,
    clavePropietario: CLAVE_PROPIETARIO,
    claveApp: CLAVE_APP,
  });
  const base: BaseDatosPrueba = {
    urlSuperusuario,
    urlPropietario: url(contenedor, ROL_PROPIETARIO, CLAVE_PROPIETARIO, NOMBRE_BASE_DATOS),
    urlApp: url(contenedor, ROL_APP, CLAVE_APP, NOMBRE_BASE_DATOS),
    detener: async () => {
      await contenedor.stop();
    },
  };
  if (opciones.migrar ?? true) {
    await aplicarMigraciones(base.urlPropietario, CARPETA_MIGRACIONES);
  }
  return base;
}
