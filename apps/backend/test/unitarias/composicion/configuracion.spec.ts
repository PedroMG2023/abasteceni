import { leerConfiguracion } from '../../../src/composicion/configuracion';

const MINIMA = { URL_BD_APP: 'postgresql://app@localhost/abasteceni', SECRETO_FIRMA_ACCESO: 'x'.repeat(32) };

describe('Configuración por variables de entorno (CLAUDE.md §9; control 8.9 de ISO/IEC 27002:2022)', () => {
  it('falla al arrancar si falta la URL de la base o el secreto de firma', () => {
    expect(() => leerConfiguracion({ SECRETO_FIRMA_ACCESO: 'x' })).toThrow('Falta la variable de entorno URL_BD_APP.');
    expect(() => leerConfiguracion({ URL_BD_APP: 'u' })).toThrow('Falta la variable de entorno SECRETO_FIRMA_ACCESO.');
  });

  it('aplica valores seguros por defecto y el límite fijo de SYS-NFN-03', () => {
    expect(leerConfiguracion(MINIMA)).toEqual({
      urlBdApp: MINIMA.URL_BD_APP,
      secretoFirmaAcceso: MINIMA.SECRETO_FIRMA_ACCESO,
      puertoApi: 3000,
      origenWeb: 'http://localhost:5173',
      cookieSegura: true,
      proxiesConfiables: 0,
      limitePeticionesPorMinuto: 120,
      directorioDocumentos: 'almacen-documentos',
      trabajador: { intervaloSondeoMs: 1000, tamanoLote: 20, whatsappSimuladoDisponible: true, canalNotificacion: 'whatsapp' },
    });
  });

  it('admite ajustar el entorno de ejecución sin cambiar el límite de peticiones', () => {
    const configuracion = leerConfiguracion({
      ...MINIMA,
      PUERTO_API: '8080',
      ORIGEN_WEB: 'https://abasteceni.com.ni',
      COOKIE_SEGURA: 'false',
      PROXIES_CONFIABLES: '1',
      INTERVALO_SONDEO_MS: '500',
      TAMANO_LOTE_BANDEJA: '5',
      SIMULACION_WHATSAPP: 'caido',
      CANAL_NOTIFICACION: 'correo',
    });
    expect(configuracion).toMatchObject({ puertoApi: 8080, cookieSegura: false, proxiesConfiables: 1, limitePeticionesPorMinuto: 120 });
    expect(configuracion.trabajador).toEqual({ intervaloSondeoMs: 500, tamanoLote: 5, whatsappSimuladoDisponible: false, canalNotificacion: 'correo' });
  });
});
