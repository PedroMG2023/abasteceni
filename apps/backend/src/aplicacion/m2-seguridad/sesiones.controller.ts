import { Body, Controller, Delete, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { components } from '@abasteceni/contrato';
import type { ReclamosAcceso, ServicioSeguridad, SesionEmitida } from '../../dominio/m2-seguridad';
import { ErrorAutenticacion, type ContextoSolicitud } from '../../dominio/puertos';
import { SIMBOLOS, type ConfiguracionHttp } from '../simbolos';
import { Contexto } from '../transversal/contexto';
import { IdentidadActual, Publico } from '../transversal/decoradores';
import { MENSAJE_CONTRASENA_RESTABLECIDA, MENSAJE_RECUPERACION_SOLICITADA } from '../transversal/mensajes';
import { SolicitudInicioSesionDto, SolicitudRecuperacionDto, SolicitudRestablecimientoDto } from './dto';

type SesionIniciada = components['schemas']['SesionIniciada'];
type Identidad = components['schemas']['Identidad'];
type Aviso = components['schemas']['Aviso'];

export const COOKIE_RENOVACION = 'abasteceni_renovacion';
const RUTA_COOKIE = '/api/v1/sesiones';

function leerCookie(peticion: Request, nombre: string): string | undefined {
  for (const par of (peticion.headers.cookie ?? '').split(';')) {
    const [clave, ...valor] = par.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return undefined;
}

// Recurso /api/v1/sesiones de M2 (D3 §2.9.2; SYS-FN-04; ADR-04). La credencial
// de renovación viaja en una cookie HttpOnly y SameSite=Strict, fuera del
// alcance del código del navegador.
@Controller('sesiones')
export class SesionesController {
  constructor(
    @Inject(SIMBOLOS.servicioSeguridad) private readonly seguridad: ServicioSeguridad,
    @Inject(SIMBOLOS.configuracionHttp) private readonly configuracion: ConfiguracionHttp,
  ) {}

  @Post()
  @Publico()
  @HttpCode(201)
  async iniciar(@Body() solicitud: SolicitudInicioSesionDto, @Res({ passthrough: true }) respuesta: Response): Promise<SesionIniciada> {
    return this.responder(await this.seguridad.iniciarSesion(solicitud), respuesta);
  }

  @Post('renovacion')
  @Publico()
  @HttpCode(201)
  async renovar(@Req() peticion: Request, @Res({ passthrough: true }) respuesta: Response): Promise<SesionIniciada> {
    const secreto = leerCookie(peticion, COOKIE_RENOVACION);
    if (!secreto) throw new ErrorAutenticacion('RENOVACION_INVALIDA');
    return this.responder(await this.seguridad.renovar(secreto), respuesta);
  }

  // SYS-FN-05 (DIS-36): la misma respuesta exista o no el correo.
  @Post('recuperacion')
  @Publico()
  @HttpCode(202)
  async solicitarRecuperacion(@Body() solicitud: SolicitudRecuperacionDto): Promise<Aviso> {
    await this.seguridad.solicitarRecuperacion(solicitud.correo);
    return { mensaje: MENSAJE_RECUPERACION_SOLICITADA };
  }

  @Post('recuperacion/restablecimiento')
  @Publico()
  @HttpCode(200)
  async restablecer(@Body() solicitud: SolicitudRestablecimientoDto, @Contexto() contexto: ContextoSolicitud): Promise<Aviso> {
    await this.seguridad.restablecerContrasena(solicitud, contexto);
    return { mensaje: MENSAJE_CONTRASENA_RESTABLECIDA };
  }

  @Get('actual')
  actual(@IdentidadActual() identidad: ReclamosAcceso): Identidad {
    return { rol: identidad.rol, cuentaId: identidad.cuentaId };
  }

  @Delete('actual')
  @HttpCode(204)
  async cerrar(@IdentidadActual() identidad: ReclamosAcceso, @Res({ passthrough: true }) respuesta: Response): Promise<void> {
    await this.seguridad.cerrarSesion(identidad.sesionId);
    respuesta.clearCookie(COOKIE_RENOVACION, { path: RUTA_COOKIE });
  }

  private responder(sesion: SesionEmitida, respuesta: Response): SesionIniciada {
    respuesta.cookie(COOKIE_RENOVACION, sesion.credencialRenovacion, {
      httpOnly: true,
      secure: this.configuracion.cookieSegura,
      sameSite: 'strict',
      path: RUTA_COOKIE,
      maxAge: sesion.renovacionExpiraEnSegundos * 1000,
    });
    return { credencialAcceso: sesion.credencialAcceso, tipo: 'Bearer', expiraEnSegundos: sesion.expiraEnSegundos, rol: sesion.rol };
  }
}
