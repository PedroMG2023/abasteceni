import type { components } from '@abasteceni/contrato';

// Puerto de la capa 1 hacia la API REST (PA-07, ADR-06, AS-18). Hooks y
// componentes dependen de esta interfaz y nunca del cliente HTTP concreto.
type Esquemas = components['schemas'];
export type Salud = Esquemas['Salud'];
export type ErrorRespuesta = Esquemas['Error'];
// En la interfaz el documento es un archivo; el cliente lo envía en multipart.
export type SolicitudRegistroCuenta = Omit<Esquemas['SolicitudRegistroCuenta'], 'registroLegal'> & { registroLegal: Blob };
export type ResumenCuenta = Esquemas['ResumenCuenta'];
export type EstadoCuenta = Esquemas['EstadoCuenta'];
export type ValidacionCuenta = Esquemas['ValidacionCuenta'];
export type CuentaRegistrada = Esquemas['CuentaRegistrada'];
export type TipoCuenta = Esquemas['TipoCuenta'];
export type SolicitudInicioSesion = Esquemas['SolicitudInicioSesion'];
export type Rol = Esquemas['Rol'];
export type Identidad = Esquemas['Identidad'];
export type SolicitudRestablecimiento = Esquemas['SolicitudRestablecimiento'];

export interface ClienteApi {
  consultarSalud(): Promise<Salud>;
  registrarCuenta(solicitud: SolicitudRegistroCuenta): Promise<CuentaRegistrada>;
  // La credencial de acceso queda en memoria del cliente; la de renovación, en
  // una cookie HttpOnly que el código del navegador no puede leer (ADR-04).
  iniciarSesion(datos: SolicitudInicioSesion): Promise<Identidad>;
  renovarSesion(): Promise<Identidad>;
  cerrarSesion(): Promise<void>;
  // Recuperación de la contraseña (SYS-FN-05). Devuelven el aviso de la API.
  solicitarRecuperacion(correo: string): Promise<string>;
  restablecerContrasena(datos: SolicitudRestablecimiento): Promise<string>;
  // Panel del Administrador de la plataforma (SYS-FN-03).
  listarCuentas(estado?: EstadoCuenta): Promise<ResumenCuenta[]>;
  validarCuenta(id: string, validacion: ValidacionCuenta): Promise<ResumenCuenta>;
  obtenerRegistroLegal(id: string): Promise<Blob>;
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
