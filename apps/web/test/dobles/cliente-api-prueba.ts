import type {
  ClienteApi,
  CuentaRegistrada,
  EstadoCuenta,
  Identidad,
  ResumenCuenta,
  Salud,
  SolicitudInicioSesion,
  SolicitudRegistroCuenta,
  SolicitudRestablecimiento,
  ValidacionCuenta,
} from '../../src/puertos/cliente-api';

export const CUENTA_PENDIENTE: ResumenCuenta = {
  id: '7f3c9a7e-2b1d-4c55-9a8e-2f1b6c0d9e11',
  tipo: 'Comprador',
  razonSocial: 'Farmacia San Benito',
  ruc: 'J0310000000001',
  departamento: 'Chinandega',
  municipio: 'El Viejo',
  rubro: 'Farmacia',
  estado: 'Pendiente de validación',
  registradaEn: '2026-10-17T12:00:00.000Z',
  consentimientoAceptadoEn: '2026-10-17T12:00:00.000Z',
  registroLegalTipo: 'application/pdf',
};

// Implementación de prueba del puerto ClienteApi (AS-11): intercambiable con la
// HTTP sin cambios en hooks ni componentes. Cada respuesta puede ser un valor o
// un error que se lanza.
export class ClienteApiPrueba implements ClienteApi {
  salud: Salud | Error = { estado: 'operativo' };
  registro: CuentaRegistrada | Error = { id: '7f3c9a7e-2b1d-4c55-9a8e-2f1b6c0d9e11', estado: 'Pendiente de validación' };
  sesion: Identidad | Error = { rol: 'Administrador', cuentaId: null };
  renovacion: Identidad | Error = new Error('sin sesión previa');
  cuentas: ResumenCuenta[] | Error = [CUENTA_PENDIENTE];
  validacion: ResumenCuenta | Error | null = null;
  documento: Blob | Error = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  recuperacion: string | Error = 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Vence en 15 minutos.';
  restablecimiento: string | Error = 'Su contraseña fue restablecida. Inicie sesión con la nueva contraseña.';
  readonly llamadas: { operacion: string; datos?: unknown }[] = [];

  private responder<T>(operacion: string, respuesta: T | Error, datos?: unknown): Promise<T> {
    this.llamadas.push({ operacion, datos });
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta);
  }

  consultarSalud(): Promise<Salud> {
    return this.responder('consultarSalud', this.salud);
  }

  registrarCuenta(solicitud: SolicitudRegistroCuenta): Promise<CuentaRegistrada> {
    return this.responder('registrarCuenta', this.registro, solicitud);
  }

  iniciarSesion(datos: SolicitudInicioSesion): Promise<Identidad> {
    return this.responder('iniciarSesion', this.sesion, datos);
  }

  renovarSesion(): Promise<Identidad> {
    return this.responder('renovarSesion', this.renovacion);
  }

  cerrarSesion(): Promise<void> {
    return this.responder('cerrarSesion', undefined);
  }

  solicitarRecuperacion(correo: string): Promise<string> {
    return this.responder('solicitarRecuperacion', this.recuperacion, correo);
  }

  restablecerContrasena(datos: SolicitudRestablecimiento): Promise<string> {
    return this.responder('restablecerContrasena', this.restablecimiento, datos);
  }

  listarCuentas(estado?: EstadoCuenta): Promise<ResumenCuenta[]> {
    return this.responder('listarCuentas', this.cuentas, estado);
  }

  validarCuenta(id: string, validacion: ValidacionCuenta): Promise<ResumenCuenta> {
    const resultado = this.validacion ?? { ...CUENTA_PENDIENTE, id, estado: validacion.decision === 'aprobar' ? 'Activa' : 'Rechazada' };
    return this.responder('validarCuenta', resultado as ResumenCuenta | Error, { id, ...validacion });
  }

  obtenerRegistroLegal(id: string): Promise<Blob> {
    return this.responder('obtenerRegistroLegal', this.documento, id);
  }
}
