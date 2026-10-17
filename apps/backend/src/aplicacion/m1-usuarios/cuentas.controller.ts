import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { components } from '@abasteceni/contrato';
import { TAMANO_MAXIMO_REGISTRO_LEGAL, type CuentaComercial, type ServicioUsuarios } from '../../dominio/m1-usuarios';
import type { ContextoSolicitud } from '../../dominio/puertos';
import { SIMBOLOS } from '../simbolos';
import { Contexto } from '../transversal/contexto';
import { Publico, Roles } from '../transversal/decoradores';
import { FiltroCuentasDto, SolicitudRegistroCuentaDto, ValidacionCuentaDto } from './dto';

type CuentaRegistrada = components['schemas']['CuentaRegistrada'];
type ResumenCuenta = components['schemas']['ResumenCuenta'];

function resumen(cuenta: CuentaComercial): ResumenCuenta {
  return {
    id: cuenta.id,
    tipo: cuenta.tipo,
    razonSocial: cuenta.razonSocial,
    ruc: cuenta.ruc.numero,
    departamento: cuenta.ubicacion.departamento,
    municipio: cuenta.ubicacion.municipio,
    rubro: cuenta.rubro,
    estado: cuenta.estado,
    registradaEn: cuenta.registradaEn.toISOString(),
    consentimientoAceptadoEn: cuenta.consentimientoAceptadoEn.toISOString(),
    registroLegalTipo: cuenta.registroLegal.tipo,
  };
}

// Recurso /api/v1/cuentas de M1 (D3 §2.9.2). Solo traduce entre HTTP y el
// servicio del módulo.
@Controller('cuentas')
export class CuentasController {
  constructor(@Inject(SIMBOLOS.servicioUsuarios) private readonly usuarios: ServicioUsuarios) {}

  // SYS-FN-01, 02 y 36 (CT-REG-01, CT-REG-02). El documento se recibe en
  // memoria con un tope de 5 MB; un archivo mayor se corta y responde 413.
  @Post()
  @Publico()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('registroLegal', { limits: { fileSize: TAMANO_MAXIMO_REGISTRO_LEGAL, files: 1, fields: 20 } }))
  registrar(
    @Body() solicitud: SolicitudRegistroCuentaDto,
    @UploadedFile() registroLegal: Express.Multer.File | undefined,
    @Contexto() contexto: ContextoSolicitud,
  ): Promise<CuentaRegistrada> {
    return this.usuarios.registrar(
      {
        ...solicitud,
        aceptaConsentimiento: solicitud.aceptaConsentimiento === 'true',
        registroLegal: registroLegal ? new Uint8Array(registroLegal.buffer) : undefined,
      },
      contexto,
    );
  }

  // Panel del Administrador de la plataforma (SYS-FN-03; V-03).
  @Get()
  @Roles('Administrador')
  async listar(@Query() filtro: FiltroCuentasDto): Promise<ResumenCuenta[]> {
    return (await this.usuarios.listar({ estado: filtro.estado })).map(resumen);
  }

  // SYS-FN-03, CT-ADM-03: aprobar o rechazar, con asiento en la bitácora.
  @Patch(':id')
  @Roles('Administrador')
  async validar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() validacion: ValidacionCuentaDto,
    @Contexto() contexto: ContextoSolicitud,
  ): Promise<ResumenCuenta> {
    return resumen(await this.usuarios.validarCuenta({ cuentaId: id, ...validacion }, contexto));
  }

  // Documento de registro legal para la revisión (PM-01, actividad 4).
  @Get(':id/registro-legal')
  @Roles('Administrador')
  async registroLegal(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) respuesta: Response): Promise<StreamableFile> {
    const documento = await this.usuarios.obtenerRegistroLegal(id);
    respuesta.setHeader('Content-Type', documento.tipo);
    respuesta.setHeader('Content-Disposition', 'inline');
    respuesta.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(Buffer.from(documento.contenido));
  }
}
