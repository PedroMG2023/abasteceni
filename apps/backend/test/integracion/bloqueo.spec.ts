import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { MENSAJE_CUENTA_BLOQUEADA } from '../../src/aplicacion/despachador/manejadores/notificar-cuenta-bloqueada';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import { ADAPTADORES_TRABAJADOR, TrabajadorModule } from '../../src/composicion/trabajador.module';
import type { ServicioSeguridad } from '../../src/dominio/m2-seguridad';
import { NotificadorCorreo, ProveedorCorreoSimulado } from '../../src/infraestructura/notificacion/correo';
import { NotificadorConInterruptor } from '../../src/infraestructura/notificacion/interruptor';
import type { SondeoBandeja } from '../../src/infraestructura/sondeo/sondeo-bandeja';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { validarRespuesta } from '../soporte/contrato';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };

describe('CT-SEG-07 · bloqueo de 15 minutos tras 5 intentos fallidos y aviso al correo registrado (SYS-FN-07, DIS-34)', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;
  let trabajador: TestingModule;
  let sondeo: SondeoBandeja;
  const correo = new ProveedorCorreoSimulado();

  const intentar = async (contrasena: string): Promise<Response> => {
    const respuesta = await request(app.getHttpServer()).post('/api/v1/sesiones').send({ correo: ADMIN.correo, contrasena });
    validarRespuesta('/sesiones', 'post', respuesta.status, respuesta.body);
    return respuesta;
  };

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    const configuracion = configuracionPrueba(bd.urlApp);
    app = await crearApiPrueba(configuracion);
    await app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad).registrarAdministrador(ADMIN);
    trabajador = await Test.createTestingModule({ imports: [TrabajadorModule.registrar(configuracion)] })
      .overrideProvider(ADAPTADORES_TRABAJADOR.notificadorCorreo)
      .useValue(new NotificadorConInterruptor(new NotificadorCorreo(correo), NotificadorCorreo.CANAL))
      .compile();
    sondeo = trabajador.get(ADAPTADORES_TRABAJADOR.sondeo);
  }, 120000);

  afterAll(async () => {
    await trabajador.close();
    await app.close();
    await bd.detener();
  });

  it('cuatro intentos fallidos responden 401 y el quinto bloquea con el mensaje aprobado', async () => {
    for (let i = 0; i < 4; i++) expect((await intentar('no-es-la-clave')).status).toBe(401);

    const quinto = await intentar('no-es-la-clave');

    expect(quinto.status).toBe(403);
    expect(quinto.body).toEqual({
      codigo: 'CUENTA_BLOQUEADA',
      mensaje: 'Su cuenta está bloqueada temporalmente por intentos fallidos. Intente de nuevo en 15 minutos.',
    });
    const [fila] = await consultar<{ minutos: number; intentos: number }>(
      bd.urlPropietario,
      `SELECT round(extract(epoch FROM bloqueada_hasta - now()) / 60)::int AS minutos, intentos_fallidos AS intentos
         FROM m2_seguridad.credenciales WHERE correo = $1`,
      [ADMIN.correo],
    );
    expect(fila).toEqual({ minutos: 15, intentos: 0 });
  });

  it('durante el bloqueo la contraseña correcta también recibe 403', async () => {
    const respuesta = await intentar(ADMIN.contrasena);
    expect(respuesta.status).toBe(403);
    expect(respuesta.body.codigo).toBe('CUENTA_BLOQUEADA');
  });

  it('el trabajador avisa el bloqueo al correo registrado por el canal de correo', async () => {
    await sondeo.procesarLote();

    expect(correo.enviados).toEqual([{ correo: ADMIN.correo, asunto: 'AbasteceNi', texto: MENSAJE_CUENTA_BLOQUEADA }]);
  });
});
