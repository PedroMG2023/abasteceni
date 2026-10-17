import type { components } from '@abasteceni/contrato';

// Puerto de la capa 1 hacia la API REST (PA-07, ADR-06, AS-18). Hooks y
// componentes dependen de esta interfaz y nunca del cliente HTTP concreto.
type Esquemas = components['schemas'];
export type Salud = Esquemas['Salud'];
export type ErrorRespuesta = Esquemas['Error'];
export type SolicitudRegistroCuenta = Esquemas['SolicitudRegistroCuenta'];
export type CuentaRegistrada = Esquemas['CuentaRegistrada'];
export type TipoCuenta = Esquemas['TipoCuenta'];
export type SolicitudInicioSesion = Esquemas['SolicitudInicioSesion'];
export type Rol = Esquemas['Rol'];
export type Identidad = Esquemas['Identidad'];

export interface ClienteApi {
  consultarSalud(): Promise<Salud>;
  registrarCuenta(solicitud: SolicitudRegistroCuenta): Promise<CuentaRegistrada>;
  // La credencial de acceso queda en memoria del cliente; la de renovación, en
  // una cookie HttpOnly que el código del navegador no puede leer (ADR-04).
  iniciarSesion(datos: SolicitudInicioSesion): Promise<Identidad>;
  renovarSesion(): Promise<Identidad>;
  cerrarSesion(): Promise<void>;
}

// Error de la API con la forma uniforme del contrato.
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly cuerpo: ErrorRespuesta,
  ) {
    super(cuerpo.mensaje);
    this.name = 'ErrorApi';
  }
}
