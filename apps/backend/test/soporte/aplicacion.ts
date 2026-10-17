import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { ApiModule } from '../../src/composicion/api.module';
import type { Configuracion } from '../../src/composicion/configuracion';
import { configurarApi } from '../../src/composicion/configurar-api';

// Levanta la API con la misma composición y configuración que main.api.ts.
// «ajustar» permite sustituir adaptadores desde la composición (AS-17).
export async function crearApiPrueba(
  configuracion: Configuracion,
  ajustar: (constructor: TestingModuleBuilder) => TestingModuleBuilder = (c) => c,
): Promise<INestApplication> {
  const modulo = await ajustar(Test.createTestingModule({ imports: [ApiModule.registrar(configuracion)] })).compile();
  const app = configurarApi(modulo.createNestApplication({ logger: false }), configuracion);
  await app.init();
  return app;
}
