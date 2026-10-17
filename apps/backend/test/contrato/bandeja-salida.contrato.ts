import type { EventoDominio, PuertoUnidadTrabajo } from '../../src/dominio/puertos';
import type { BandejaSalida } from '../../src/infraestructura/bandeja-salida/bandeja-salida';

export interface ImplementacionBandeja {
  nombre: string;
  crear(): Promise<{ bandeja: BandejaSalida; unidadTrabajo: PuertoUnidadTrabajo }>;
}

const evento = (id: string): EventoDominio => ({
  id,
  tipo: 'CuentaRegistrada',
  ocurridoEn: new Date('2026-10-17T12:00:00.000Z'),
  datos: { cuentaId: `c-${id}` },
});

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Suite de contrato única del puerto de la bandeja de salida (AS-10, principio
// de sustitución): se ejecuta contra cada implementación sin cambios.
export function contratoBandejaSalida(implementacion: ImplementacionBandeja): void {
  describe(`AS-10 · contrato de la bandeja de salida — ${implementacion.nombre}`, () => {
    const ahora = new Date('2026-10-17T12:00:01.000Z');
    const entregados = async (bandeja: BandejaSalida) => {
      const recibidos: EventoDominio[] = [];
      await bandeja.entregarPendientes(async (e) => void recibidos.push(e), { limite: 100, ahora });
      return recibidos;
    };

    it('persiste dentro de la transacción recibida y entrega en orden de publicación', async () => {
      const { bandeja, unidadTrabajo } = await implementacion.crear();
      await unidadTrabajo.ejecutar(async (tx) => {
        await bandeja.publicar(evento(ID(1)), tx);
        await bandeja.publicar(evento(ID(2)), tx);
      });
      await unidadTrabajo.ejecutar((tx) => bandeja.publicar(evento(ID(3)), tx));

      const recibidos = await entregados(bandeja);

      expect(recibidos.map((e) => e.id)).toEqual([ID(1), ID(2), ID(3)]);
      expect(recibidos[0]).toEqual(evento(ID(1)));
    });

    it('no entrega el evento de una transacción revertida', async () => {
      const { bandeja, unidadTrabajo } = await implementacion.crear();
      await expect(
        unidadTrabajo.ejecutar(async (tx) => {
          await bandeja.publicar(evento(ID(4)), tx);
          throw new Error('cambio de estado fallido');
        }),
      ).rejects.toThrow('cambio de estado fallido');

      expect(await entregados(bandeja)).toEqual([]);
    });

    it('un evento entregado no se vuelve a entregar', async () => {
      const { bandeja, unidadTrabajo } = await implementacion.crear();
      await unidadTrabajo.ejecutar((tx) => bandeja.publicar(evento(ID(5)), tx));

      expect(await entregados(bandeja)).toHaveLength(1);
      expect(await entregados(bandeja)).toHaveLength(0);
    });

    it('un fallo de entrega deja el evento pendiente hasta que vence su reintento', async () => {
      const { bandeja, unidadTrabajo } = await implementacion.crear();
      await unidadTrabajo.ejecutar((tx) => bandeja.publicar(evento(ID(6)), tx));

      const fallido = await bandeja.entregarPendientes(async () => Promise.reject(new Error('caído')), { limite: 10, ahora });
      expect(fallido).toEqual({ publicados: 0, fallidos: 1 });
      expect(await entregados(bandeja)).toHaveLength(0);

      const despues = new Date(ahora.getTime() + 60_000);
      const recibidos: EventoDominio[] = [];
      await bandeja.entregarPendientes(async (e) => void recibidos.push(e), { limite: 10, ahora: despues });
      expect(recibidos.map((e) => e.id)).toEqual([ID(6)]);
    });

    it('respeta el límite del lote', async () => {
      const { bandeja, unidadTrabajo } = await implementacion.crear();
      await unidadTrabajo.ejecutar(async (tx) => {
        for (const n of [7, 8, 9]) await bandeja.publicar(evento(ID(n)), tx);
      });

      const resultado = await bandeja.entregarPendientes(async () => undefined, { limite: 2, ahora });

      expect(resultado).toEqual({ publicados: 2, fallidos: 0 });
    });
  });
}
