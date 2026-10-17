import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DocumentoAlmacenado, PuertoAlmacenDocumentos } from '../../dominio/puertos';

// La clave es siempre un UUID: impide el recorrido de rutas (OWASP ASVS V12).
const PATRON_CLAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Almacén de documentos en el sistema de archivos, para desarrollo y pruebas de
// sistema. En producción lo sustituye un adaptador de almacén de objetos con
// cifrado en reposo (MD-05, ADR-09, SYS-NFN-01) bajo el mismo puerto.
export class AlmacenDocumentosArchivos implements PuertoAlmacenDocumentos {
  constructor(private readonly directorio: string) {}

  private rutas(clave: string) {
    if (!PATRON_CLAVE.test(clave)) throw new RangeError('Clave de documento inválida.');
    const base = path.join(this.directorio, clave);
    return { contenido: base, tipo: `${base}.tipo` };
  }

  async guardar(clave: string, documento: DocumentoAlmacenado): Promise<void> {
    const rutas = this.rutas(clave);
    await mkdir(this.directorio, { recursive: true, mode: 0o700 });
    await writeFile(rutas.contenido, documento.contenido, { flag: 'wx', mode: 0o600 });
    await writeFile(rutas.tipo, documento.tipo, { flag: 'wx', mode: 0o600 });
  }

  async obtener(clave: string): Promise<DocumentoAlmacenado | null> {
    const rutas = this.rutas(clave);
    try {
      const [contenido, tipo] = await Promise.all([readFile(rutas.contenido), readFile(rutas.tipo, 'utf8')]);
      return { contenido: new Uint8Array(contenido), tipo };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async eliminar(clave: string): Promise<void> {
    const rutas = this.rutas(clave);
    await Promise.all([rm(rutas.contenido, { force: true }), rm(rutas.tipo, { force: true })]);
  }
}
