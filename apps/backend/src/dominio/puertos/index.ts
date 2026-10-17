// Paquete de puertos del dominio (MD-02, AS-13). Puertos pequeños separados por
// necesidad; los implementa la capa de infraestructura (PA-01).
export type { Transaccion, PuertoUnidadTrabajo } from './unidad-trabajo';
export type { EventoDominio, PuertoPublicacionEventos, PuertoDespachoEventos } from './eventos';
export { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from './notificacion';
export type { PuertoReloj } from './reloj';
export type { PuertoIdentificadores } from './identificadores';
export type { PuertoContadorPeticiones } from './contador-peticiones';
export {
  ErrorAccesoDenegado,
  ErrorAutenticacion,
  ErrorConflicto,
  ErrorValidacion,
  type CodigoAccesoDenegado,
  type CodigoAutenticacion,
  type CodigoConflicto,
  type DetalleValidacion,
  type MotivoValidacion,
} from './errores';
