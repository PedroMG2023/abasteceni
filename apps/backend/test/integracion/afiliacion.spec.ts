import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import {
  MENSAJE_CUENTA_APROBADA,
  mensajeCuentaRechazada,
} from '../../src/aplicacion/despachador/manejadores/notificar-decision-cuenta';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import { ADAPTADORES_TRABAJADOR, TrabajadorModule } from '../../src/composicion/trabajador.module';
import type { ServicioSeguridad } from '../../src/dominio/m2-seguridad';
import { NotificadorConInterruptor } from '../../src/infraestructura/notificacion/interruptor';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../../src/infraestructura/notificacion/whatsapp';
import type { SondeoBandeja } from '../../src/infraestructura/sondeo/sondeo-bandeja';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { validarRespuesta } from '../soporte/contrato';
import { registrarPorHttp } from '../soporte/registro-http';
import { JPEG_MINIMO, PDF_MINIMO, solicitudValida } from '../unitarias/datos';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };
const MB = 1024 * 1024;

function pdfDe(bytes: number): Uint8Array {
  const contenido = new Uint8Array(bytes);
  contenido.set(PDF_MINIMO.subarray(0, Math.min(PDF_MINIMO.length, bytes)));
  return contenido;
}

function conforme(ruta: string, metodo: string, respuesta: Response): Response {
  validarRespuesta(ruta, metodo, respuesta.status, respuesta.body);
  return respuesta;
}

interface FilaBitacora extends Record<string, unknown> {
  accion: string;
  usuario_id: string | null;
  ip: string;
  detalle: Record<string, unknown>;
  registrado_en: Date;
}

describe('IT-02 · afiliación y validación de cuentas comerciales de extremo a extremo', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;
  let trabajador: TestingModule;
  let sondeo: SondeoBandeja;
  const proveedor = new ProveedorWhatsAppSimulado();
  let siguiente = 100;
  let administrador: string;

  const nueva = (cambios: Parameters<typeof solicitudValida>[0] = {}) => {
    siguiente += 1;
    return solicitudValida({ ruc: `J0310000000${siguiente}`, correo: `cuenta${siguiente}@empresa.ni`, telefonoMovil: `+505880${siguiente}00`, ...cambios });
  };
  const iniciarSesion = (correo: string, contrasena: string) => request(app.getHttpServer()).post('/api/v1/sesiones').send({ correo, contrasena });
  const comoAdmin = () => ({ Authorization: `Bearer ${administrador}` });
  const validar = (id: string, cuerpo: object, cabeceras = comoAdmin()) =>
    request(app.getHttpServer()).patch(`/api/v1/cuentas/${id}`).set(cabeceras).send(cuerpo);
  const bitacora = (cuentaId: string) =>
    consultar<FilaBitacora>(
      bd.urlPropietario,
      'SELECT accion, usuario_id, ip, detalle, registrado_en FROM m9_administracion.bitacora WHERE recurso_id = $1 ORDER BY registrado_en, accion',
      [cuentaId],
    );

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    const configuracion = configuracionPrueba(bd.urlApp);
    app = await crearApiPrueba(configuracion);
    await app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad).registrarAdministrador(ADMIN);
    administrador = (await iniciarSesion(ADMIN.correo, ADMIN.contrasena)).body.credencialAcceso;
    trabajador = await Test.createTestingModule({ imports: [TrabajadorModule.registrar(configuracion)] })
      .overrideProvider(ADAPTADORES_TRABAJADOR.notificador)
      .useValue(new NotificadorConInterruptor(new NotificadorWhatsApp(proveedor), NotificadorWhatsApp.CANAL))
      .compile();
    sondeo = trabajador.get(ADAPTADORES_TRABAJADOR.sondeo);
  }, 120000);

  afterAll(async () => {
    await trabajador.close();
    await app.close();
    await bd.detener();
  });

  describe('CT-REG-02 · carga del registro legal (SYS-FN-02)', () => {
    it('acepta un PDF de 4 MB y un JPG', async () => {
      expect(conforme('/cuentas', 'post', await registrarPorHttp(app, nueva({ registroLegal: pdfDe(4 * MB) }))).status).toBe(201);
      const jpg = await registrarPorHttp(app, nueva({ registroLegal: JPEG_MINIMO }), { nombreArchivo: 'patente.jpg', tipoDeclarado: 'image/jpeg' });
      expect(jpg.status).toBe(201);
    });

    it('rechaza un archivo de 8 MB con un mensaje explicativo', async () => {
      const respuesta = conforme('/cuentas', 'post', await registrarPorHttp(app, nueva({ registroLegal: pdfDe(8 * MB) })));

      expect(respuesta.status).toBe(413);
      expect(respuesta.body).toEqual({ codigo: 'DOCUMENTO_DEMASIADO_GRANDE', mensaje: 'El documento supera el tamaño máximo de 5 MB.' });
    });

    it('decide el tipo por el contenido y no por la extensión ni el tipo declarado', async () => {
      const disfrazado = new TextEncoder().encode('MZ ejecutable disfrazado de PDF');
      const respuesta = conforme('/cuentas', 'post', await registrarPorHttp(app, nueva({ registroLegal: disfrazado })));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.detalles).toEqual([{ campo: 'registroLegal', mensaje: 'Cargue el documento en formato PDF o JPG.' }]);
    });

    it('exige el documento (DIS-29)', async () => {
      const respuesta = conforme('/cuentas', 'post', await registrarPorHttp(app, nueva({ registroLegal: undefined })));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.detalles).toEqual([{ campo: 'registroLegal', mensaje: 'Adjunte el documento de registro legal (Cédula RUC o patente municipal).' }]);
    });
  });

  describe('SYS-FN-36 · consentimiento para el tratamiento de datos personales', () => {
    it('sin aceptación expresa rechaza el registro', async () => {
      const respuesta = conforme('/cuentas', 'post', await registrarPorHttp(app, nueva({ aceptaConsentimiento: false })));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.detalles).toEqual([{ campo: 'aceptaConsentimiento', mensaje: 'Debe aceptar la declaración de consentimiento para registrarse.' }]);
    });

    it('la aceptación consta en la bitácora con su marca temporal y en la cuenta', async () => {
      const { body } = await registrarPorHttp(app, nueva());

      const asientos = await bitacora(body.id);
      const consentimiento = asientos.find((a) => a.accion === 'CONSENTIMIENTO_ACEPTADO');
      expect(consentimiento?.detalle).toEqual({ version: 'DIS-28 · 2026-10-17', aceptadoEn: expect.any(String) });
      const [cuenta] = await consultar<{ aceptado: Date }>(
        bd.urlPropietario,
        'SELECT consentimiento_aceptado_en AS aceptado FROM m1_usuarios.cuentas_comerciales WHERE id = $1',
        [body.id],
      );
      expect(cuenta.aceptado.toISOString()).toBe(consentimiento?.detalle.aceptadoEn);
    });
  });

  describe('CT-ADM-03 · aprobación y rechazo por el Administrador (SYS-FN-03)', () => {
    it('el Administrador consulta el documento de registro legal de una cuenta', async () => {
      const { body } = await registrarPorHttp(app, nueva());

      const respuesta = await request(app.getHttpServer()).get(`/api/v1/cuentas/${body.id}/registro-legal`).set(comoAdmin()).buffer(true);

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers['content-type']).toBe('application/pdf');
      expect(new Uint8Array(respuesta.body as Buffer)).toEqual(PDF_MINIMO);
    });

    it('aprobar cambia el estado a «Activa» y el resultado consta en la bitácora con el usuario y la IP', async () => {
      const { body } = await registrarPorHttp(app, nueva());

      const respuesta = conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'aprobar' }));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.estado).toBe('Activa');
      const decision = (await bitacora(body.id)).find((a) => a.accion === 'CUENTA_APROBADA');
      expect(decision).toMatchObject({ detalle: { resultado: 'Activa' }, ip: expect.stringMatching(/127\.0\.0\.1/) });
      expect(decision?.usuario_id).toEqual(expect.any(String));
    });

    it('rechazar registra el motivo en la bitácora', async () => {
      const { body } = await registrarPorHttp(app, nueva());

      const respuesta = conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'rechazar', justificacion: 'El documento no corresponde al RUC' }));

      expect(respuesta.body.estado).toBe('Rechazada');
      expect((await bitacora(body.id)).find((a) => a.accion === 'CUENTA_RECHAZADA')?.detalle).toEqual({
        resultado: 'Rechazada',
        justificacion: 'El documento no corresponde al RUC',
      });
    });

    it('rechazar sin motivo, decidir dos veces, una cuenta inexistente o un identificador inválido se rechazan', async () => {
      const { body } = await registrarPorHttp(app, nueva());

      const sinMotivo = conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'rechazar' }));
      expect(sinMotivo.body.detalles).toEqual([{ campo: 'justificacion', mensaje: 'Indique el motivo del rechazo.' }]);

      await validar(body.id, { decision: 'aprobar' });
      const segunda = conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'rechazar', justificacion: 'x' }));
      expect(segunda.status).toBe(409);
      expect(segunda.body).toEqual({ codigo: 'TRANSICION_NO_PERMITIDA', mensaje: 'La cuenta ya fue validada; no admite esta decisión.' });

      const inexistente = conforme('/cuentas/{id}', 'patch', await validar('00000000-0000-4000-8000-00000000ffff', { decision: 'aprobar' }));
      expect(inexistente.status).toBe(404);
      expect(conforme('/cuentas/{id}', 'patch', await validar('no-es-uuid', { decision: 'aprobar' })).status).toBe(400);
      expect(conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'borrar' })).status).toBe(400);
    });

    it('solo el Administrador valida cuentas y consulta documentos (V-03)', async () => {
      const datos = nueva({ tipo: 'Productor' });
      const { body } = await registrarPorHttp(app, datos);
      await validar(body.id, { decision: 'aprobar' });
      const productor = (await iniciarSesion(datos.correo, datos.contrasena)).body.credencialAcceso;
      const comoProductor = { Authorization: `Bearer ${productor}` };

      expect(conforme('/cuentas/{id}', 'patch', await validar(body.id, { decision: 'aprobar' }, comoProductor)).status).toBe(403);
      expect((await request(app.getHttpServer()).get(`/api/v1/cuentas/${body.id}/registro-legal`).set(comoProductor)).status).toBe(403);
      expect((await request(app.getHttpServer()).get(`/api/v1/cuentas/${body.id}/registro-legal`)).status).toBe(401);
    });
  });

  describe('CT-SEG-04 · inicio de sesión con cada uno de los cuatro roles (SYS-FN-04)', () => {
    it.each(['Comprador', 'Proveedor', 'Productor'] as const)('una cuenta aprobada de tipo %s inicia sesión con su rol', async (tipo) => {
      const datos = nueva({ tipo });
      const { body } = await registrarPorHttp(app, datos);
      await validar(body.id, { decision: 'aprobar' });

      const sesion = await iniciarSesion(datos.correo, datos.contrasena);
      const identidad = await request(app.getHttpServer()).get('/api/v1/sesiones/actual').set('Authorization', `Bearer ${sesion.body.credencialAcceso}`);

      expect(sesion.body.rol).toBe(tipo);
      expect(identidad.body).toEqual({ rol: tipo, cuentaId: body.id });
    });

    it('el Administrador inicia sesión con su rol', async () => {
      expect((await iniciarSesion(ADMIN.correo, ADMIN.contrasena)).body.rol).toBe('Administrador');
    });

    it('una cuenta rechazada no inicia sesión (DIS-25)', async () => {
      const datos = nueva();
      const { body } = await registrarPorHttp(app, datos);
      await validar(body.id, { decision: 'rechazar', justificacion: 'Documento ilegible' });

      const respuesta = await iniciarSesion(datos.correo, datos.contrasena);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toEqual({ codigo: 'CUENTA_RECHAZADA', mensaje: 'Su solicitud de cuenta fue rechazada.' });
    });
  });

  // Criterio de salida de IT-02 (D4 §2.13): «Una cuenta se registra, carga su
  // registro legal, es aprobada o rechazada por el rol administrativo y la
  // decisión consta en la bitácora sin posibilidad de modificación».
  describe('IT-02 · criterio de salida', () => {
    it('registro con documento, decisión administrativa, asiento inmutable y aviso al solicitante', async () => {
      const datos = nueva({ telefonoMovil: '+50588001122' });
      const { body } = await registrarPorHttp(app, datos);
      await validar(body.id, { decision: 'rechazar', justificacion: 'El RUC no coincide con el documento' });

      const asientos = await bitacora(body.id);
      expect(asientos.map((a) => a.accion).sort()).toEqual(['CONSENTIMIENTO_ACEPTADO', 'CUENTA_RECHAZADA', 'CUENTA_REGISTRADA', 'REGISTRO_LEGAL_CARGADO']);
      expect(asientos.at(-1)?.accion).toBe('CUENTA_RECHAZADA');

      // Sin posibilidad de modificación: el rol de la aplicación no puede alterar ni borrar el asiento (ADR-05).
      await expect(
        consultar(bd.urlApp, "UPDATE m9_administracion.bitacora SET detalle = '{}' WHERE recurso_id = $1", [body.id]),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(consultar(bd.urlApp, 'DELETE FROM m9_administracion.bitacora WHERE recurso_id = $1', [body.id])).rejects.toMatchObject({
        code: '42501',
      });
      expect(await bitacora(body.id)).toEqual(asientos);

      // El trabajador avisa la decisión al solicitante (D1 PM-01; DIS-30).
      proveedor.entregados.length = 0;
      await sondeo.procesarLote();
      await sondeo.procesarLote();
      expect(proveedor.entregados).toContainEqual({
        telefonoMovil: '+50588001122',
        texto: mensajeCuentaRechazada('El RUC no coincide con el documento'),
      });
      expect(mensajeCuentaRechazada('Motivo con punto final.')).toBe('AbasteceNi: su solicitud de cuenta fue rechazada. Motivo: Motivo con punto final.');
      expect(MENSAJE_CUENTA_APROBADA).toBe('AbasteceNi: su cuenta comercial fue aprobada. Ya puede iniciar sesión.');
    });
  });
});
