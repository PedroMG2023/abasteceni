import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import { UNIDAD_TRABAJO } from '../../src/composicion/infraestructura-comun';
import type { ServicioSeguridad } from '../../src/dominio/m2-seguridad';
import type { PuertoUnidadTrabajo } from '../../src/dominio/puertos';
import { RelojFijo } from '../dobles/sistema';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { validarRespuesta } from '../soporte/contrato';
import { solicitudValida } from '../unitarias/datos';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };

function conforme(ruta: string, metodo: string, respuesta: Response): Response {
  validarRespuesta(ruta, metodo, respuesta.status, respuesta.status === 204 ? undefined : respuesta.body);
  return respuesta;
}

function cookieRenovacion(respuesta: Response): string {
  const cookies = ([] as string[]).concat(respuesta.headers['set-cookie'] ?? []);
  const cookie = cookies.find((c) => c.startsWith('abasteceni_renovacion='));
  if (!cookie) throw new Error('La respuesta no fijó la cookie de renovación.');
  return cookie;
}

describe('API de cuentas y sesiones (IT-01) conforme al contrato', () => {
  let bd: BaseDatosPrueba;
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    app = await crearApiPrueba(configuracionPrueba(bd.urlApp));
    await app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad).registrarAdministrador(ADMIN);
  }, 120000);

  afterAll(async () => {
    await app.close();
    await bd.detener();
  });

  const iniciarSesion = async (datos: { correo: string; contrasena: string }) =>
    conforme('/sesiones', 'post', await http().post('/api/v1/sesiones').send(datos));

  describe('CT-REG-01 · POST /api/v1/cuentas (SYS-FN-01)', () => {
    it('registra la cuenta con todos los campos válidos en estado «Pendiente de validación»', async () => {
      const respuesta = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send(solicitudValida()));

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.estado).toBe('Pendiente de validación');
      const [fila] = await consultar(bd.urlPropietario, 'SELECT estado, ruc FROM m1_usuarios.cuentas_comerciales WHERE id = $1', [respuesta.body.id]);
      expect(fila).toEqual({ estado: 'Pendiente de validación', ruc: 'J0310000000001' });
      expect(JSON.stringify(respuesta.body)).not.toContain('contrasena');
    });

    it('con el RUC vacío rechaza el envío con un mensaje de error', async () => {
      const respuesta = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send(solicitudValida({ ruc: '' })));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body).toEqual({
        codigo: 'SOLICITUD_INVALIDA',
        mensaje: 'Revise los datos marcados.',
        detalles: [{ campo: 'ruc', mensaje: 'Indique el RUC.' }],
      });
    });

    it('rechaza el formato de RUC inválido con un mensaje que indica el formato (DIS-21)', async () => {
      const respuesta = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send(solicitudValida({ ruc: '12345' })));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.detalles).toEqual([
        { campo: 'ruc', mensaje: 'El RUC debe tener 14 caracteres: «J» y 13 dígitos, o 13 dígitos y una letra, sin guiones.' },
      ]);
    });

    it('rechaza propiedades no declaradas en el contrato y un cuerpo mal formado', async () => {
      const extra = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send({ ...solicitudValida(), rol: 'Administrador' }));
      expect(extra.status).toBe(400);
      expect(extra.body.detalles).toEqual([{ campo: 'rol', mensaje: 'El valor de el campo rol no es válido.' }]);

      const malFormado = await http().post('/api/v1/cuentas').set('Content-Type', 'application/json').send('{"tipo":');
      expect(malFormado.status).toBe(400);
      expect(malFormado.body.codigo).toBe('SOLICITUD_INVALIDA');
    });

    it('responde 409 ante un RUC o un correo ya registrados', async () => {
      const ruc = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send(solicitudValida({ correo: 'otra@farmacia.ni' })));
      expect(ruc.status).toBe(409);
      expect(ruc.body).toEqual({ codigo: 'RUC_REGISTRADO', mensaje: 'Ya existe una cuenta registrada con ese RUC.' });

      const correo = conforme('/cuentas', 'post', await http().post('/api/v1/cuentas').send(solicitudValida({ ruc: 'J0310000000009' })));
      expect(correo.status).toBe(409);
      expect(correo.body.codigo).toBe('CORREO_REGISTRADO');
    });
  });

  describe('CT-SEG-04 · POST /api/v1/sesiones (SYS-FN-04, ADR-04)', () => {
    it('el Administrador inicia sesión con su rol y recibe la credencial de renovación en una cookie protegida', async () => {
      const respuesta = await iniciarSesion(ADMIN);

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({ tipo: 'Bearer', expiraEnSegundos: 900, rol: 'Administrador' });
      const cookie = cookieRenovacion(respuesta);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/v1\/sesiones/);
      expect(cookie).toMatch(/Max-Age=604800/);
    });

    it('una cuenta «Pendiente de validación» recibe 403 con el mensaje aprobado (DIS-25)', async () => {
      const respuesta = await iniciarSesion({ correo: 'compras@farmaciasanbenito.com.ni', contrasena: 'una-clave-de-doce' });

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toEqual({ codigo: 'CUENTA_PENDIENTE', mensaje: 'Su cuenta está pendiente de validación.' });
    });

    it('una contraseña incorrecta recibe 401 sin revelar si el correo existe', async () => {
      const incorrecta = await iniciarSesion({ correo: ADMIN.correo, contrasena: 'no-es-la-clave' });
      const inexistente = await iniciarSesion({ correo: 'nadie@empresa.ni', contrasena: 'no-es-la-clave' });

      expect(incorrecta.status).toBe(401);
      expect(inexistente.body).toEqual(incorrecta.body);
      expect(incorrecta.body).toEqual({ codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.' });
    });
  });

  describe('ADR-04 · renovación con rotación, identidad y cierre de sesión', () => {
    it('renueva con la cookie, rota la credencial y rechaza la cookie ya usada', async () => {
      const cookie = cookieRenovacion(await iniciarSesion(ADMIN));

      const renovada = conforme('/sesiones/renovacion', 'post', await http().post('/api/v1/sesiones/renovacion').set('Cookie', cookie));
      expect(renovada.status).toBe(201);
      expect(cookieRenovacion(renovada)).not.toBe(cookie);

      const reutilizada = conforme('/sesiones/renovacion', 'post', await http().post('/api/v1/sesiones/renovacion').set('Cookie', cookie));
      expect(reutilizada.status).toBe(401);
      expect(reutilizada.body.codigo).toBe('RENOVACION_INVALIDA');

      const sinCookie = conforme('/sesiones/renovacion', 'post', await http().post('/api/v1/sesiones/renovacion'));
      expect(sinCookie.status).toBe(401);
    });

    it('consulta la identidad con la credencial de acceso y cierra la sesión revocando la renovación', async () => {
      const sesion = await iniciarSesion(ADMIN);
      const autorizacion = `Bearer ${sesion.body.credencialAcceso}`;

      const actual = conforme('/sesiones/actual', 'get', await http().get('/api/v1/sesiones/actual').set('Authorization', autorizacion));
      expect(actual.body).toEqual({ rol: 'Administrador', cuentaId: null });

      const cierre = conforme('/sesiones/actual', 'delete', await http().delete('/api/v1/sesiones/actual').set('Authorization', autorizacion));
      expect(cierre.status).toBe(204);

      const tras = await http().post('/api/v1/sesiones/renovacion').set('Cookie', cookieRenovacion(sesion));
      expect(tras.status).toBe(401);
    });
  });

  describe('AS-03 · autenticación y control de rol como envolturas de la capa 2', () => {
    it('401 sin credencial o con una credencial alterada', async () => {
      const sin = conforme('/cuentas', 'get', await http().get('/api/v1/cuentas'));
      expect(sin.status).toBe(401);
      expect(sin.body).toEqual({ codigo: 'ACCESO_INVALIDO', mensaje: 'Inicie sesión para continuar.' });

      const sesion = await iniciarSesion(ADMIN);
      const alterada = await http().get('/api/v1/cuentas').set('Authorization', `Bearer ${sesion.body.credencialAcceso}x`);
      expect(alterada.status).toBe(401);
    });

    it('403 cuando el rol no es el exigido', async () => {
      const registro = await http().post('/api/v1/cuentas').send(
        solicitudValida({ tipo: 'Proveedor', ruc: 'J0310000000002', correo: 'ventas@distribuidora.ni' }),
      );
      const seguridad = app.get<ServicioSeguridad>(SIMBOLOS.servicioSeguridad);
      await app.get<PuertoUnidadTrabajo>(UNIDAD_TRABAJO).ejecutar((tx) => seguridad.cambiarHabilitacion(registro.body.id, 'habilitada', tx));
      const sesion = await iniciarSesion({ correo: 'ventas@distribuidora.ni', contrasena: 'una-clave-de-doce' });
      expect(sesion.body.rol).toBe('Proveedor');

      const respuesta = conforme('/cuentas', 'get', await http().get('/api/v1/cuentas').set('Authorization', `Bearer ${sesion.body.credencialAcceso}`));

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toEqual({ codigo: 'PROHIBIDO', mensaje: 'No tiene permiso para realizar esta operación.' });
    });

    it('el Administrador lista las cuentas y puede filtrarlas por estado', async () => {
      const sesion = await iniciarSesion(ADMIN);
      const autorizacion = `Bearer ${sesion.body.credencialAcceso}`;

      const todas = conforme('/cuentas', 'get', await http().get('/api/v1/cuentas').set('Authorization', autorizacion));
      expect(todas.status).toBe(200);
      expect(todas.body.map((c: { ruc: string }) => c.ruc)).toEqual(['J0310000000001', 'J0310000000002']);

      const pendientes = await http().get('/api/v1/cuentas').query({ estado: 'Activa' }).set('Authorization', autorizacion);
      expect(pendientes.body).toEqual([]);

      const invalido = conforme('/cuentas', 'get', await http().get('/api/v1/cuentas').query({ estado: 'Borrada' }).set('Authorization', autorizacion));
      expect(invalido.status).toBe(400);
    });
  });
});

describe('AS-03 · 429 a partir de la petición 121 por IP y minuto, con el contador compartido entre instancias (SYS-NFN-03, ADR-08)', () => {
  let bd: BaseDatosPrueba;
  let instancias: INestApplication[];

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    const reloj = new RelojFijo(new Date('2026-10-17T12:00:05.000Z'));
    const conReloj = () => crearApiPrueba(configuracionPrueba(bd.urlApp), (c) => c.overrideProvider(SIMBOLOS.reloj).useValue(reloj));
    instancias = [await conReloj(), await conReloj()];
  }, 120000);

  afterAll(async () => {
    await Promise.all(instancias.map((i) => i.close()));
    await bd.detener();
  });

  it('dos instancias suman en el mismo contador y la petición 121 recibe 429 con Retry-After', async () => {
    const estados: number[] = [];
    for (let n = 0; n < 120; n++) {
      estados.push((await request(instancias[n % 2].getHttpServer()).get('/api/v1/salud')).status);
    }
    expect(estados.filter((e) => e !== 200)).toEqual([]);

    for (const instancia of instancias) {
      const respuesta = conforme('/salud', 'get', await request(instancia.getHttpServer()).get('/api/v1/salud'));
      expect(respuesta.status).toBe(429);
      expect(respuesta.headers['retry-after']).toBe('55');
      expect(respuesta.body).toEqual({ codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Se superó el límite de peticiones. Intente de nuevo en un minuto.' });
    }
    const [fila] = await consultar(bd.urlPropietario, 'SELECT count(*)::int AS ventanas, max(cuenta) AS cuenta FROM plataforma.contador_peticiones');
    expect(fila).toEqual({ ventanas: 1, cuenta: 122 });
  });
});
