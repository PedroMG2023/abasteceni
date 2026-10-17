import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { ErrorValidacion, type DetalleValidacion, type MotivoValidacion } from '../../dominio/puertos';

// Validación declarativa de la entrada en la frontera (PA-05, CLAUDE.md §9). Las
// invariantes de negocio se verifican además en el dominio.
const MOTIVOS: Record<string, MotivoValidacion> = {
  isNotEmpty: 'obligatorio',
  isDefined: 'obligatorio',
  maxLength: 'longitud',
  minLength: 'longitud',
  isIn: 'valor',
  isString: 'valor',
  whitelistValidation: 'valor',
};

function aDetalles(errores: ValidationError[]): DetalleValidacion[] {
  return errores.map((error) => {
    const restricciones = Object.keys(error.constraints ?? {});
    const motivo = restricciones.map((r) => MOTIVOS[r]).find(Boolean) ?? 'valor';
    return { campo: error.property, motivo };
  });
}

export function crearTuberiaValidacion(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errores) => new ErrorValidacion(aDetalles(errores)),
  });
}
