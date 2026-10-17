// M2 Seguridad y sesiones: autenticación, emisión y renovación de credenciales,
// roles, bloqueo por intentos fallidos, segundo factor y límite de dispositivos
// (SYS-FN-04 a 08). Interfaz pública del módulo (PA-02): otro módulo solo
// puede importar este archivo.
export { ROLES, type Rol } from './rol';
export { VIDA_ACCESO_SEGUNDOS, VIDA_RENOVACION_SEGUNDOS, CONTRASENA_MINIMA, CONTRASENA_MAXIMA } from './politica';
export type { Credencial, Habilitacion, SesionRenovacion } from './credencial';
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
