import type { INestApplication } from '@nestjs/common';

export const PREFIJO_API = 'api/v1';

// Configuración común del servicio de aplicación. La usan main.api.ts y las
// pruebas de integración, de modo que ambas ejercitan la misma aplicación.
export function configurarApi(app: INestApplication): INestApplication {
  app.setGlobalPrefix(PREFIJO_API);
  return app;
}
