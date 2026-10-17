import { Controller, Get } from '@nestjs/common';
import type { components } from '@abasteceni/contrato';
import { Publico } from './decoradores';

type Salud = components['schemas']['Salud'];

// Sonda de vitalidad del servicio de aplicación (D3 R-03, MD-05).
// La forma de la respuesta la fija el contrato (PA-07). Pública, pero sujeta
// al límite de peticiones (ADR-08).
@Controller('salud')
@Publico()
export class SaludController {
  @Get()
  consultar(): Salud {
    return { estado: 'operativo' };
  }
}
