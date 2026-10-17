// Almacén de documentos (AS-13; SYS-FN-02): guarda el registro legal fuera de
// la base de datos (MD-05, «almacén de objetos»).
export interface DocumentoAlmacenado {
  readonly contenido: Uint8Array;
  readonly tipo: string;
}

export interface PuertoAlmacenDocumentos {
  guardar(clave: string, documento: DocumentoAlmacenado): Promise<void>;
  obtener(clave: string): Promise<DocumentoAlmacenado | null>;
  // Compensación cuando la transacción que referencia el documento se revierte.
  eliminar(clave: string): Promise<void>;
}
