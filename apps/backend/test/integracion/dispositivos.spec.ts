import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import type { ServicioSeguridad } from '../../src/dominio/m2-seguridad';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { validarRespuesta } from '../soporte/contrato';
import { registrarPorHttp } from '../soporte/registro-http';
import { solicitudValida } from '../unitarias/datos';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };
const SOLICITUD = solicitudValida({ correo: 'compras@farmacia.ni', tipo: 'Comprador' });
const CUENTA = { correo: SOLICITUD.correo, contrasena: SOLICITUD.contrasena };

describe('CT-SEG-08 · máximo dos dispositivos por cuenta comercial (SYS-FN-08, DIS-37)', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;

  const iniciar = async (datos: { correo: string; contrasena: string }): Promise<string[]> => {
    const respuesta = await request(app.getHttpServer()).post('/api/v1/sesiones').send(datos);
    expect(respuesta.status).toBe(201);
    return respuesta.headers['set-cookie'] as unknown as string[];
  };

  const renovar = async (cookie: string[]): Promise<Response> => {
    const respuesta = await request(app.getHttpServer()).post('/api/v1/sesiones/renovacion').set('Cookie', cookie);
    validarRespuesta('/sesiones/renovacion', 'post', respuesta.status, respuesta.body);
    return respuesta;
  };

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    app = await crearApiPrueba(configuracionPrueba(bd.urlApp));
    await app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad).registrarAdministrador(ADMIN);
    const registro = await registrarPorHttp(app, SOLICITUD);
    const admin = await request(app.getHttpServer()).post('/api/v1/sesiones').send(ADMIN);
    await request(app.getHttpServer())
      .patch(`/api/v1/cuentas/${registro.body.id}`)
      .set('Authorization', `Bearer ${admin.body.credencialAcceso}`)
      .send({ decision: 'aprobar' })
      .expect(200);
  }, 120000);

  afterAll(async () => {
    await app.close();
    await bd.detener();
  });

  it('al iniciar sesión en tres dispositivos, la primera sesión queda invalidada con el mensaje aprobado', async () => {
    const primero = await iniciar(CUENTA);
    const segundo = await iniciar(CUENTA);
    const tercero = await iniciar(CUENTA);

    const desplazada = await renovar(primero);

    expect(desplazada.status).toBe(401);
    expect(desplazada.body).toEqual({
      codigo: 'SESION_DESPLAZADA',
      mensaje: 'Su sesión se cerró porque la cuenta inició sesión en otro dispositivo.',
    });
    expect((await renovar(segundo)).status).toBe(201);
    expect((await renovar(tercero)).status).toBe(201);
  });

  it('en el esquema de M2 quedan dos sesiones vigentes y la desplazada lo registra', async () => {
    const filas = await consultar<{ vigentes: number; desplazadas: number }>(
      bd.urlPropietario,
      `SELECT count(*) FILTER (WHERE s.revocada_en IS NULL)::int AS vigentes,
              count(*) FILTER (WHERE s.desplazada)::int AS desplazadas
         FROM m2_seguridad.sesiones s JOIN m2_seguridad.credenciales c ON c.id = s.credencial_id
        WHERE c.correo = $1`,
      [CUENTA.correo],
    );
    expect(filas).toEqual([{ vigentes: 2, desplazadas: 1 }]);
  });

  it('inicios de sesión simultáneos no dejan más de dos sesiones vigentes', async () => {
    await Promise.all([iniciar(CUENTA), iniciar(CUENTA), iniciar(CUENTA), iniciar(CUENTA)]);

    const [fila] = await consultar<{ vigentes: number }>(
      bd.urlPropietario,
      `SELECT count(*)::int AS vigentes FROM m2_seguridad.sesiones s JOIN m2_seguridad.credenciales c ON c.id = s.credencial_id
        WHERE c.correo = $1 AND s.revocada_en IS NULL`,
      [CUENTA.correo],
    );
    expect(fila.vigentes).toBe(2);
  });
});
