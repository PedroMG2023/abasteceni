// Contador compartido de peticiones por clave y ventana (ADR-08, SYS-NFN-03).
// Vive en PostgreSQL y nunca en la memoria del proceso (PA-04).
export interface PuertoContadorPeticiones {
  // Registra una petición y devuelve cuántas lleva la clave en esa ventana.
  registrar(clave: string, inicioVentana: Date): Promise<number>;
}
