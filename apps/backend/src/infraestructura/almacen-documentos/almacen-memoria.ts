import type { DocumentoAlmacenado, PuertoAlmacenDocumentos } from '../../dominio/puertos';

// Almacén de documentos en memoria, con el mismo contrato que el de archivos.
export class AlmacenDocumentosMemoria implements PuertoAlmacenDocumentos {
  readonly documentos = new Map<string, DocumentoAlmacenado>();

  async guardar(clave: string, documento: DocumentoAlmacenado): Promise<void> {
    if (this.documentos.has(clave)) throw new Error('El documento ya existe.');
    this.documentos.set(clave, { contenido: new Uint8Array(documento.contenido), tipo: documento.tipo });
  }

  async obtener(clave: string): Promise<DocumentoAlmacenado | null> {
    return this.documentos.get(clave) ?? null;
  }

  async eliminar(clave: string): Promise<void> {
    this.documentos.delete(clave);
  }
}
