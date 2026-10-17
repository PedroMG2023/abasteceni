import createClient from 'openapi-fetch';
import type { paths } from '@abasteceni/contrato';
import { ErrorApi, type ClienteApi, type ErrorRespuesta } from '../puertos/cliente-api';

const ERROR_SIN_CUERPO: ErrorRespuesta = {
  codigo: 'SIN_RESPUESTA',
  mensaje: 'El servicio no respondió como se esperaba.',
};

// Implementación HTTP del puerto ClienteApi, tipada con el contrato (PA-07).
// Solo contexto/ la construye (regla web-cliente-abstracto).
export function crearClienteApiHttp(baseUrl = '/api/v1', fetchImpl: typeof fetch = fetch): ClienteApi {
  const http = createClient<paths>({ baseUrl, fetch: fetchImpl });

  return {
    async consultarSalud() {
      const { data, error, response } = await http.GET('/salud');
      if (!data) throw new ErrorApi(response.status, (error as ErrorRespuesta | undefined) ?? ERROR_SIN_CUERPO);
      return data;
    },
  };
}
