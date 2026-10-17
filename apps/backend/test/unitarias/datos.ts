import type { SolicitudRegistro } from '../../src/dominio/m1-usuarios';

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
    ...cambios,
  };
}
