import { describe, expect, it } from 'vitest';
import { crearClienteApiHttp } from '../../src/infraestructura/cliente-api-http';
import { ErrorApi } from '../../src/puertos/cliente-api';

function fetchFalso(estado: number, cuerpo: unknown): typeof fetch {
  return async (entrada) => {
    const peticion = entrada as Request;
    expect(new URL(peticion.url).pathname).toBe('/api/v1/salud');
    return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
  };
}

describe('Cliente HTTP generado del contrato (PA-07)', () => {
  it('consulta GET /api/v1/salud y devuelve el cuerpo tipado', async () => {
    const cliente = crearClienteApiHttp('http://localhost/api/v1', fetchFalso(200, { estado: 'operativo' }));
    await expect(cliente.consultarSalud()).resolves.toEqual({ estado: 'operativo' });
  });

  it('convierte una respuesta de error del contrato en ErrorApi', async () => {
    const cuerpo = { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Se superó el límite de peticiones.' };
    const cliente = crearClienteApiHttp('http://localhost/api/v1', fetchFalso(429, cuerpo));
    await expect(cliente.consultarSalud()).rejects.toEqual(new ErrorApi(429, cuerpo));
  });
});
