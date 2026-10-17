import path from 'node:path';
import { aplicarMigraciones } from '../src/infraestructura/persistencia/migrador';

// Orden de despliegue: aplica las migraciones con el rol propietario (ADR-05).
const url = process.env.URL_BD_PROPIETARIO;
if (!url) {
  console.error('Falta la variable de entorno URL_BD_PROPIETARIO.');
  process.exit(1);
}

aplicarMigraciones(url, path.resolve(__dirname, '../../migraciones'))
  .then(() => console.log('Migraciones aplicadas.'))
  .catch((error: unknown) => {
    console.error('Error al aplicar las migraciones:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
