// Paquete de puertos del dominio (MD-02, AS-13). Puertos pequeños separados por
// necesidad; los implementa la capa de infraestructura (PA-01).
export type { Transaccion, PuertoUnidadTrabajo } from './unidad-trabajo';
export type { EventoDominio, PuertoPublicacionEventos, PuertoDespachoEventos } from './eventos';
export { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from './notificacion';
export type { PuertoReloj } from './reloj';
export type { PuertoIdentificadores } from './identificadores';
export type { PuertoContadorPeticiones } from './contador-peticiones';
export type { AsientoBitacora, PuertoBitacora } from './bitacora';
export type { ContextoSolicitud } from './contexto';
export type { DocumentoAlmacenado, PuertoAlmacenDocumentos } from './almacen-documentos';
export {
  ErrorAccesoDenegado,
  ErrorAutenticacion,
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorTransicion,
  ErrorValidacion,
  ErrorVencido,
  type CodigoAccesoDenegado,
  type CodigoAutenticacion,
  type CodigoConflicto,
  type CodigoNoEncontrado,
  type CodigoTransicion,
  type CodigoVencido,
  type DetalleValidacion,
  type MotivoValidacion,
} from './errores';
