import type { EventoDominio, PuertoDespachoEventos } from '../../../src/dominio/puertos';
import { BandejaSalidaMemoria } from '../../../src/infraestructura/bandeja-salida/bandeja-salida-memoria';
import { esperaReintentoMs } from '../../../src/infraestructura/bandeja-salida/bandeja-salida';
import { UnidadTrabajoMemoria } from '../../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import { SondeoBandeja } from '../../../src/infraestructura/sondeo/sondeo-bandeja';
import { RelojFijo } from '../../dobles/sistema';

class DespachoRegistrador implements PuertoDespachoEventos {
  readonly despachados: string[] = [];
  fallar = false;
  async despachar(evento: EventoDominio): Promise<void> {
    if (this.fallar) throw new Error('canal caído');
    this.despachados.push(evento.id);
  }
}

async function bandejaCon(...ids: string[]) {
  const bandeja = new BandejaSalidaMemoria();
  await new UnidadTrabajoMemoria().ejecutar(async (tx) => {
    for (const id of ids) await bandeja.publicar({ id, tipo: 'T', ocurridoEn: new Date(), datos: {} }, tx);
  });
  return bandeja;
}

describe('AS-02 · sondeo de la bandeja como pieza independiente del despacho', () => {
  it('entrega los pendientes en orden y no los repite', async () => {
    const despacho = new DespachoRegistrador();
    const sondeo = new SondeoBandeja(await bandejaCon('e1', 'e2', 'e3'), despacho, new RelojFijo(), { intervaloMs: 10, tamanoLote: 2 });

    expect(await sondeo.procesarLote()).toEqual({ publicados: 2, fallidos: 0 });
    expect(await sondeo.procesarLote()).toEqual({ publicados: 1, fallidos: 0 });
    expect(await sondeo.procesarLote()).toEqual({ publicados: 0, fallidos: 0 });
    expect(despacho.despachados).toEqual(['e1', 'e2', 'e3']);
  });

  it('un fallo deja el evento pendiente y lo reintenta después de la espera', async () => {
    const despacho = new DespachoRegistrador();
    const reloj = new RelojFijo();
    const bandeja = await bandejaCon('e1');
    const sondeo = new SondeoBandeja(bandeja, despacho, reloj, { intervaloMs: 10, tamanoLote: 10 });

    despacho.fallar = true;
    expect(await sondeo.procesarLote()).toEqual({ publicados: 0, fallidos: 1 });
    expect(bandeja.entradas[0]).toMatchObject({ intentos: 1, ultimoError: 'Error', publicadoEn: null });

    despacho.fallar = false;
    expect(await sondeo.procesarLote()).toEqual({ publicados: 0, fallidos: 0 });
    reloj.avanzar(esperaReintentoMs(1));
    expect(await sondeo.procesarLote()).toEqual({ publicados: 1, fallidos: 0 });
  });

  it('la espera entre reintentos crece y se acota a 60 s', () => {
    expect([1, 2, 3, 4].map(esperaReintentoMs)).toEqual([1000, 2000, 4000, 8000]);
    expect(esperaReintentoMs(20)).toBe(60_000);
  });

  it('iniciar sondea periódicamente y detener espera al ciclo en curso', async () => {
    const despacho = new DespachoRegistrador();
    const fallos: unknown[] = [];
    const sondeo = new SondeoBandeja(await bandejaCon('e1'), despacho, new RelojFijo(), { intervaloMs: 5, tamanoLote: 10 }, (e) => fallos.push(e));

    sondeo.iniciar();
    await new Promise((r) => setTimeout(r, 30));
    await sondeo.detener();

    expect(despacho.despachados).toEqual(['e1']);
    expect(fallos).toEqual([]);
  });

  it('un ciclo que falla se informa y el sondeo continúa', async () => {
    const fallos: unknown[] = [];
    const bandeja = { publicar: async () => undefined, entregarPendientes: async () => Promise.reject(new Error('sin conexión')) };
    const sondeo = new SondeoBandeja(bandeja, new DespachoRegistrador(), new RelojFijo(), { intervaloMs: 5, tamanoLote: 1 }, (e) => fallos.push(e));

    sondeo.iniciar();
    await new Promise((r) => setTimeout(r, 25));
    await sondeo.detener();

    expect(fallos.length).toBeGreaterThan(1);
  });
});
