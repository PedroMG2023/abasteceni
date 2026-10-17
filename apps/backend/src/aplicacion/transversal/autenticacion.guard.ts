import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { ServicioSeguridad } from '../../dominio/m2-seguridad';
import { ErrorAutenticacion } from '../../dominio/puertos';
import { SIMBOLOS } from '../simbolos';
import { METADATO_PUBLICO, type PeticionAutenticada } from './decoradores';

// Autenticación sin estado (ADR-04, PA-04): verifica la firma y la vigencia de
// la credencial de acceso en cada petición, sin sesión en memoria.
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SIMBOLOS.servicioSeguridad) private readonly seguridad: ServicioSeguridad,
  ) {}

  canActivate(contexto: ExecutionContext): boolean {
    const publico = this.reflector.getAllAndOverride<boolean>(METADATO_PUBLICO, [contexto.getHandler(), contexto.getClass()]);
    if (publico) return true;
    const peticion = contexto.switchToHttp().getRequest<Request & PeticionAutenticada>();
    const [esquema, credencial] = (peticion.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !credencial) throw new ErrorAutenticacion('ACCESO_INVALIDO');
    peticion.identidad = this.seguridad.verificarAcceso(credencial);
    return true;
  }
}
