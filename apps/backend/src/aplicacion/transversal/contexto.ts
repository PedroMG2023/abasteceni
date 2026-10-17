import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ContextoSolicitud } from '../../dominio/puertos';
import type { PeticionAutenticada } from './decoradores';

// Usuario e IP de origen de la petición para la bitácora (SYS-FN-35). La IP es
// la del cliente tras el balanceador («trust proxy», ADR-08).
export function contextoDe(peticion: Request & PeticionAutenticada): ContextoSolicitud {
  return { usuarioId: peticion.identidad?.credencialId ?? null, ip: peticion.ip ?? 'desconocida' };
}

export const Contexto = createParamDecorator((_dato: unknown, contexto: ExecutionContext) =>
  contextoDe(contexto.switchToHttp().getRequest<Request & PeticionAutenticada>()),
);
