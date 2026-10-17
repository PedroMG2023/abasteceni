import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '../../dominio/m2-seguridad';
import { METADATO_ROLES, type PeticionAutenticada } from './decoradores';
import { ErrorProhibido } from './errores-http';

// Control de acceso por rol en la frontera (PA-05; SYS-FN-04).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(METADATO_ROLES, [contexto.getHandler(), contexto.getClass()]);
    if (!roles?.length) return true;
    const { identidad } = contexto.switchToHttp().getRequest<PeticionAutenticada>();
    if (!identidad || !roles.includes(identidad.rol)) throw new ErrorProhibido();
    return true;
  }
}
