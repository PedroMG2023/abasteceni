import createClient from 'openapi-fetch';
import type { paths } from '@abasteceni/contrato';
import { ErrorApi, type ClienteApi, type ErrorRespuesta, type Identidad } from '../puertos/cliente-api';

const ERROR_SIN_CUERPO: ErrorRespuesta = {
  codigo: 'SIN_RESPUESTA',
  mensaje: 'El servicio no respondió como se esperaba.',
};

// Implementación HTTP del puerto ClienteApi, tipada con el contrato (PA-07).
// Solo contexto/ la construye (regla web-cliente-abstracto).
export function crearClienteApiHttp(baseUrl = '/api/v1', fetchImpl: typeof fetch = (...a) => fetch(...a)): ClienteApi {
  const http = createClient<paths>({ baseUrl, fetch: fetchImpl, credentials: 'same-origin' });
  let credencialAcceso: string | null = null;

  // Una respuesta de error sin cuerpo JSON llega como texto vacío.
  const fallo = (estado: number, error: unknown) =>
    new ErrorApi(estado, error && typeof error === 'object' ? (error as ErrorRespuesta) : ERROR_SIN_CUERPO);
  const autorizacion = () => ({ Authorization: `Bearer ${credencialAcceso ?? ''}` });

  async function identidadActual(): Promise<Identidad> {
    const { data, error, response } = await http.GET('/sesiones/actual', { headers: autorizacion() });
    if (!data) throw fallo(response.status, error);
    return data;
  }

  return {
    async consultarSalud() {
      const { data, error, response } = await http.GET('/salud');
      if (!data) throw fallo(response.status, error);
      return data;
    },

    async registrarCuenta(solicitud) {
      const formulario = new FormData();
      for (const [campo, valor] of Object.entries(solicitud)) {
        formulario.append(campo, valor instanceof Blob ? valor : String(valor));
      }
      const { data, error, response } = await http.POST('/cuentas', {
        body: solicitud as never,
        bodySerializer: () => formulario,
      });
      if (!data) throw fallo(response.status, error);
      return data;
    },

    async iniciarSesion(datos) {
      const { data, error, response } = await http.POST('/sesiones', { body: datos });
      if (!data) throw fallo(response.status, error);
      credencialAcceso = data.credencialAcceso;
      return identidadActual();
    },

    async renovarSesion() {
      const { data, error, response } = await http.POST('/sesiones/renovacion');
      if (!data) throw fallo(response.status, error);
      credencialAcceso = data.credencialAcceso;
      return identidadActual();
    },

    async cerrarSesion() {
      await http.DELETE('/sesiones/actual', { headers: autorizacion() });
      credencialAcceso = null;
    },

    async listarCuentas(estado) {
      const { data, error, response } = await http.GET('/cuentas', { headers: autorizacion(), params: { query: estado ? { estado } : {} } });
      if (!data) throw fallo(response.status, error);
      return data;
    },

    async validarCuenta(id, validacion) {
      const { data, error, response } = await http.PATCH('/cuentas/{id}', { headers: autorizacion(), params: { path: { id } }, body: validacion });
      if (!data) throw fallo(response.status, error);
      return data;
    },

    async obtenerRegistroLegal(id) {
      const { data, error, response } = await http.GET('/cuentas/{id}/registro-legal', {
        headers: autorizacion(),
        params: { path: { id } },
        parseAs: 'blob',
      });
      if (!data) throw fallo(response.status, error);
      return data as Blob;
    },
  };
}
