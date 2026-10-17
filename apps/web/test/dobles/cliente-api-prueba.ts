import type {
  ClienteApi,
  CuentaRegistrada,
  Identidad,
  Salud,
  SolicitudInicioSesion,
  SolicitudRegistroCuenta,
} from '../../src/puertos/cliente-api';

// Implementación de prueba del puerto ClienteApi (AS-11): intercambiable con la
// HTTP sin cambios en hooks ni componentes. Cada respuesta puede ser un valor o
// un error que se lanza.
export class ClienteApiPrueba implements ClienteApi {
  salud: Salud | Error = { estado: 'operativo' };
  registro: CuentaRegistrada | Error = { id: '7f3c9a7e-2b1d-4c55-9a8e-2f1b6c0d9e11', estado: 'Pendiente de validación' };
  sesion: Identidad | Error = { rol: 'Administrador', cuentaId: null };
  renovacion: Identidad | Error = new Error('sin sesión previa');
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
}
