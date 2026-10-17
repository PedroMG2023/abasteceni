import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { PuertoContadorPeticiones, PuertoReloj } from '../../dominio/puertos';
import { SIMBOLOS, type ConfiguracionHttp } from '../simbolos';
import { ErrorDemasiadasPeticiones } from './errores-http';

const VENTANA_MS = 60_000;

// Límite de peticiones por IP y minuto (SYS-NFN-03) como guard de la capa 2,
// con el contador compartido en PostgreSQL (ADR-08, PA-04). Se evalúa antes que
// la autenticación, de modo que también limita las peticiones anónimas.
@Injectable()
export class LimitePeticionesGuard implements CanActivate {
  constructor(
    @Inject(SIMBOLOS.contadorPeticiones) private readonly contador: PuertoContadorPeticiones,
    @Inject(SIMBOLOS.reloj) private readonly reloj: PuertoReloj,
    @Inject(SIMBOLOS.configuracionHttp) private readonly configuracion: ConfiguracionHttp,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<Request>();
    const ahora = this.reloj.ahora().getTime();
    const inicioVentana = ahora - (ahora % VENTANA_MS);
    const cuenta = await this.contador.registrar(peticion.ip ?? 'desconocida', new Date(inicioVentana));
    if (cuenta > this.configuracion.limitePeticionesPorMinuto) {
      throw new ErrorDemasiadasPeticiones(Math.ceil((inicioVentana + VENTANA_MS - ahora) / 1000));
    }
    return true;
  }
}
