import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import type { components } from '@abasteceni/contrato';
import type { ServicioUsuarios } from '../../dominio/m1-usuarios';
import { SIMBOLOS } from '../simbolos';
import { Publico, Roles } from '../transversal/decoradores';
import { FiltroCuentasDto, SolicitudRegistroCuentaDto } from './dto';

type CuentaRegistrada = components['schemas']['CuentaRegistrada'];
type ResumenCuenta = components['schemas']['ResumenCuenta'];

// Recurso /api/v1/cuentas de M1 (D3 §2.9.2). Solo traduce entre HTTP y el
// servicio del módulo.
@Controller('cuentas')
export class CuentasController {
  constructor(@Inject(SIMBOLOS.servicioUsuarios) private readonly usuarios: ServicioUsuarios) {}

  // SYS-FN-01, CT-REG-01.
  @Post()
  @Publico()
  @HttpCode(201)
  registrar(@Body() solicitud: SolicitudRegistroCuentaDto): Promise<CuentaRegistrada> {
    return this.usuarios.registrar(solicitud);
  }

  // Panel del Administrador de la plataforma (SYS-FN-03; V-03).
  @Get()
  @Roles('Administrador')
  async listar(@Query() filtro: FiltroCuentasDto): Promise<ResumenCuenta[]> {
    const cuentas = await this.usuarios.listar({ estado: filtro.estado });
    return cuentas.map((cuenta) => ({
      id: cuenta.id,
      tipo: cuenta.tipo,
      razonSocial: cuenta.razonSocial,
      ruc: cuenta.ruc.numero,
      departamento: cuenta.ubicacion.departamento,
      municipio: cuenta.ubicacion.municipio,
      rubro: cuenta.rubro,
      estado: cuenta.estado,
      registradaEn: cuenta.registradaEn.toISOString(),
    }));
  }
}
