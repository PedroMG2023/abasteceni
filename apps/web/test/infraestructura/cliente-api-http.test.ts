// @vitest-environment node
// El cliente HTTP no usa el DOM: con las clases nativas de Node, Blob, File y
// FormData son coherentes entre sí, como en el navegador.
import { describe, expect, it } from 'vitest';
import { crearClienteApiHttp } from '../../src/infraestructura/cliente-api-http';
import { ErrorApi } from '../../src/puertos/cliente-api';

interface Peticion {
  metodo: string;
  ruta: string;
  autorizacion: string | null;
  cuerpo: unknown;
}

// Servidor falso que responde por método y ruta, y registra lo que recibe.
function servidorFalso(respuestas: Record<string, [number, unknown?]>) {
  const recibidas: Peticion[] = [];
  const fetchFalso: typeof fetch = async (entrada) => {
    const peticion = entrada as Request;
    const ruta = new URL(peticion.url).pathname;
    const texto = await peticion.text();
    const esJson = (peticion.headers.get('Content-Type') ?? '').includes('json');
    recibidas.push({ metodo: peticion.method, ruta, autorizacion: peticion.headers.get('Authorization'), cuerpo: texto && esJson ? JSON.parse(texto) : texto || undefined });
    const consulta = [...new URL(peticion.url).searchParams].map(([clave, valor]) => `${clave}=${valor}`).join('&');
    const [estado, cuerpo] = respuestas[`${peticion.method} ${ruta}${consulta ? `?${consulta}` : ''}`] ?? [404, { codigo: 'NO_ENCONTRADO', mensaje: 'x' }];
    if (cuerpo instanceof Blob) return new Response(cuerpo, { status: estado, headers: { 'Content-Type': cuerpo.type } });
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
  };
  return { cliente: crearClienteApiHttp('http://localhost/api/v1', fetchFalso), recibidas };
}

const SESION = { credencialAcceso: 'firmada', tipo: 'Bearer', expiraEnSegundos: 900, rol: 'Administrador' };

describe('Cliente HTTP generado del contrato (PA-07, AS-11)', () => {
  it('consulta GET /api/v1/salud y convierte una respuesta de error en ErrorApi', async () => {
    const { cliente } = servidorFalso({ 'GET /api/v1/salud': [200, { estado: 'operativo' }] });
    await expect(cliente.consultarSalud()).resolves.toEqual({ estado: 'operativo' });

    const caido = servidorFalso({ 'GET /api/v1/salud': [429, { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'límite' }] });
    await expect(caido.cliente.consultarSalud()).rejects.toEqual(new ErrorApi(429, { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'límite' }));
  });

  it('registra una cuenta con POST /api/v1/cuentas en multipart/form-data, con el documento', async () => {
    const { cliente, recibidas } = servidorFalso({ 'POST /api/v1/cuentas': [201, { id: 'x', estado: 'Pendiente de validación' }] });
    const solicitud = {
      tipo: 'Comprador',
      razonSocial: 'F',
      ruc: 'J0310000000001',
      departamento: 'C',
      municipio: 'E',
      rubro: 'F',
      telefonoMovil: '+50588887777',
      correo: 'a@b.ni',
      contrasena: 'una-clave-de-doce',
      aceptaConsentimiento: true,
      registroLegal: new File(['%PDF-1.4'], 'registro.pdf', { type: 'application/pdf' }),
    } as const;

    await expect(cliente.registrarCuenta(solicitud)).resolves.toEqual({ id: 'x', estado: 'Pendiente de validación' });
    expect(recibidas[0]).toMatchObject({ metodo: 'POST', ruta: '/api/v1/cuentas' });
    const cuerpo = String(recibidas[0].cuerpo);
    expect(cuerpo).toContain('name="aceptaConsentimiento"');
    expect(cuerpo).toContain('filename="registro.pdf"');
    expect(cuerpo).toContain('%PDF-1.4');

    const conflicto = servidorFalso({ 'POST /api/v1/cuentas': [409, { codigo: 'RUC_REGISTRADO', mensaje: 'm' }] });
    await expect(conflicto.cliente.registrarCuenta(solicitud)).rejects.toBeInstanceOf(ErrorApi);
  });

  it('guarda la credencial de acceso en memoria, la usa como Bearer y la descarta al cerrar sesión', async () => {
    const { cliente, recibidas } = servidorFalso({
      'POST /api/v1/sesiones': [201, SESION],
      'GET /api/v1/sesiones/actual': [200, { rol: 'Administrador', cuentaId: null }],
      'DELETE /api/v1/sesiones/actual': [204],
    });

    await expect(cliente.iniciarSesion({ correo: 'a@b.ni', contrasena: 'x' })).resolves.toEqual({ rol: 'Administrador', cuentaId: null });
    await cliente.cerrarSesion();

    expect(recibidas.map((r) => [r.metodo, r.ruta, r.autorizacion])).toEqual([
      ['POST', '/api/v1/sesiones', null],
      ['GET', '/api/v1/sesiones/actual', 'Bearer firmada'],
      ['DELETE', '/api/v1/sesiones/actual', 'Bearer firmada'],
    ]);
  });

  it('renueva la sesión con la cookie y propaga los rechazos', async () => {
    const { cliente } = servidorFalso({
      'POST /api/v1/sesiones/renovacion': [201, SESION],
      'GET /api/v1/sesiones/actual': [200, { rol: 'Administrador', cuentaId: null }],
    });
    await expect(cliente.renovarSesion()).resolves.toEqual({ rol: 'Administrador', cuentaId: null });

    const sinCookie = servidorFalso({ 'POST /api/v1/sesiones/renovacion': [401, { codigo: 'RENOVACION_INVALIDA', mensaje: 'm' }] });
    await expect(sinCookie.cliente.renovarSesion()).rejects.toMatchObject({ estado: 401 });

    const rechazada = servidorFalso({ 'POST /api/v1/sesiones': [403, { codigo: 'CUENTA_PENDIENTE', mensaje: 'm' }] });
    await expect(rechazada.cliente.iniciarSesion({ correo: 'a@b.ni', contrasena: 'x' })).rejects.toMatchObject({ estado: 403 });

    const sinIdentidad = servidorFalso({ 'POST /api/v1/sesiones': [201, SESION], 'GET /api/v1/sesiones/actual': [401, undefined] });
    await expect(sinIdentidad.cliente.iniciarSesion({ correo: 'a@b.ni', contrasena: 'x' })).rejects.toMatchObject({ estado: 401, cuerpo: { codigo: 'SIN_RESPUESTA' } });
  });
});

describe('Cliente HTTP — operaciones del Administrador (SYS-FN-03)', () => {
  const RESUMEN = { id: 'c-1', estado: 'Activa' };

  it('lista, valida y descarga el documento con la credencial de acceso', async () => {
    const { cliente, recibidas } = servidorFalso({
      'POST /api/v1/sesiones': [201, SESION],
      'GET /api/v1/sesiones/actual': [200, { rol: 'Administrador', cuentaId: null }],
      'GET /api/v1/cuentas?estado=Pendiente de validación': [200, [RESUMEN]],
      'GET /api/v1/cuentas': [200, []],
      'PATCH /api/v1/cuentas/c-1': [200, RESUMEN],
      'GET /api/v1/cuentas/c-1/registro-legal': [200, new Blob(['%PDF-1.4'], { type: 'application/pdf' })],
    });
    await cliente.iniciarSesion({ correo: 'a@b.ni', contrasena: 'x' });

    await expect(cliente.listarCuentas('Pendiente de validación')).resolves.toEqual([RESUMEN]);
    await expect(cliente.listarCuentas()).resolves.toEqual([]);
    await expect(cliente.validarCuenta('c-1', { decision: 'aprobar' })).resolves.toEqual(RESUMEN);
    const documento = await cliente.obtenerRegistroLegal('c-1');
    expect(await documento.text()).toBe('%PDF-1.4');
    expect(recibidas.slice(2).every((r) => r.autorizacion === 'Bearer firmada')).toBe(true);
    expect(recibidas.find((r) => r.metodo === 'PATCH')?.cuerpo).toEqual({ decision: 'aprobar' });
  });

  it('propaga los rechazos de esas operaciones como ErrorApi', async () => {
    const { cliente } = servidorFalso({});
    await expect(cliente.listarCuentas()).rejects.toMatchObject({ estado: 404 });
    await expect(cliente.validarCuenta('c-1', { decision: 'aprobar' })).rejects.toMatchObject({ estado: 404 });
    await expect(cliente.obtenerRegistroLegal('c-1')).rejects.toMatchObject({ estado: 404 });
  });

  it('CT-SEG-05 · solicita el enlace y restablece la contraseña devolviendo el aviso de la API (SYS-FN-05)', async () => {
    const { cliente, recibidas } = servidorFalso({
      'POST /api/v1/sesiones/recuperacion': [202, { mensaje: 'aviso de solicitud' }],
      'POST /api/v1/sesiones/recuperacion/restablecimiento': [200, { mensaje: 'aviso de restablecimiento' }],
    });

    await expect(cliente.solicitarRecuperacion('a@b.ni')).resolves.toBe('aviso de solicitud');
    await expect(cliente.restablecerContrasena({ secreto: 's', contrasena: 'una-clave-nueva-y-larga' })).resolves.toBe('aviso de restablecimiento');
    expect(recibidas.map((r) => r.cuerpo)).toEqual([{ correo: 'a@b.ni' }, { secreto: 's', contrasena: 'una-clave-nueva-y-larga' }]);

    const vencido = servidorFalso({ 'POST /api/v1/sesiones/recuperacion/restablecimiento': [410, { codigo: 'ENLACE_VENCIDO', mensaje: 'venció' }] });
    await expect(vencido.cliente.restablecerContrasena({ secreto: 's', contrasena: 'x' })).rejects.toEqual(
      new ErrorApi(410, { codigo: 'ENLACE_VENCIDO', mensaje: 'venció' }),
    );
    const invalido = servidorFalso({ 'POST /api/v1/sesiones/recuperacion': [400, { codigo: 'SOLICITUD_INVALIDA', mensaje: 'revise' }] });
    await expect(invalido.cliente.solicitarRecuperacion('x')).rejects.toBeInstanceOf(ErrorApi);
  });
});
