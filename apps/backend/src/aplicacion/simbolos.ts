// Símbolos de inyección de los puertos y servicios que la capa 2 consume. La
// raíz de composición los enlaza con sus implementaciones (AS-17).
export const SIMBOLOS = {
  configuracionHttp: Symbol('ConfiguracionHttp'),
  reloj: Symbol('PuertoReloj'),
  contadorPeticiones: Symbol('PuertoContadorPeticiones'),
  servicioUsuarios: Symbol('ServicioUsuarios'),
  servicioSeguridad: Symbol('ServicioSeguridad'),
} as const;

export interface ConfiguracionHttp {
  // Límite de SYS-NFN-03: 120 peticiones por minuto por IP (ADR-08).
  readonly limitePeticionesPorMinuto: number;
  readonly cookieSegura: boolean;
}
