// Quién y desde dónde origina una operación: la capa 2 lo obtiene de la
// credencial de acceso y de la petición, y el dominio lo lleva a la bitácora
// (SYS-FN-35: identificador de usuario e IP de origen).
export interface ContextoSolicitud {
  readonly usuarioId: string | null;
  readonly ip: string;
}
