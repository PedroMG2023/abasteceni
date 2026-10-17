import { createHash, randomBytes } from 'node:crypto';
import type { PuertoSecretosRenovacion } from '../../dominio/m2-seguridad';

// Credencial de renovación: 256 bits aleatorios; se guarda solo su huella SHA-256 (ADR-04).
export class SecretosRenovacionCripto implements PuertoSecretosRenovacion {
  generar(): string {
    return randomBytes(32).toString('base64url');
  }

  huella(secreto: string): string {
    return createHash('sha256').update(secreto).digest('hex');
  }
}
