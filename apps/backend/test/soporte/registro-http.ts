import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { SolicitudRegistro } from '../../src/dominio/m1-usuarios';

// POST /api/v1/cuentas en multipart/form-data, como lo envía la interfaz (contrato).
export function registrarPorHttp(
  app: INestApplication,
  solicitud: Partial<SolicitudRegistro>,
  opciones: { nombreArchivo?: string; tipoDeclarado?: string } = {},
) {
  const { registroLegal, aceptaConsentimiento, ...campos } = solicitud;
  let peticion = request(app.getHttpServer()).post('/api/v1/cuentas');
  for (const [campo, valor] of Object.entries(campos)) peticion = peticion.field(campo, String(valor));
  if (aceptaConsentimiento !== undefined) peticion = peticion.field('aceptaConsentimiento', String(aceptaConsentimiento));
  if (registroLegal) {
    peticion = peticion.attach('registroLegal', Buffer.from(registroLegal), {
      filename: opciones.nombreArchivo ?? 'registro.pdf',
      contentType: opciones.tipoDeclarado ?? 'application/pdf',
    });
  }
  return peticion;
}
