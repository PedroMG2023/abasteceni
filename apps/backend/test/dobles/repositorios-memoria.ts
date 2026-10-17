import type { CuentaComercial, EstadoCuenta, PuertoRepositorioUsuarios } from '../../src/dominio/m1-usuarios';
import type {
  Credencial,
  Habilitacion,
  PuertoDerivacionClave,
  PuertoFirmaAcceso,
  PuertoRepositorioSeguridad,
  PuertoSecretosRenovacion,
  ReclamosAcceso,
  SesionRenovacion,
} from '../../src/dominio/m2-seguridad';
import type { Transaccion } from '../../src/dominio/puertos';
import { comoTransaccionMemoria } from '../../src/infraestructura/persistencia/unidad-trabajo-memoria';

// Dobles de prueba de los puertos de M1 y M2. Las escrituras con transacción
// se aplican al confirmarla, como en PostgreSQL.
function alConfirmar(tx: Transaccion | undefined, accion: () => void): void {
  if (tx) comoTransaccionMemoria(tx).alConfirmar(accion);
  else accion();
}

export class RepositorioUsuariosMemoria implements PuertoRepositorioUsuarios {
  readonly cuentas = new Map<string, CuentaComercial>();

  async existeRuc(ruc: string): Promise<boolean> {
    return [...this.cuentas.values()].some((c) => c.ruc.numero === ruc);
  }

  async guardar(cuenta: CuentaComercial, tx: Transaccion): Promise<void> {
    alConfirmar(tx, () => this.cuentas.set(cuenta.id, cuenta));
  }

  async buscarPorId(id: string): Promise<CuentaComercial | null> {
    return this.cuentas.get(id) ?? null;
  }

  async listar(filtro: { estado?: EstadoCuenta }): Promise<CuentaComercial[]> {
    return [...this.cuentas.values()].filter((c) => !filtro.estado || c.estado === filtro.estado);
  }
}

export class RepositorioSeguridadMemoria implements PuertoRepositorioSeguridad {
  readonly credenciales = new Map<string, Credencial>();
  readonly sesiones = new Map<string, SesionRenovacion>();

  async existeCorreo(correo: string): Promise<boolean> {
    return [...this.credenciales.values()].some((c) => c.correo === correo);
  }

  async guardarCredencial(credencial: Credencial, tx: Transaccion): Promise<void> {
    alConfirmar(tx, () => this.credenciales.set(credencial.id, credencial));
  }

  async buscarCredencialPorCorreo(correo: string): Promise<Credencial | null> {
    return [...this.credenciales.values()].find((c) => c.correo === correo) ?? null;
  }

  async buscarCredencialPorId(id: string): Promise<Credencial | null> {
    return this.credenciales.get(id) ?? null;
  }

  async cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void> {
    alConfirmar(tx, () => {
      for (const [id, c] of this.credenciales) if (c.cuentaId === cuentaId) this.credenciales.set(id, { ...c, habilitacion });
    });
  }

  async registrarIntentoFallido(credencialId: string): Promise<number> {
    const c = this.credenciales.get(credencialId)!;
    this.credenciales.set(credencialId, { ...c, intentosFallidos: c.intentosFallidos + 1 });
    return c.intentosFallidos + 1;
  }

  async bloquear(credencialId: string, hasta: Date, tx: Transaccion): Promise<void> {
    alConfirmar(tx, () => {
      const c = this.credenciales.get(credencialId)!;
      this.credenciales.set(credencialId, { ...c, bloqueadaHasta: hasta, intentosFallidos: 0 });
    });
  }

  async reiniciarIntentos(credencialId: string): Promise<void> {
    const c = this.credenciales.get(credencialId)!;
    this.credenciales.set(credencialId, { ...c, intentosFallidos: 0 });
  }

  async guardarSesion(sesion: SesionRenovacion, tx?: Transaccion): Promise<void> {
    alConfirmar(tx, () => this.sesiones.set(sesion.id, sesion));
  }

  async buscarSesionPorHuella(huella: string): Promise<SesionRenovacion | null> {
    return [...this.sesiones.values()].find((s) => s.huella === huella) ?? null;
  }

  async revocarSesion(id: string, revocadaEn: Date, tx?: Transaccion): Promise<void> {
    alConfirmar(tx, () => {
      const sesion = this.sesiones.get(id);
      if (sesion) this.sesiones.set(id, { ...sesion, revocadaEn });
    });
  }
}

// Derivación reversible y rápida: solo para pruebas unitarias.
export class DerivacionFalsa implements PuertoDerivacionClave {
  readonly verificaciones: string[] = [];

  async derivar(contrasena: string): Promise<string> {
    return `derivada:${contrasena}`;
  }

  async verificar(hash: string, contrasena: string): Promise<boolean> {
    this.verificaciones.push(hash);
    return hash === `derivada:${contrasena}`;
  }
}

export class FirmaFalsa implements PuertoFirmaAcceso {
  private readonly emitidas = new Map<string, ReclamosAcceso>();

  firmar(reclamos: ReclamosAcceso, vidaSegundos: number): string {
    const credencial = `firmada:${reclamos.sesionId}:${vidaSegundos}`;
    this.emitidas.set(credencial, reclamos);
    return credencial;
  }

  verificar(credencial: string): ReclamosAcceso | null {
    return this.emitidas.get(credencial) ?? null;
  }
}

export class SecretosSecuenciales implements PuertoSecretosRenovacion {
  private siguiente = 0;

  generar(): string {
    this.siguiente += 1;
    return `secreto-${this.siguiente}`;
  }

  huella(secreto: string): string {
    return `huella(${secreto})`;
  }
}
