import {
  ErrorAccesoDenegado,
  ErrorAutenticacion,
  ErrorConflicto,
  ErrorValidacion,
  type PuertoIdentificadores,
  type PuertoReloj,
  type PuertoUnidadTrabajo,
  type Transaccion,
} from '../puertos';
import { sesionVigente, type Credencial, type Habilitacion } from './credencial';
import { normalizarCorreo, validarDatosCredencial, VIDA_ACCESO_SEGUNDOS, VIDA_RENOVACION_SEGUNDOS } from './politica';
import type {
  PuertoDerivacionClave,
  PuertoFirmaAcceso,
  PuertoRepositorioSeguridad,
  PuertoSecretosRenovacion,
  ReclamosAcceso,
} from './puertos';
import type { Rol } from './rol';

export interface DependenciasSeguridad {
  repositorio: PuertoRepositorioSeguridad;
  unidadTrabajo: PuertoUnidadTrabajo;
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

// Interfaz que M1 consume de M2 al registrar una cuenta (V-02: M1 → M2 identidad).
export interface RegistroCredenciales {
  validarDatosCredencial(datos: { correo?: string; contrasena?: string }): ReturnType<typeof validarDatosCredencial>;
  registrarCredencial(datos: DatosCredencialCuenta, tx: Transaccion): Promise<void>;
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

  async registrarCredencial(datos: DatosCredencialCuenta, tx: Transaccion): Promise<void> {
    await this.crearCredencial({ ...datos, habilitacion: 'pendiente' }, tx);
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
    const hash = credencial?.hashContrasena ?? (await this.obtenerHashReferencia());
    const valida = await this.d.derivacion.verificar(hash, datos.contrasena);
    if (!credencial || !valida) throw new ErrorAutenticacion('CREDENCIALES_INVALIDAS');
    this.exigirHabilitada(credencial);
    return this.emitir(credencial);
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
  ): Promise<void> {
    const detalles = validarDatosCredencial(datos);
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const correo = normalizarCorreo(datos.correo);
    if (await this.d.repositorio.existeCorreo(correo, tx)) throw new ErrorConflicto('CORREO_REGISTRADO');
    await this.d.repositorio.guardarCredencial(
      {
        id: this.d.identificadores.generar(),
        cuentaId: datos.cuentaId,
        correo,
        hashContrasena: await this.d.derivacion.derivar(datos.contrasena),
        rol: datos.rol,
        habilitacion: datos.habilitacion,
        creadaEn: this.d.reloj.ahora(),
      },
      tx,
    );
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
