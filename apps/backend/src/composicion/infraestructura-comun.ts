import { Inject, Injectable, type OnApplicationShutdown, type Provider } from '@nestjs/common';
import { crearBaseDatos, type BaseDatos } from '../infraestructura/persistencia/base-datos';
import { UnidadTrabajoPg } from '../infraestructura/persistencia/unidad-trabajo-pg';
import { IdentificadoresUuid } from '../infraestructura/sistema/identificadores-uuid';
import { RelojSistema } from '../infraestructura/sistema/reloj-sistema';
import { SIMBOLOS } from '../aplicacion/simbolos';
import type { Configuracion } from './configuracion';

export const CONFIGURACION = Symbol('Configuracion');
export const BASE_DATOS = Symbol('BaseDatos');
export const UNIDAD_TRABAJO = Symbol('PuertoUnidadTrabajo');
export const IDENTIFICADORES = Symbol('PuertoIdentificadores');

// Conexión compartida del proceso; se cierra al detenerlo.
@Injectable()
export class ConexionBaseDatos implements OnApplicationShutdown {
  readonly db: BaseDatos;
  private readonly cerrar: () => Promise<void>;

  constructor(@Inject(CONFIGURACION) configuracion: Configuracion) {
    const { db, pool } = crearBaseDatos(configuracion.urlBdApp);
    this.db = db;
    this.cerrar = () => pool.end();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.cerrar();
  }
}

// Proveedores comunes a la API y al trabajador.
export function proveedoresComunes(configuracion: Configuracion): Provider[] {
  return [
    { provide: CONFIGURACION, useValue: configuracion },
    ConexionBaseDatos,
    { provide: BASE_DATOS, useFactory: (c: ConexionBaseDatos) => c.db, inject: [ConexionBaseDatos] },
    { provide: SIMBOLOS.reloj, useClass: RelojSistema },
    { provide: IDENTIFICADORES, useClass: IdentificadoresUuid },
    { provide: UNIDAD_TRABAJO, useFactory: (db: BaseDatos) => new UnidadTrabajoPg(db), inject: [BASE_DATOS] },
  ];
}
