import jwt from 'jsonwebtoken';
import { DerivacionArgon2 } from '../../../src/infraestructura/seguridad/derivacion-argon2';
import { FirmaJwt } from '../../../src/infraestructura/seguridad/firma-jwt';
import { SecretosRenovacionCripto } from '../../../src/infraestructura/seguridad/secretos-renovacion';

const SECRETO = 'secreto-de-firma-solo-para-pruebas-0123456789';
const RECLAMOS = { credencialId: 'cr-1', sesionId: 's-1', rol: 'Comprador' as const, cuentaId: 'c-1' };

describe('Adaptadores de seguridad (ADR-04, V-03)', () => {
  it('argon2id deriva una huella que no contiene la contraseña y la verifica', async () => {
    const derivacion = new DerivacionArgon2();
    const hash = await derivacion.derivar('una-clave-de-doce');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('una-clave-de-doce');
    expect(await derivacion.verificar(hash, 'una-clave-de-doce')).toBe(true);
    expect(await derivacion.verificar(hash, 'otra-clave-distinta')).toBe(false);
    expect(await derivacion.verificar('no-es-una-huella', 'x')).toBe(false);
  });

  it('la credencial de acceso firmada se verifica y conserva los reclamos', () => {
    const firma = new FirmaJwt(SECRETO);
    expect(firma.verificar(firma.firmar(RECLAMOS, 900))).toEqual(RECLAMOS);
  });

  it('rechaza una credencial alterada, vencida, de otro secreto o con algoritmo distinto', () => {
    const firma = new FirmaJwt(SECRETO);
    const valida = firma.firmar(RECLAMOS, 900);

    expect(firma.verificar(`${valida}x`)).toBeNull();
    expect(firma.verificar(firma.firmar(RECLAMOS, -1))).toBeNull();
    expect(new FirmaJwt('otro-secreto-de-firma-de-al-menos-32-bytes').verificar(valida)).toBeNull();
    const sinFirma = jwt.sign({ rol: 'Administrador', sid: 's' }, '', { algorithm: 'none', subject: 'x', issuer: 'abasteceni', audience: 'abasteceni-api' });
    expect(firma.verificar(sinFirma)).toBeNull();
    const rolAjeno = jwt.sign({ rol: 'Superusuario', sid: 's' }, SECRETO, { subject: 'x', issuer: 'abasteceni', audience: 'abasteceni-api' });
    expect(firma.verificar(rolAjeno)).toBeNull();
  });

  it('exige un secreto de firma de al menos 32 bytes', () => {
    expect(() => new FirmaJwt('corto')).toThrow(/32 bytes/);
  });

  it('la credencial de renovación es aleatoria y su huella SHA-256 es determinista', () => {
    const secretos = new SecretosRenovacionCripto();
    const a = secretos.generar();

    expect(a).not.toBe(secretos.generar());
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
    expect(secretos.huella(a)).toBe(secretos.huella(a));
    expect(secretos.huella(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
