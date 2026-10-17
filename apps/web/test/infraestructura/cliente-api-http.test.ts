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
    recibidas.push({ metodo: peticion.method, ruta, autorizacion: peticion.headers.get('Authorization'), cuerpo: texto ? JSON.parse(texto) : undefined });
    const [estado, cuerpo] = respuestas[`${peticion.method} ${ruta}`] ?? [404, { codigo: 'NO_ENCONTRADO', mensaje: 'x' }];
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

  it('registra una cuenta con POST /api/v1/cuentas', async () => {
    const { cliente, recibidas } = servidorFalso({ 'POST /api/v1/cuentas': [201, { id: 'x', estado: 'Pendiente de validación' }] });
    const solicitud = { tipo: 'Comprador', razonSocial: 'F', ruc: 'J0310000000001', departamento: 'C', municipio: 'E', rubro: 'F', telefonoMovil: '+50588887777', correo: 'a@b.ni', contrasena: 'una-clave-de-doce' } as const;

    await expect(cliente.registrarCuenta(solicitud)).resolves.toEqual({ id: 'x', estado: 'Pendiente de validación' });
    expect(recibidas[0]).toMatchObject({ metodo: 'POST', ruta: '/api/v1/cuentas', cuerpo: solicitud });

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
