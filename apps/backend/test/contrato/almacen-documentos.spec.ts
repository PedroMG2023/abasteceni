import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PuertoAlmacenDocumentos } from '../../src/dominio/puertos';
import { AlmacenDocumentosArchivos } from '../../src/infraestructura/almacen-documentos/almacen-archivos';
import { AlmacenDocumentosMemoria } from '../../src/infraestructura/almacen-documentos/almacen-memoria';
import { PDF_MINIMO } from '../unitarias/datos';

const CLAVE = '00000000-0000-4000-8000-0000000000d1';

// Suite de contrato del almacén de documentos (AS-13; SYS-FN-02).
function contratoAlmacen(nombre: string, crear: () => PuertoAlmacenDocumentos) {
  describe(`Contrato del almacén de documentos — ${nombre}`, () => {
    it('guarda y devuelve el documento con su tipo, y lo elimina', async () => {
      const almacen = crear();
      await almacen.guardar(CLAVE, { contenido: PDF_MINIMO, tipo: 'application/pdf' });

      expect(await almacen.obtener(CLAVE)).toEqual({ contenido: PDF_MINIMO, tipo: 'application/pdf' });
      await almacen.eliminar(CLAVE);
      expect(await almacen.obtener(CLAVE)).toBeNull();
      await expect(almacen.eliminar(CLAVE)).resolves.toBeUndefined();
    });

    it('no sobrescribe un documento existente', async () => {
      const almacen = crear();
      await almacen.guardar(CLAVE, { contenido: PDF_MINIMO, tipo: 'application/pdf' });
      await expect(almacen.guardar(CLAVE, { contenido: new Uint8Array([1]), tipo: 'image/jpeg' })).rejects.toThrow();
    });
  });
}

contratoAlmacen('memoria', () => new AlmacenDocumentosMemoria());
contratoAlmacen('sistema de archivos', () => new AlmacenDocumentosArchivos(mkdtempSync(path.join(tmpdir(), 'almacen-'))));

describe('Almacén en el sistema de archivos', () => {
  it('rechaza claves que no son UUID, lo que impide el recorrido de rutas', async () => {
    const almacen = new AlmacenDocumentosArchivos(mkdtempSync(path.join(tmpdir(), 'almacen-')));
    await expect(almacen.obtener('../../etc/passwd')).rejects.toThrow('Clave de documento inválida.');
    await expect(almacen.guardar('x', { contenido: PDF_MINIMO, tipo: 'application/pdf' })).rejects.toThrow(RangeError);
  });

  it('crea los archivos solo legibles por el proceso', async () => {
    const directorio = mkdtempSync(path.join(tmpdir(), 'almacen-'));
    await new AlmacenDocumentosArchivos(directorio).guardar(CLAVE, { contenido: PDF_MINIMO, tipo: 'application/pdf' });
    expect(statSync(path.join(directorio, CLAVE)).mode & 0o777).toBe(0o600);
  });
});
