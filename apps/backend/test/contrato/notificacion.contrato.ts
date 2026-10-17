import { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from '../../src/dominio/puertos';

export interface ImplementacionNotificador {
  nombre: string;
  canal: string;
  // Crea el adaptador con su proveedor externo simulado y permite simular su caída.
  crear(): { notificador: PuertoNotificacion; caer(): void; entregados(): { destino: string; texto: string }[] };
}

const NOTIFICACION: Notificacion = {
  destinatario: { telefonoMovil: '+50588887777', correo: 'compras@farmacia.ni' },
  mensaje: 'AbasteceNi: recibimos su solicitud de cuenta comercial; está pendiente de validación.',
};

// Suite de contrato única del puerto de notificación (AS-09): todo adaptador
// entrega por su canal y, si el proveedor falla, rechaza con el tipo de error
// que interpreta el interruptor de circuito (ADR-02).
export function contratoNotificacion(implementacion: ImplementacionNotificador): void {
  describe(`AS-09 · contrato del puerto de notificación — ${implementacion.nombre}`, () => {
    it('entrega el mensaje al destinatario por su canal', async () => {
      const { notificador, entregados } = implementacion.crear();

      await notificador.notificar(NOTIFICACION);

      expect(entregados()).toHaveLength(1);
      expect(entregados()[0].texto).toBe(NOTIFICACION.mensaje);
    });

    it('si el proveedor falla rechaza con ErrorEntregaNotificacion de su canal', async () => {
      const { notificador, caer, entregados } = implementacion.crear();
      caer();

      const error = await notificador.notificar(NOTIFICACION).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorEntregaNotificacion);
      expect((error as ErrorEntregaNotificacion).canal).toBe(implementacion.canal);
      expect((error as Error).cause).toBeInstanceOf(Error);
      expect(entregados()).toHaveLength(0);
    });
  });
}
