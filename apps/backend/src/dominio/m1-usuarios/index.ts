// M1 Usuarios y validación: registro de cuentas comerciales, carga del registro
// legal y ciclo de validación (SYS-FN-01 a 03). Interfaz pública del módulo
// (PA-02): otro módulo solo puede importar este archivo.
export { CuentaComercial, type AdjuntosRegistro, type DatosCuenta, type PropiedadesCuenta } from './cuenta-comercial';
export { VERSION_CONSENTIMIENTO } from './consentimiento';
export {
  TAMANO_MAXIMO_REGISTRO_LEGAL,
  TIPOS_REGISTRO_LEGAL,
  comprobarRegistroLegal,
  tipoPorContenido,
  type RegistroLegal,
  type TipoRegistroLegal,
} from './registro-legal';
export { Ruc } from './ruc';
export { Ubicacion } from './ubicacion';
export { EstadoCuenta, ESTADOS_CUENTA, TIPOS_CUENTA, type TipoCuenta } from './tipos';
export {
  CUENTA_APROBADA,
  CUENTA_RECHAZADA,
  CUENTA_REGISTRADA,
  type CuentaAprobada,
  type CuentaRechazada,
  type CuentaRegistrada,
} from './eventos';
export { DECISIONES, siguienteEstado, type Decision } from './maquina-estados';
export type { PuertoRepositorioUsuarios } from './repositorio';
export { ServicioUsuarios, type DependenciasUsuarios, type SolicitudRegistro, type SolicitudValidacion } from './servicio-usuarios';
