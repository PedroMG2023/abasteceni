import type { AsientoBitacora, PuertoBitacora, PuertoUnidadTrabajo } from '../../src/dominio/puertos';

export interface ImplementacionBitacora {
  nombre: string;
  crear(): Promise<{ bitacora: PuertoBitacora; unidadTrabajo: PuertoUnidadTrabajo; leer(): Promise<AsientoBitacora[]> }>;
}

const asiento = (n: number): AsientoBitacora => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  usuarioId: '00000000-0000-4000-8000-0000000000a1',
  accion: 'CUENTA_APROBADA',
  recurso: { tipo: 'CuentaComercial', id: '00000000-0000-4000-8000-0000000000c1' },
  detalle: { resultado: 'Activa' },
  ip: '198.51.100.20',
  registradoEn: new Date('2026-10-17T12:00:00.000Z'),
});

// Suite de contrato única del puerto de bitácora (AS-08, principio de
// sustitución; AS-12: el puerto solo declara registrar).
export function contratoBitacora(implementacion: ImplementacionBitacora): void {
  describe(`AS-08 · contrato del puerto de bitácora — ${implementacion.nombre}`, () => {
    it('el puerto solo ofrece registrar (AS-12)', async () => {
      const { bitacora } = await implementacion.crear();
      const operaciones = Object.getOwnPropertyNames(Object.getPrototypeOf(bitacora)).filter((n) => n !== 'constructor');
      expect(operaciones.filter((n) => !n.startsWith('_') && typeof (bitacora as unknown as Record<string, unknown>)[n] === 'function')).toEqual(['registrar']);
    });

    it('conserva cada asiento con usuario, acción, recurso, detalle, IP y marca temporal (SYS-FN-35)', async () => {
      const { bitacora, unidadTrabajo, leer } = await implementacion.crear();

      await unidadTrabajo.ejecutar((tx) => bitacora.registrar(asiento(1), tx));

      expect(await leer()).toEqual([asiento(1)]);
    });

    it('el asiento se confirma o se revierte con la transacción del cambio de estado', async () => {
      const { bitacora, unidadTrabajo, leer } = await implementacion.crear();

      await expect(
        unidadTrabajo.ejecutar(async (tx) => {
          await bitacora.registrar(asiento(2), tx);
          throw new Error('cambio de estado fallido');
        }),
      ).rejects.toThrow('cambio de estado fallido');

      expect(await leer()).toEqual([]);
    });
  });
}
