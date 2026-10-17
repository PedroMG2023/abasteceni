// M2 Seguridad y sesiones: autenticación, emisión y renovación de credenciales,
// roles, bloqueo por intentos fallidos, segundo factor y límite de dispositivos
// (SYS-FN-04 a 08). Interfaz pública del módulo (PA-02): otro módulo solo
// puede importar este archivo.
export { ROLES, type Rol } from './rol';
export {
  BLOQUEO_SEGUNDOS,
  CONTRASENA_MAXIMA,
  CONTRASENA_MINIMA,
  MAXIMO_INTENTOS_FALLIDOS,
  VIDA_ACCESO_SEGUNDOS,
  VIDA_RENOVACION_SEGUNDOS,
} from './politica';
export { CUENTA_BLOQUEADA, type CuentaBloqueada } from './eventos';
export { credencialBloqueada, type Credencial, type Habilitacion, type SesionRenovacion } from './credencial';
export type {
  PuertoDerivacionClave,
  PuertoFirmaAcceso,
  PuertoRepositorioSeguridad,
  PuertoSecretosRenovacion,
  ReclamosAcceso,
} from './puertos';
export {
  ServicioSeguridad,
  type DatosCredencialCuenta,
  type DependenciasSeguridad,
  type RegistroCredenciales,
  type SesionEmitida,
} from './servicio-seguridad';
