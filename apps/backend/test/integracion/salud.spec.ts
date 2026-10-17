import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { validarRespuesta } from '../soporte/contrato';

describe('Sonda de vitalidad (D3 R-03) conforme al contrato (PA-07)', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    app = await crearApiPrueba(configuracionPrueba(bd.urlApp));
  }, 120000);

  afterAll(async () => {
    await app.close();
    await bd.detener();
  });

  it('GET /api/v1/salud responde 200 con el cuerpo que declara el contrato y cabeceras de seguridad', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/v1/salud');

    expect(respuesta.status).toBe(200);
    validarRespuesta('/salud', 'get', respuesta.status, respuesta.body);
    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['x-powered-by']).toBeUndefined();
  });

  it('el validador rechaza una respuesta que no cumple el contrato', () => {
    expect(() => validarRespuesta('/salud', 'get', 200, { estado: 'caido' })).toThrow(/no cumple el contrato/);
    expect(() => validarRespuesta('/salud', 'get', 418, {})).toThrow(/no declara el estado 418/);
  });

  it('una ruta inexistente responde 404 con la forma uniforme de error', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/v1/inexistente');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ codigo: 'NO_ENCONTRADO', mensaje: 'El recurso solicitado no existe.' });
  });
});
