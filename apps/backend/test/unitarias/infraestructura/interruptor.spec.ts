import { ErrorEntregaNotificacion, type Notificacion } from '../../../src/dominio/puertos';
import { ErrorCircuitoAbierto, NotificadorConInterruptor, type EstadoCircuito } from '../../../src/infraestructura/notificacion/interruptor';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../../../src/infraestructura/notificacion/whatsapp';

const NOTIFICACION: Notificacion = { destinatario: { telefonoMovil: '+50588887777', correo: 'a@b.ni' }, mensaje: 'hola' };
const OPCIONES = { tiempoMaximoMs: 500, umbralErroresPorcentaje: 50, volumenMinimo: 3, reaperturaMs: 50, ventanaMs: 10_000 };

function crear() {
  const proveedor = new ProveedorWhatsAppSimulado();
  const estados: EstadoCircuito[] = [];
  const interruptor = new NotificadorConInterruptor(new NotificadorWhatsApp(proveedor), 'whatsapp', OPCIONES, (e) => estados.push(e));
  return { proveedor, interruptor, estados };
}

describe('ADR-02 · interruptor de circuito sobre el adaptador de WhatsApp', () => {
  let actual: NotificadorConInterruptor | undefined;
  afterEach(() => actual?.apagar());

  it('con el proveedor disponible entrega y el circuito permanece cerrado', async () => {
    const { proveedor, interruptor } = crear();
    actual = interruptor;

    await interruptor.notificar(NOTIFICACION);

    expect(proveedor.entregados).toEqual([{ telefonoMovil: '+50588887777', texto: 'hola' }]);
    expect(interruptor.estado).toBe('cerrado');
  });

  it('el circuito abre ante el fallo simulado del proveedor y luego falla rápido sin llamarlo', async () => {
    const { proveedor, interruptor, estados } = crear();
    actual = interruptor;
    proveedor.disponible = false;

    for (let i = 0; i < 3; i++) await expect(interruptor.notificar(NOTIFICACION)).rejects.toBeInstanceOf(ErrorEntregaNotificacion);
    expect(interruptor.estado).toBe('abierto');
    expect(estados).toEqual(['abierto']);

    const llamadas = proveedor.llamadas;
    const error = await interruptor.notificar(NOTIFICACION).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorCircuitoAbierto);
    expect(error).toBeInstanceOf(ErrorEntregaNotificacion);
    expect(proveedor.llamadas).toBe(llamadas);
  });

  it('pasado el tiempo de reapertura prueba de nuevo y cierra si el proveedor se recupera', async () => {
    const { proveedor, interruptor, estados } = crear();
    actual = interruptor;
    proveedor.disponible = false;
    for (let i = 0; i < 3; i++) await interruptor.notificar(NOTIFICACION).catch(() => undefined);

    proveedor.disponible = true;
    await new Promise((r) => setTimeout(r, OPCIONES.reaperturaMs + 20));
    expect(interruptor.estado).toBe('semiabierto');
    await interruptor.notificar(NOTIFICACION);

    expect(interruptor.estado).toBe('cerrado');
    expect(estados).toEqual(['abierto', 'semiabierto', 'cerrado']);
  });

  it('convierte un error ajeno al contrato y el tiempo agotado en ErrorEntregaNotificacion', async () => {
    const lento = new NotificadorConInterruptor(
      { notificar: () => new Promise((r) => setTimeout(r, 100)) },
      'lento',
      { ...OPCIONES, tiempoMaximoMs: 10 },
    );
    const roto = new NotificadorConInterruptor({ notificar: async () => Promise.reject(new TypeError('x')) }, 'roto', OPCIONES);
    try {
      await expect(lento.notificar(NOTIFICACION)).rejects.toBeInstanceOf(ErrorEntregaNotificacion);
      await expect(roto.notificar(NOTIFICACION)).rejects.toMatchObject({ name: 'ErrorEntregaNotificacion', canal: 'roto' });
    } finally {
      lento.apagar();
      roto.apagar();
    }
  });
});
