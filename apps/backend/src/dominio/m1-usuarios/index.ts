// M1 Usuarios y validación: registro de cuentas comerciales, carga del registro
// legal y ciclo de validación (SYS-FN-01 a 03). Interfaz pública del módulo
// (PA-02): otro módulo solo puede importar este archivo.
export { CuentaComercial, type DatosCuenta, type PropiedadesCuenta } from './cuenta-comercial';
export { Ruc } from './ruc';
export { Ubicacion } from './ubicacion';
export { EstadoCuenta, ESTADOS_CUENTA, TIPOS_CUENTA, type TipoCuenta } from './tipos';
export { CUENTA_REGISTRADA, type CuentaRegistrada } from './eventos';
export type { PuertoRepositorioUsuarios } from './repositorio';
export { ServicioUsuarios, type DependenciasUsuarios, type SolicitudRegistro } from './servicio-usuarios';
