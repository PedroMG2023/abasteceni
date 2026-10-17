import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { leerConfiguracion } from './composicion/configuracion';
import { TrabajadorModule } from './composicion/trabajador.module';

// Proceso del trabajador asíncrono (MD-03, MD-05): mismo artefacto que la API.
async function iniciar(): Promise<void> {
  const contexto = await NestFactory.createApplicationContext(TrabajadorModule.registrar(leerConfiguracion()));
  contexto.enableShutdownHooks();
}

void iniciar();
