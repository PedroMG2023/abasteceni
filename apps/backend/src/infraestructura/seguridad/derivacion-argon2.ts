import argon2 from 'argon2';
import type { PuertoDerivacionClave } from '../../dominio/m2-seguridad';

// Derivación de la contraseña con argon2id (CLAUDE.md §9; V-03). Parámetros por
// defecto de la biblioteca: 64 MiB, 3 iteraciones, paralelismo 4, por encima del
// mínimo que recomienda OWASP.
export class DerivacionArgon2 implements PuertoDerivacionClave {
  derivar(contrasena: string): Promise<string> {
    return argon2.hash(contrasena, { type: argon2.argon2id });
  }

  async verificar(hash: string, contrasena: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, contrasena);
    } catch {
      return false;
    }
  }
}
