import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { enlaceRestablecimiento, mensajeRecuperacion } from '../../src/aplicacion/despachador/manejadores/notificar-recuperacion';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import { ADAPTADORES_TRABAJADOR, TrabajadorModule } from '../../src/composicion/trabajador.module';
import type { ServicioSeguridad } from '../../src/dominio/m2-seguridad';
import { NotificadorCorreo, ProveedorCorreoSimulado } from '../../src/infraestructura/notificacion/correo';
import { NotificadorConInterruptor } from '../../src/infraestructura/notificacion/interruptor';
import type { SondeoBandeja } from '../../src/infraestructura/sondeo/sondeo-bandeja';
import { RelojFijo } from '../dobles/sistema';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { validarRespuesta } from '../soporte/contrato';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };
const NUEVA = 'una-clave-nueva-y-larga';
const AVISO_SOLICITUD = 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Vence en 15 minutos.';
const VENCIDO = { codigo: 'ENLACE_VENCIDO', mensaje: 'El enlace venció o ya fue usado. Solicite uno nuevo.' };

describe('CT-SEG-05 · recuperación por enlace temporal al correo registrado, válido 15 minutos (SYS-FN-05, DIS-36)', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;
  let trabajador: TestingModule;
  let sondeo: SondeoBandeja;
  const reloj = new RelojFijo(new Date());
  const correo = new ProveedorCorreoSimulado();
  const configuracion = () => configuracionPrueba(bd.urlApp);

  const solicitar = async (direccion: string): Promise<Response> => {
    const respuesta = await request(app.getHttpServer()).post('/api/v1/sesiones/recuperacion').send({ correo: direccion });
    validarRespuesta('/sesiones/recuperacion', 'post', respuesta.status, respuesta.body);
    return respuesta;
  };

  const restablecer = async (secreto: string, contrasena = NUEVA): Promise<Response> => {
    const respuesta = await request(app.getHttpServer()).post('/api/v1/sesiones/recuperacion/restablecimiento').send({ secreto, contrasena });
    validarRespuesta('/sesiones/recuperacion/restablecimiento', 'post', respuesta.status, respuesta.body);
    return respuesta;
  };

  const iniciar = (contrasena: string) => request(app.getHttpServer()).post('/api/v1/sesiones').send({ correo: ADMIN.correo, contrasena });

  // El trabajador entrega el aviso por el canal de correo; el secreto se lee del enlace recibido.
  const secretoEntregado = async (): Promise<string> => {
    await sondeo.procesarLote();
    const ultimo = correo.enviados.at(-1)!;
    return decodeURIComponent(/#\/restablecer\/([^.\s]+)/.exec(ultimo.texto)![1]);
  };

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    app = await crearApiPrueba(configuracion(), (c) => c.overrideProvider(SIMBOLOS.reloj).useValue(reloj));
    await app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad).registrarAdministrador(ADMIN);
    trabajador = await Test.createTestingModule({ imports: [TrabajadorModule.registrar(configuracion())] })
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

  it('la solicitud responde 202 con el mismo aviso para un correo registrado y para uno inexistente', async () => {
    const registrado = await solicitar(ADMIN.correo);
    const inexistente = await solicitar('nadie@empresa.ni');

    expect(registrado.status).toBe(202);
    expect(registrado.body).toEqual({ mensaje: AVISO_SOLICITUD });
    expect(inexistente.status).toBe(202);
    expect(inexistente.body).toEqual(registrado.body);
  });

  it('el trabajador envía el enlace al correo registrado con el texto aprobado, y solo la huella queda en M2', async () => {
    const secreto = await secretoEntregado();

    expect(correo.enviados).toHaveLength(1);
    expect(correo.enviados[0]).toEqual({
      correo: ADMIN.correo,
      asunto: 'AbasteceNi',
      texto: mensajeRecuperacion(enlaceRestablecimiento(configuracion().origenWeb, secreto)),
    });
    const filas = await consultar<{ huella: string; minutos: number }>(
      bd.urlPropietario,
      `SELECT huella, round(extract(epoch FROM expira_en - creada_en) / 60)::int AS minutos FROM m2_seguridad.recuperaciones`,
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].minutos).toBe(15);
    expect(filas[0].huella).not.toContain(secreto);
  });

  it('usado antes de 15 minutos cambia la contraseña, revoca las sesiones y queda en la bitácora', async () => {
    const sesionPrevia = await iniciar(ADMIN.contrasena);
    const cookiePrevia = sesionPrevia.headers['set-cookie'];
    await solicitar(ADMIN.correo);
    const secreto = await secretoEntregado();
    reloj.avanzar(14 * 60 * 1000);

    const respuesta = await restablecer(secreto);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ mensaje: 'Su contraseña fue restablecida. Inicie sesión con la nueva contraseña.' });
    expect((await iniciar(ADMIN.contrasena)).status).toBe(401);
    expect((await iniciar(NUEVA)).status).toBe(201);
    const renovacion = await request(app.getHttpServer()).post('/api/v1/sesiones/renovacion').set('Cookie', cookiePrevia);
    expect(renovacion.status).toBe(401);
    const asientos = await consultar<{ accion: string }>(
      bd.urlPropietario,
      `SELECT accion FROM m9_administracion.bitacora WHERE accion = 'CONTRASENA_RESTABLECIDA'`,
    );
    expect(asientos).toHaveLength(1);
  });

  it('el mismo enlace no sirve dos veces (410)', async () => {
    const secreto = decodeURIComponent(/#\/restablecer\/([^.\s]+)/.exec(correo.enviados.at(-1)!.texto)![1]);

    const respuesta = await restablecer(secreto, 'otra-clave-distinta');

    expect(respuesta.status).toBe(410);
    expect(respuesta.body).toEqual(VENCIDO);
  });

  it('reintentar a los 16 minutos responde 410 y la contraseña no cambia', async () => {
    await solicitar(ADMIN.correo);
    const secreto = await secretoEntregado();
    reloj.avanzar(16 * 60 * 1000);

    const respuesta = await restablecer(secreto, 'clave-que-no-debe-quedar');

    expect(respuesta.status).toBe(410);
    expect(respuesta.body).toEqual(VENCIDO);
    expect((await iniciar(NUEVA)).status).toBe(201);
  });

  it('una contraseña corta responde 400 con el mensaje del catálogo', async () => {
    const respuesta = await restablecer('cualquiera', 'corta');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles).toEqual([{ campo: 'contrasena', mensaje: 'La contraseña debe tener entre 12 y 128 caracteres.' }]);
  });
});
