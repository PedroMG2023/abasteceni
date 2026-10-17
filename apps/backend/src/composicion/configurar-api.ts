import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { Configuracion } from './configuracion';

export const PREFIJO_API = 'api/v1';

// Configuración común del servicio de aplicación. La usan main.api.ts y las
// pruebas de integración, de modo que ambas ejercitan la misma aplicación.
export function configurarApi(
  app: INestApplication,
  configuracion: Pick<Configuracion, 'origenWeb' | 'proxiesConfiables'>,
): INestApplication {
  const express = app as NestExpressApplication;
  // IP real del cliente tras el balanceador, para el límite de ADR-08.
  express.set('trust proxy', configuracion.proxiesConfiables);
  // Cabeceras de seguridad HTTP y CORS restringido al cliente web (CLAUDE.md §9).
  app.use(helmet());
  app.enableCors({ origin: configuracion.origenWeb, credentials: true });
  app.setGlobalPrefix(PREFIJO_API);
  return app;
}
