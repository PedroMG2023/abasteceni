import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { components } from '@abasteceni/contrato';
import {
  ErrorAccesoDenegado,
  ErrorAutenticacion,
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorTransicion,
  ErrorValidacion,
} from '../../dominio/puertos';
import { ErrorDemasiadasPeticiones, ErrorProhibido } from './errores-http';
import {
  MENSAJE_CUENTA_NO_ENCONTRADA,
  MENSAJE_DEMASIADAS_PETICIONES,
  MENSAJE_DOCUMENTO_DEMASIADO_GRANDE,
  MENSAJE_ERROR_INTERNO,
  MENSAJE_NO_ENCONTRADO,
  MENSAJE_PROHIBIDO,
  MENSAJE_SOLICITUD_INVALIDA,
  MENSAJE_TRANSICION_NO_PERMITIDA,
  MENSAJES_ACCESO_DENEGADO,
  MENSAJES_AUTENTICACION,
  MENSAJES_CONFLICTO,
  mensajeCampo,
} from './mensajes';

type CuerpoError = components['schemas']['Error'];

// Manejo uniforme de errores como envoltura de la capa 2 (D3 §2.9.1, AS-03).
// Ninguna respuesta lleva trazas internas ni datos personales (V-03).
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly registro = new Logger('Errores');

  catch(error: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const [estado, cuerpo] = this.traducir(error);
    if (error instanceof ErrorDemasiadasPeticiones) respuesta.setHeader('Retry-After', String(error.reintentarEnSegundos));
    respuesta.status(estado).json(cuerpo);
  }

  private traducir(error: unknown): [number, CuerpoError] {
    if (error instanceof ErrorValidacion) {
      return [
        HttpStatus.BAD_REQUEST,
        {
          codigo: 'SOLICITUD_INVALIDA',
          mensaje: MENSAJE_SOLICITUD_INVALIDA,
          detalles: error.detalles.map((d) => ({ campo: d.campo, mensaje: mensajeCampo(d) })),
        },
      ];
    }
    if (error instanceof ErrorConflicto) return [HttpStatus.CONFLICT, { codigo: error.codigo, mensaje: MENSAJES_CONFLICTO[error.codigo] }];
    if (error instanceof ErrorAutenticacion) {
      return [HttpStatus.UNAUTHORIZED, { codigo: error.codigo, mensaje: MENSAJES_AUTENTICACION[error.codigo] }];
    }
    if (error instanceof ErrorAccesoDenegado) {
      return [HttpStatus.FORBIDDEN, { codigo: error.codigo, mensaje: MENSAJES_ACCESO_DENEGADO[error.codigo] }];
    }
    if (error instanceof ErrorNoEncontrado) return [HttpStatus.NOT_FOUND, { codigo: error.codigo, mensaje: MENSAJE_CUENTA_NO_ENCONTRADA }];
    if (error instanceof ErrorTransicion) return [HttpStatus.CONFLICT, { codigo: error.codigo, mensaje: MENSAJE_TRANSICION_NO_PERMITIDA }];
    if (error instanceof ErrorProhibido) return [HttpStatus.FORBIDDEN, { codigo: 'PROHIBIDO', mensaje: MENSAJE_PROHIBIDO }];
    if (error instanceof ErrorDemasiadasPeticiones) {
      return [HttpStatus.TOO_MANY_REQUESTS, { codigo: 'DEMASIADAS_PETICIONES', mensaje: MENSAJE_DEMASIADAS_PETICIONES }];
    }
    if (error instanceof HttpException) {
      const estado = error.getStatus();
      if (estado === HttpStatus.NOT_FOUND) return [estado, { codigo: 'NO_ENCONTRADO', mensaje: MENSAJE_NO_ENCONTRADO }];
      // El tope de 5 MB del registro legal lo aplica multer (SYS-FN-02, CT-REG-02).
      if (estado === HttpStatus.PAYLOAD_TOO_LARGE) {
        return [estado, { codigo: 'DOCUMENTO_DEMASIADO_GRANDE', mensaje: MENSAJE_DOCUMENTO_DEMASIADO_GRANDE }];
      }
      if (estado < 500) return [estado, { codigo: 'SOLICITUD_INVALIDA', mensaje: MENSAJE_SOLICITUD_INVALIDA }];
    }
    // Solo el tipo del error: su mensaje podría contener datos personales.
    this.registro.error(`Error no controlado: ${error instanceof Error ? error.name : typeof error}`);
    return [HttpStatus.INTERNAL_SERVER_ERROR, { codigo: 'ERROR_INTERNO', mensaje: MENSAJE_ERROR_INTERNO }];
  }
}
