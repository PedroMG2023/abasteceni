import jwt from 'jsonwebtoken';
import { ROLES, type PuertoFirmaAcceso, type ReclamosAcceso, type Rol } from '../../dominio/m2-seguridad';

const EMISOR = 'abasteceni';
const AUDIENCIA = 'abasteceni-api';

// Credencial de acceso firmada con HMAC-SHA256 (ADR-04). El secreto llega por
// variable de entorno (CLAUDE.md §9).
export class FirmaJwt implements PuertoFirmaAcceso {
  constructor(private readonly secreto: string) {
    if (Buffer.byteLength(secreto) < 32) throw new Error('El secreto de firma debe tener al menos 32 bytes.');
  }

  firmar(reclamos: ReclamosAcceso, vidaSegundos: number): string {
    return jwt.sign({ rol: reclamos.rol, sid: reclamos.sesionId, cuenta: reclamos.cuentaId }, this.secreto, {
      algorithm: 'HS256',
      subject: reclamos.credencialId,
      issuer: EMISOR,
      audience: AUDIENCIA,
      expiresIn: vidaSegundos,
    });
  }

  verificar(credencial: string): ReclamosAcceso | null {
    try {
      const datos = jwt.verify(credencial, this.secreto, { algorithms: ['HS256'], issuer: EMISOR, audience: AUDIENCIA });
      if (typeof datos === 'string' || !datos.sub || typeof datos.sid !== 'string') return null;
      if (!(ROLES as readonly string[]).includes(datos.rol)) return null;
      return { credencialId: datos.sub, sesionId: datos.sid, rol: datos.rol as Rol, cuentaId: (datos.cuenta as string | null) ?? null };
    } catch {
      return null;
    }
  }
}
