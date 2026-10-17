import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Configuracion } from '../../src/composicion/configuracion';

export const SECRETO_FIRMA_PRUEBA = 'secreto-de-firma-solo-para-pruebas-0123456789';

export function configuracionPrueba(urlBdApp: string, cambios: Partial<Configuracion['trabajador']> = {}): Configuracion {
  return {
    urlBdApp,
    secretoFirmaAcceso: SECRETO_FIRMA_PRUEBA,
    puertoApi: 0,
    origenWeb: 'http://localhost:5173',
    cookieSegura: false,
    proxiesConfiables: 0,
    limitePeticionesPorMinuto: 120,
    directorioDocumentos: mkdtempSync(path.join(tmpdir(), 'abasteceni-documentos-')),
    trabajador: { intervaloSondeoMs: 1000, tamanoLote: 20, whatsappSimuladoDisponible: true, canalNotificacion: 'whatsapp', ...cambios },
  };
}
