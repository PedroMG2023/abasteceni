import { DespachadorEventos, type ManejadorEvento } from '../../../src/aplicacion/despachador/despachador-eventos';
import {
  MENSAJE_CUENTA_REGISTRADA,
  NotificarCuentaRegistrada,
} from '../../../src/aplicacion/despachador/manejadores/notificar-cuenta-registrada';
import { CUENTA_REGISTRADA, type CuentaRegistrada } from '../../../src/dominio/m1-usuarios';
import type { EventoDominio, Notificacion, PuertoNotificacion } from '../../../src/dominio/puertos';

class ManejadorRegistrador implements ManejadorEvento {
  readonly recibidos: EventoDominio[] = [];
  async manejar(evento: EventoDominio): Promise<void> {
    this.recibidos.push(evento);
  }
}

const evento = (tipo: string): EventoDominio => ({ id: 'e-1', tipo, ocurridoEn: new Date(), datos: {} });

describe('AS-06 · despachador de eventos abierto a nuevos manejadores (PA-03, ADR-01)', () => {
  it('entrega cada evento a los manejadores registrados para su tipo', async () => {
    const manejador = new ManejadorRegistrador();
    const despachador = new DespachadorEventos().registrar('CuentaRegistrada', manejador);

    await despachador.despachar(evento('CuentaRegistrada'));
    await despachador.despachar(evento('OtroEvento'));

    expect(manejador.recibidos.map((e) => e.tipo)).toEqual(['CuentaRegistrada']);
  });

  it('registra un manejador adicional para un evento nuevo sin modificar el despachador', async () => {
    const primero = new ManejadorRegistrador();
    const adicional = new ManejadorRegistrador();
    const despachador = new DespachadorEventos().registrar('CuentaRegistrada', primero).registrar('CuentaAprobada', adicional);

    await despachador.despachar(evento('CuentaAprobada'));

    expect(primero.recibidos).toHaveLength(0);
    expect(adicional.recibidos).toHaveLength(1);
  });

  it('propaga el fallo de un manejador para que el evento quede pendiente en la bandeja', async () => {
    const despachador = new DespachadorEventos().registrar('X', { manejar: async () => Promise.reject(new Error('fallo')) });
    await expect(despachador.despachar(evento('X'))).rejects.toThrow('fallo');
  });
});

describe('Manejador NotificarCuentaRegistrada (IT-01; DIS-13, DIS-20)', () => {
  it('notifica al solicitante con el texto aprobado y sus datos de contacto', async () => {
    const enviadas: Notificacion[] = [];
    const notificador: PuertoNotificacion = { notificar: async (n) => void enviadas.push(n) };
    const cuentaRegistrada: CuentaRegistrada = {
      id: 'e-1',
      tipo: CUENTA_REGISTRADA,
      ocurridoEn: new Date(),
      datos: { cuentaId: 'c-1', tipo: 'Comprador', telefonoMovil: '+50588887777', correo: 'a@b.ni' },
    };

    await new NotificarCuentaRegistrada(notificador).manejar(cuentaRegistrada);

    expect(enviadas).toEqual([
      {
        destinatario: { telefonoMovil: '+50588887777', correo: 'a@b.ni' },
        mensaje: 'AbasteceNi: recibimos su solicitud de cuenta comercial; está pendiente de validación.',
      },
    ]);
    expect(MENSAJE_CUENTA_REGISTRADA).toBe(enviadas[0].mensaje);
  });
});
