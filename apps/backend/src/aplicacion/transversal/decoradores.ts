import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { ReclamosAcceso, Rol } from '../../dominio/m2-seguridad';

export const METADATO_PUBLICO = 'abasteceni:publico';
export const METADATO_ROLES = 'abasteceni:roles';

// La operación no exige credencial de acceso.
export const Publico = () => SetMetadata(METADATO_PUBLICO, true);

// La operación exige uno de los roles indicados (PA-05: control en la frontera).
export const Roles = (...roles: Rol[]) => SetMetadata(METADATO_ROLES, roles);

export interface PeticionAutenticada {
  identidad?: ReclamosAcceso;
}

export const IdentidadActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext) => contexto.switchToHttp().getRequest<PeticionAutenticada>().identidad,
);
