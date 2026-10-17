import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from './composicion/api.module';
import { configurarApi } from './composicion/configurar-api';

// Proceso del servicio de aplicación (MD-03, MD-05).
async function iniciar(): Promise<void> {
  const app = configurarApi(await NestFactory.create(ApiModule));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PUERTO_API ?? 3000));
}

void iniciar();
