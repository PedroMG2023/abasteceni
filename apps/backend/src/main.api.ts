import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from './composicion/api.module';
import { leerConfiguracion } from './composicion/configuracion';
import { configurarApi } from './composicion/configurar-api';

// Proceso del servicio de aplicación (MD-03, MD-05).
async function iniciar(): Promise<void> {
  const configuracion = leerConfiguracion();
  const app = configurarApi(await NestFactory.create(ApiModule.registrar(configuracion)), configuracion);
  app.enableShutdownHooks();
  await app.listen(configuracion.puertoApi);
}

void iniciar();
