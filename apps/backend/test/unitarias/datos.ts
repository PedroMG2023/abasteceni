import type { RegistroLegal, SolicitudRegistro } from '../../src/dominio/m1-usuarios';

// Documentos mínimos reconocibles por su contenido (SYS-FN-02).
export const PDF_MINIMO = new TextEncoder().encode('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
export const JPEG_MINIMO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
export const REGISTRO_LEGAL: RegistroLegal = { clave: '00000000-0000-4000-8000-0000000000d0', tipo: 'application/pdf' };

// Solicitud válida de referencia: farmacia del escenario A de D2 §2.6.
export function solicitudValida(cambios: Partial<SolicitudRegistro> = {}): SolicitudRegistro {
  return {
    tipo: 'Comprador',
    razonSocial: 'Farmacia San Benito',
    ruc: 'J0310000000001',
    departamento: 'Chinandega',
    municipio: 'El Viejo',
    rubro: 'Farmacia',
    telefonoMovil: '+50588887777',
    correo: 'compras@farmaciasanbenito.com.ni',
    contrasena: 'una-clave-de-doce',
    aceptaConsentimiento: true,
    registroLegal: PDF_MINIMO,
    ...cambios,
  };
}

export const CONTEXTO_ANONIMO = { usuarioId: null, ip: '203.0.113.10' };
export const CONTEXTO_ADMINISTRADOR = { usuarioId: '00000000-0000-4000-8000-0000000000a1', ip: '198.51.100.20' };
