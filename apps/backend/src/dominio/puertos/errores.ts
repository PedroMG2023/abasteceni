// Errores que el dominio comunica a las capas externas. La capa 2 los traduce
// a respuestas HTTP con la forma uniforme del contrato (D3 §2.9.1).

export type MotivoValidacion = 'obligatorio' | 'formato' | 'longitud' | 'valor';

export interface DetalleValidacion {
  readonly campo: string;
  readonly motivo: MotivoValidacion;
}

// Una invariante de negocio no se cumple (PA-05).
export class ErrorValidacion extends Error {
  constructor(readonly detalles: readonly DetalleValidacion[]) {
    super(`Validación fallida: ${detalles.map((d) => `${d.campo} (${d.motivo})`).join(', ')}`);
    this.name = 'ErrorValidacion';
  }
}

export type CodigoConflicto = 'RUC_REGISTRADO' | 'CORREO_REGISTRADO';

export class ErrorConflicto extends Error {
  constructor(readonly codigo: CodigoConflicto) {
    super(codigo);
    this.name = 'ErrorConflicto';
  }
}

export type CodigoAutenticacion = 'CREDENCIALES_INVALIDAS' | 'RENOVACION_INVALIDA' | 'ACCESO_INVALIDO';

export class ErrorAutenticacion extends Error {
  constructor(readonly codigo: CodigoAutenticacion) {
    super(codigo);
    this.name = 'ErrorAutenticacion';
  }
}

export type CodigoAccesoDenegado = 'CUENTA_PENDIENTE' | 'CUENTA_RECHAZADA' | 'CUENTA_BLOQUEADA';

export class ErrorAccesoDenegado extends Error {
  constructor(readonly codigo: CodigoAccesoDenegado) {
    super(codigo);
    this.name = 'ErrorAccesoDenegado';
  }
}

// El enlace de recuperación venció, ya se usó o fue anulado (SYS-FN-05; DIS-36).
export type CodigoVencido = 'ENLACE_VENCIDO';

export class ErrorVencido extends Error {
  constructor(readonly codigo: CodigoVencido) {
    super(codigo);
    this.name = 'ErrorVencido';
  }
}

export type CodigoNoEncontrado = 'CUENTA_NO_ENCONTRADA';

export class ErrorNoEncontrado extends Error {
  constructor(readonly codigo: CodigoNoEncontrado) {
    super(codigo);
    this.name = 'ErrorNoEncontrado';
  }
}

// Transición no prevista por una máquina de estados del dominio (AS-01).
export type CodigoTransicion = 'TRANSICION_NO_PERMITIDA';

export class ErrorTransicion extends Error {
  constructor(readonly codigo: CodigoTransicion = 'TRANSICION_NO_PERMITIDA') {
    super(codigo);
    this.name = 'ErrorTransicion';
  }
}

