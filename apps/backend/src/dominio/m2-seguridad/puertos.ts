import type { Transaccion } from '../puertos';
import type { Credencial, Habilitacion, SesionRenovacion } from './credencial';
import type { Rol } from './rol';

// Puerto de persistencia de M2: uno por módulo (R-04, patrón graduado).
export interface PuertoRepositorioSeguridad {
  existeCorreo(correo: string, tx: Transaccion): Promise<boolean>;
  guardarCredencial(credencial: Credencial, tx: Transaccion): Promise<void>;
  buscarCredencialPorCorreo(correo: string): Promise<Credencial | null>;
  buscarCredencialPorId(id: string, tx?: Transaccion): Promise<Credencial | null>;
  cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void>;
  guardarSesion(sesion: SesionRenovacion, tx?: Transaccion): Promise<void>;
  buscarSesionPorHuella(huella: string, tx?: Transaccion): Promise<SesionRenovacion | null>;
  revocarSesion(id: string, revocadaEn: Date, tx?: Transaccion): Promise<void>;
}

// Derivación de clave con argon2id (V-03): la contraseña nunca se guarda.
export interface PuertoDerivacionClave {
  derivar(contrasena: string): Promise<string>;
  verificar(hash: string, contrasena: string): Promise<boolean>;
}

export interface ReclamosAcceso {
  readonly credencialId: string;
  readonly sesionId: string;
  readonly rol: Rol;
  readonly cuentaId: string | null;
}

// Firma y verificación de la credencial de acceso de vida corta (ADR-04).
export interface PuertoFirmaAcceso {
  firmar(reclamos: ReclamosAcceso, vidaSegundos: number): string;
  // Devuelve null si la firma no es válida o la credencial expiró.
  verificar(credencial: string): ReclamosAcceso | null;
}

// Secretos de la credencial de renovación y su huella (ADR-04).
export interface PuertoSecretosRenovacion {
  generar(): string;
  huella(secreto: string): string;
}
