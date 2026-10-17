// Configuración leída exclusivamente de variables de entorno (CLAUDE.md §9;
// control 8.9 de ISO/IEC 27002:2022). Falla al arrancar si falta un secreto.
export interface Configuracion {
  readonly urlBdApp: string;
  readonly secretoFirmaAcceso: string;
  readonly puertoApi: number;
  readonly origenWeb: string;
  readonly cookieSegura: boolean;
  readonly proxiesConfiables: number;
  readonly limitePeticionesPorMinuto: number;
  readonly trabajador: {
    readonly intervaloSondeoMs: number;
    readonly tamanoLote: number;
    readonly whatsappSimuladoDisponible: boolean;
  };
}

function obligatoria(entorno: NodeJS.ProcessEnv, nombre: string): string {
  const valor = entorno[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}

export function leerConfiguracion(entorno: NodeJS.ProcessEnv = process.env): Configuracion {
  return {
    urlBdApp: obligatoria(entorno, 'URL_BD_APP'),
    secretoFirmaAcceso: obligatoria(entorno, 'SECRETO_FIRMA_ACCESO'),
    puertoApi: Number(entorno.PUERTO_API ?? 3000),
    origenWeb: entorno.ORIGEN_WEB ?? 'http://localhost:5173',
    cookieSegura: entorno.COOKIE_SEGURA !== 'false',
    proxiesConfiables: Number(entorno.PROXIES_CONFIABLES ?? 0),
    // SYS-NFN-03: 120 peticiones por minuto por IP. No es configurable a la baja ni al alza en producción.
    limitePeticionesPorMinuto: 120,
    trabajador: {
      intervaloSondeoMs: Number(entorno.INTERVALO_SONDEO_MS ?? 1000),
      tamanoLote: Number(entorno.TAMANO_LOTE_BANDEJA ?? 20),
      whatsappSimuladoDisponible: entorno.SIMULACION_WHATSAPP !== 'caido',
    },
  };
}
