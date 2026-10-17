import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../../src/composicion/api.module';
import { configurarApi } from '../../src/composicion/configurar-api';
import { validarRespuesta } from '../soporte/contrato';

describe('Sonda de vitalidad (D3 R-03) conforme al contrato (PA-07)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [ApiModule] }).compile();
    app = configurarApi(modulo.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/salud responde 200 con el cuerpo que declara el contrato', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/v1/salud');

    expect(respuesta.status).toBe(200);
    validarRespuesta('/salud', 'get', respuesta.status, respuesta.body);
  });

  it('el validador rechaza una respuesta que no cumple el contrato', () => {
    expect(() => validarRespuesta('/salud', 'get', 200, { estado: 'caido' })).toThrow(/no cumple el contrato/);
    expect(() => validarRespuesta('/salud', 'get', 418, {})).toThrow(/no declara el estado 418/);
  });
});
