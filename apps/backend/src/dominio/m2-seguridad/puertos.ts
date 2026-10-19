import type { Transaccion } from '../puertos';
import type { Credencial, Habilitacion, SesionRenovacion, SolicitudRecuperacion } from './credencial';
import type { Rol } from './rol';

// Puerto de persistencia de M2: uno por módulo (R-04, patrón graduado).
export interface PuertoRepositorioSeguridad {
  existeCorreo(correo: string, tx: Transaccion): Promise<boolean>;
  guardarCredencial(credencial: Credencial, tx: Transaccion): Promise<void>;
  buscarCredencialPorCorreo(correo: string): Promise<Credencial | null>;
  buscarCredencialPorId(id: string, tx?: Transaccion): Promise<Credencial | null>;
  cambiarHabilitacion(cuentaId: string, habilitacion: Habilitacion, tx: Transaccion): Promise<void>;
  // SYS-FN-07: incremento atómico; devuelve el número de intentos fallidos consecutivos.
  registrarIntentoFallido(credencialId: string, tx: Transaccion): Promise<number>;
  bloquear(credencialId: string, hasta: Date, tx: Transaccion): Promise<void>;
  reiniciarIntentos(credencialId: string): Promise<void>;
  guardarSesion(sesion: SesionRenovacion, tx?: Transaccion): Promise<void>;
  buscarSesionPorHuella(huella: string, tx?: Transaccion): Promise<SesionRenovacion | null>;
  revocarSesion(id: string, revocadaEn: Date, tx?: Transaccion): Promise<void>;
  // SYS-FN-08 (DIS-37): bloquea la credencial para serializar los inicios de
  // sesión simultáneos y devuelve sus sesiones vigentes, de la más antigua a la más reciente.
  listarSesionesVigentes(credencialId: string, ahora: Date, tx: Transaccion): Promise<SesionRenovacion[]>;
  desplazarSesion(id: string, revocadaEn: Date, tx: Transaccion): Promise<void>;
  // SYS-FN-05 (DIS-36): recuperación de la contraseña.
  revocarSesionesDe(credencialId: string, revocadaEn: Date, tx: Transaccion): Promise<void>;
  anularRecuperaciones(credencialId: string, anuladaEn: Date, tx: Transaccion): Promise<void>;
  guardarRecuperacion(solicitud: SolicitudRecuperacion, tx: Transaccion): Promise<void>;
  buscarRecuperacionPorHuella(huella: string, tx: Transaccion): Promise<SolicitudRecuperacion | null>;
  marcarRecuperacionUsada(id: string, usadaEn: Date, tx: Transaccion): Promise<void>;
  // Fija la contraseña nueva, reinicia los intentos y levanta el bloqueo.
  restablecerContrasena(credencialId: string, hashContrasena: string, tx: Transaccion): Promise<void>;
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
