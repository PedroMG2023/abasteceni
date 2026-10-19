import { ACCIONES_BITACORA } from '../m9-administracion';
import {
  ErrorAccesoDenegado,
  ErrorAutenticacion,
  ErrorConflicto,
  ErrorValidacion,
  ErrorVencido,
  type ContextoSolicitud,
  type PuertoBitacora,
  type PuertoIdentificadores,
  type PuertoPublicacionEventos,
  type PuertoReloj,
  type PuertoUnidadTrabajo,
  type Transaccion,
} from '../puertos';
import { credencialBloqueada, recuperacionVigente, sesionVigente, type Credencial, type Habilitacion } from './credencial';
import { CUENTA_BLOQUEADA, RECUPERACION_SOLICITADA, type CuentaBloqueada, type RecuperacionSolicitada } from './eventos';
import {
  BLOQUEO_SEGUNDOS,
  MAXIMO_INTENTOS_FALLIDOS,
  normalizarCorreo,
  validarContrasena,
  validarCorreo,
  validarDatosCredencial,
  VIDA_ACCESO_SEGUNDOS,
  VIDA_RECUPERACION_SEGUNDOS,
  VIDA_RENOVACION_SEGUNDOS,
} from './politica';
import type {
  PuertoDerivacionClave,
  PuertoFirmaAcceso,
  PuertoRepositorioSeguridad,
  PuertoSecretosRenovacion,
  ReclamosAcceso,
} from './puertos';
import type { Rol } from './rol';

const RECURSO_CREDENCIAL = 'Credencial';

export interface DependenciasSeguridad {
  repositorio: PuertoRepositorioSeguridad;
  unidadTrabajo: PuertoUnidadTrabajo;
  eventos: PuertoPublicacionEventos;
  // SYS-FN-05: el restablecimiento de la contraseña se asienta en la bitácora de M9.
  bitacora: PuertoBitacora;
  derivacion: PuertoDerivacionClave;
  firma: PuertoFirmaAcceso;
  secretos: PuertoSecretosRenovacion;
  reloj: PuertoReloj;
  identificadores: PuertoIdentificadores;
}

export interface SesionEmitida {
  readonly credencialAcceso: string;
  readonly expiraEnSegundos: number;
  readonly rol: Rol;
  readonly credencialRenovacion: string;
  readonly renovacionExpiraEnSegundos: number;
}

export interface DatosCredencialCuenta {
  readonly cuentaId: string;
  readonly correo: string;
  readonly contrasena: string;
  readonly rol: Exclude<Rol, 'Administrador'>;
}

// Interfaz que M1 consume de M2 (V-02: M1 → M2 identidad): crear la credencial
// al registrar la cuenta y reflejar en ella la decisión del Administrador.
export interface RegistroCredenciales {
  validarDatosCredencial(datos: { correo?: string; contrasena?: string }): ReturnType<typeof validarDatosCredencial>;
  registrarCredencial(datos: DatosCredencialCuenta, tx: Transaccion): Promise<string>;
  cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void>;
}

// Servicio del módulo M2 (R-04: un servicio por módulo). Autenticación sin
// estado: credencial de acceso firmada y credencial de renovación cuya huella
// se guarda en el esquema de M2 para permitir la revocación (ADR-04, PA-04).
export class ServicioSeguridad implements RegistroCredenciales {
  // Huella de referencia para igualar el tiempo de respuesta cuando el correo
  // no existe, sin revelar qué correos están registrados.
  private hashReferencia: Promise<string> | null = null;

  constructor(private readonly d: DependenciasSeguridad) {}

  validarDatosCredencial(datos: { correo?: string; contrasena?: string }) {
    return validarDatosCredencial(datos);
  }

  // Devuelve el identificador de la credencial, que es el usuario de la bitácora.
  registrarCredencial(datos: DatosCredencialCuenta, tx: Transaccion): Promise<string> {
    return this.crearCredencial({ ...datos, habilitacion: 'pendiente' }, tx);
  }

  // Siembra del Administrador de la plataforma (DIS-24). Idempotente.
  async registrarAdministrador(datos: { correo: string; contrasena: string }): Promise<'creado' | 'existente'> {
    return this.d.unidadTrabajo.ejecutar(async (tx) => {
      if (await this.d.repositorio.existeCorreo(normalizarCorreo(datos.correo), tx)) return 'existente';
      await this.crearCredencial({ ...datos, cuentaId: null, rol: 'Administrador', habilitacion: 'habilitada' }, tx);
      return 'creado';
    });
  }

  // Refleja en la credencial la decisión sobre la cuenta (DIS-25).
  async cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void> {
    await this.d.repositorio.cambiarHabilitacion(cuentaId, habilitacion, tx);
  }

  async iniciarSesion(datos: { correo: string; contrasena: string }): Promise<SesionEmitida> {
    const credencial = await this.d.repositorio.buscarCredencialPorCorreo(normalizarCorreo(datos.correo));
    // SYS-FN-07: durante el bloqueo no se evalúa la contraseña (DIS-34).
    if (credencial && credencialBloqueada(credencial, this.d.reloj.ahora())) throw new ErrorAccesoDenegado('CUENTA_BLOQUEADA');
    const hash = credencial?.hashContrasena ?? (await this.obtenerHashReferencia());
    const valida = await this.d.derivacion.verificar(hash, datos.contrasena);
    if (!credencial) throw new ErrorAutenticacion('CREDENCIALES_INVALIDAS');
    if (!valida) {
      if (await this.registrarFallo(credencial)) throw new ErrorAccesoDenegado('CUENTA_BLOQUEADA');
      throw new ErrorAutenticacion('CREDENCIALES_INVALIDAS');
    }
    if (credencial.intentosFallidos > 0) await this.d.repositorio.reiniciarIntentos(credencial.id);
    this.exigirHabilitada(credencial);
    return this.emitir(credencial);
  }

  // Cuenta el fallo; al quinto consecutivo bloquea durante 15 minutos y publica
  // CuentaBloqueada en la misma transacción (SYS-FN-07; ADR-01). Devuelve si bloqueó.
  private registrarFallo(credencial: Credencial): Promise<boolean> {
    return this.d.unidadTrabajo.ejecutar(async (tx) => {
      const intentos = await this.d.repositorio.registrarIntentoFallido(credencial.id, tx);
      if (intentos < MAXIMO_INTENTOS_FALLIDOS) return false;
      const ahora = this.d.reloj.ahora();
      const hasta = new Date(ahora.getTime() + BLOQUEO_SEGUNDOS * 1000);
      await this.d.repositorio.bloquear(credencial.id, hasta, tx);
      const evento: CuentaBloqueada = {
        id: this.d.identificadores.generar(),
        tipo: CUENTA_BLOQUEADA,
        ocurridoEn: ahora,
        datos: { credencialId: credencial.id, correo: credencial.correo, bloqueadaHasta: hasta.toISOString() },
      };
      await this.d.eventos.publicar(evento, tx);
      return true;
    });
  }

  // Rota la credencial de renovación: la presentada queda revocada (ADR-04).
  async renovar(secreto: string): Promise<SesionEmitida> {
    const ahora = this.d.reloj.ahora();
    return this.d.unidadTrabajo.ejecutar(async (tx) => {
      const sesion = await this.d.repositorio.buscarSesionPorHuella(this.d.secretos.huella(secreto), tx);
      if (!sesion || !sesionVigente(sesion, ahora)) throw new ErrorAutenticacion('RENOVACION_INVALIDA');
      const credencial = await this.d.repositorio.buscarCredencialPorId(sesion.credencialId, tx);
      if (!credencial) throw new ErrorAutenticacion('RENOVACION_INVALIDA');
      this.exigirHabilitada(credencial);
      await this.d.repositorio.revocarSesion(sesion.id, ahora, tx);
      return this.emitir(credencial, tx);
    });
  }

  // SYS-FN-05 (DIS-36). La respuesta es la misma exista o no el correo; solo las
  // credenciales habilitadas (cuentas «Activa» y Administrador) reciben el enlace.
  async solicitarRecuperacion(correo: string): Promise<void> {
    const detalles = validarCorreo(correo);
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const credencial = await this.d.repositorio.buscarCredencialPorCorreo(normalizarCorreo(correo));
    if (!credencial || credencial.habilitacion !== 'habilitada') return;
    const ahora = this.d.reloj.ahora();
    const secreto = this.d.secretos.generar();
    const expiraEn = new Date(ahora.getTime() + VIDA_RECUPERACION_SEGUNDOS * 1000);
    await this.d.unidadTrabajo.ejecutar(async (tx) => {
      await this.d.repositorio.anularRecuperaciones(credencial.id, ahora, tx);
      await this.d.repositorio.guardarRecuperacion(
        {
          id: this.d.identificadores.generar(),
          credencialId: credencial.id,
          huella: this.d.secretos.huella(secreto),
          creadaEn: ahora,
          expiraEn,
          usadaEn: null,
          anuladaEn: null,
        },
        tx,
      );
      const evento: RecuperacionSolicitada = {
        id: this.d.identificadores.generar(),
        tipo: RECUPERACION_SOLICITADA,
        ocurridoEn: ahora,
        datos: { credencialId: credencial.id, correo: credencial.correo, secreto, expiraEn: expiraEn.toISOString() },
      };
      await this.d.eventos.publicar(evento, tx);
    });
  }

  // SYS-FN-05 (DIS-36). La contraseña se valida antes de consumir el enlace, para
  // que un error de escritura no lo gaste. En una sola transacción: contraseña
  // nueva, intentos reiniciados y bloqueo levantado, enlace usado, sesiones
  // revocadas (OWASP ASVS V3.3) y asiento en la bitácora.
  async restablecerContrasena(datos: { secreto: string; contrasena: string }, contexto: ContextoSolicitud): Promise<void> {
    const detalles = validarContrasena(datos.contrasena);
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const hash = await this.d.derivacion.derivar(datos.contrasena);
    await this.d.unidadTrabajo.ejecutar(async (tx) => {
      const ahora = this.d.reloj.ahora();
      const solicitud = await this.d.repositorio.buscarRecuperacionPorHuella(this.d.secretos.huella(datos.secreto), tx);
      if (!solicitud || !recuperacionVigente(solicitud, ahora)) throw new ErrorVencido('ENLACE_VENCIDO');
      const credencial = await this.d.repositorio.buscarCredencialPorId(solicitud.credencialId, tx);
      if (!credencial || credencial.habilitacion !== 'habilitada') throw new ErrorVencido('ENLACE_VENCIDO');

      await this.d.repositorio.restablecerContrasena(credencial.id, hash, tx);
      await this.d.repositorio.marcarRecuperacionUsada(solicitud.id, ahora, tx);
      await this.d.repositorio.revocarSesionesDe(credencial.id, ahora, tx);
      await this.d.bitacora.registrar(
        {
          id: this.d.identificadores.generar(),
          usuarioId: credencial.id,
          accion: ACCIONES_BITACORA.contrasenaRestablecida,
          recurso: { tipo: RECURSO_CREDENCIAL, id: credencial.id },
          detalle: { recuperacionId: solicitud.id },
          ip: contexto.ip,
          registradoEn: ahora,
        },
        tx,
      );
    });
  }

  async cerrarSesion(sesionId: string): Promise<void> {
    await this.d.repositorio.revocarSesion(sesionId, this.d.reloj.ahora());
  }

  verificarAcceso(credencialAcceso: string): ReclamosAcceso {
    const reclamos = this.d.firma.verificar(credencialAcceso);
    if (!reclamos) throw new ErrorAutenticacion('ACCESO_INVALIDO');
    return reclamos;
  }

  private exigirHabilitada(credencial: Credencial): void {
    if (credencial.habilitacion === 'pendiente') throw new ErrorAccesoDenegado('CUENTA_PENDIENTE');
    if (credencial.habilitacion === 'rechazada') throw new ErrorAccesoDenegado('CUENTA_RECHAZADA');
  }

  private async crearCredencial(
    datos: { cuentaId: string | null; correo: string; contrasena: string; rol: Rol; habilitacion: Habilitacion },
    tx: Transaccion,
  ): Promise<string> {
    const detalles = validarDatosCredencial(datos);
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const correo = normalizarCorreo(datos.correo);
    if (await this.d.repositorio.existeCorreo(correo, tx)) throw new ErrorConflicto('CORREO_REGISTRADO');
    const id = this.d.identificadores.generar();
    await this.d.repositorio.guardarCredencial(
      {
        id,
        cuentaId: datos.cuentaId,
        correo,
        hashContrasena: await this.d.derivacion.derivar(datos.contrasena),
        rol: datos.rol,
        habilitacion: datos.habilitacion,
        creadaEn: this.d.reloj.ahora(),
        intentosFallidos: 0,
        bloqueadaHasta: null,
      },
      tx,
    );
    return id;
  }

  private async emitir(credencial: Credencial, tx?: Transaccion): Promise<SesionEmitida> {
    const ahora = this.d.reloj.ahora();
    const secreto = this.d.secretos.generar();
    const sesionId = this.d.identificadores.generar();
    await this.d.repositorio.guardarSesion(
      {
        id: sesionId,
        credencialId: credencial.id,
        huella: this.d.secretos.huella(secreto),
        creadaEn: ahora,
        expiraEn: new Date(ahora.getTime() + VIDA_RENOVACION_SEGUNDOS * 1000),
        revocadaEn: null,
      },
      tx,
    );
    const reclamos: ReclamosAcceso = { credencialId: credencial.id, sesionId, rol: credencial.rol, cuentaId: credencial.cuentaId };
    return {
      credencialAcceso: this.d.firma.firmar(reclamos, VIDA_ACCESO_SEGUNDOS),
      expiraEnSegundos: VIDA_ACCESO_SEGUNDOS,
      rol: credencial.rol,
      credencialRenovacion: secreto,
      renovacionExpiraEnSegundos: VIDA_RENOVACION_SEGUNDOS,
    };
  }

  private obtenerHashReferencia(): Promise<string> {
    this.hashReferencia ??= this.d.derivacion.derivar(this.d.secretos.generar());
    return this.hashReferencia;
  }
}
