import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MENSAJE_CUENTA_REGISTRADA } from '../../src/aplicacion/despachador/manejadores/notificar-cuenta-registrada';
import { SIMBOLOS } from '../../src/aplicacion/simbolos';
import { ADAPTADORES_TRABAJADOR, TrabajadorModule } from '../../src/composicion/trabajador.module';
import { NotificadorConInterruptor } from '../../src/infraestructura/notificacion/interruptor';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../../src/infraestructura/notificacion/whatsapp';
import type { SondeoBandeja } from '../../src/infraestructura/sondeo/sondeo-bandeja';
import { RelojFijo } from '../dobles/sistema';
import { crearApiPrueba } from '../soporte/aplicacion';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';
import { registrarPorHttp } from '../soporte/registro-http';
import { solicitudValida } from '../unitarias/datos';

const REAPERTURA_MS = 300;

interface FilaBandeja extends Record<string, unknown> {
  id: string;
  tipo: string;
  cuenta_id: string;
  publicado: boolean;
  intentos: number;
  ultimo_error: string | null;
}

// Criterio de salida de IT-01 (D4 §2.13; DM-08): «Un evento de dominio se
// persiste en la misma transacción que su cambio de estado, se publica de forma
// asíncrona y alcanza un adaptador de notificación; el circuito abre ante un
// fallo simulado del proveedor». Verifica ADR-01, ADR-02 y R-02, R-05.
describe('IT-01 · criterio de salida de la línea base arquitectónica (ADR-01, ADR-02)', () => {
  let bd: BaseDatosPrueba;
  let api: INestApplication;
  let trabajador: TestingModule;
  let sondeo: SondeoBandeja;
  let interruptor: NotificadorConInterruptor;
  const proveedor = new ProveedorWhatsAppSimulado();
  const reloj = new RelojFijo(new Date());
  let siguienteRuc = 10;

  const registrar = (telefono: string) => {
    siguienteRuc += 1;
    return registrarPorHttp(api, solicitudValida({ ruc: `J03100000000${siguienteRuc}`, correo: `cuenta${siguienteRuc}@empresa.ni`, telefonoMovil: telefono }));
  };

  const bandeja = () =>
    consultar<FilaBandeja>(
      bd.urlPropietario,
      `SELECT id, tipo, datos->>'cuentaId' AS cuenta_id, publicado_en IS NOT NULL AS publicado, intentos, ultimo_error
         FROM plataforma.bandeja_salida ORDER BY secuencia`,
    );

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    const configuracion = configuracionPrueba(bd.urlApp);
    api = await crearApiPrueba(configuracion);
    // AS-17: la composición real del trabajador, con el reloj y el notificador
    // sustituidos desde la raíz de composición.
    interruptor = new NotificadorConInterruptor(new NotificadorWhatsApp(proveedor), NotificadorWhatsApp.CANAL, {
      tiempoMaximoMs: 2000,
      umbralErroresPorcentaje: 50,
      volumenMinimo: 3,
      reaperturaMs: REAPERTURA_MS,
      ventanaMs: 60_000,
    });
    trabajador = await Test.createTestingModule({ imports: [TrabajadorModule.registrar(configuracion)] })
      .overrideProvider(ADAPTADORES_TRABAJADOR.notificador)
      .useValue(interruptor)
      .overrideProvider(SIMBOLOS.reloj)
      .useValue(reloj)
      .compile();
    sondeo = trabajador.get(ADAPTADORES_TRABAJADOR.sondeo);
  }, 120000);

  afterAll(async () => {
    await trabajador.close();
    await api.close();
    await bd.detener();
  });

  it('1 · el evento CuentaRegistrada se persiste en la misma transacción que la cuenta', async () => {
    const respuesta = await registrar('+50581110001');

    expect(respuesta.status).toBe(201);
    const [cuenta] = await consultar(bd.urlPropietario, 'SELECT estado FROM m1_usuarios.cuentas_comerciales WHERE id = $1', [respuesta.body.id]);
    expect(cuenta).toEqual({ estado: 'Pendiente de validación' });
    expect(await bandeja()).toEqual([
      expect.objectContaining({ tipo: 'CuentaRegistrada', cuenta_id: respuesta.body.id, publicado: false, intentos: 0 }),
    ]);
  });

  it('1b · si la transacción falla no queda ni la cuenta ni el evento', async () => {
    const correoRepetido = await registrarPorHttp(api, solicitudValida({ ruc: 'J0310000000099', correo: 'cuenta11@empresa.ni' }));

    expect(correoRepetido.status).toBe(409);
    expect(await consultar(bd.urlPropietario, "SELECT 1 FROM m1_usuarios.cuentas_comerciales WHERE ruc = 'J0310000000099'")).toEqual([]);
    expect(await bandeja()).toHaveLength(1);
  });

  it('2 · el trabajador lo publica de forma asíncrona y alcanza el adaptador de notificación', async () => {
    expect(proveedor.entregados).toHaveLength(0);

    expect(await sondeo.procesarLote()).toEqual({ publicados: 1, fallidos: 0 });

    expect(proveedor.entregados).toEqual([{ telefonoMovil: '+50581110001', texto: MENSAJE_CUENTA_REGISTRADA }]);
    expect((await bandeja())[0]).toMatchObject({ publicado: true, intentos: 0, ultimo_error: null });
    expect(interruptor.estado).toBe('cerrado');
  });

  it('3 · el circuito abre ante un fallo simulado del proveedor y las notificaciones quedan pendientes', async () => {
    proveedor.disponible = false;
    for (const sufijo of ['2', '3', '4', '5']) expect((await registrar(`+5058111000${sufijo}`)).status).toBe(201);

    expect(await sondeo.procesarLote()).toEqual({ publicados: 0, fallidos: 4 });

    expect(interruptor.estado).toBe('abierto');
    // La ventana del interruptor incluye la entrega exitosa del paso 2: con dos
    // fallos de tres llamadas (66 % ≥ 50 %, volumen mínimo 3) el circuito abre y
    // las dos notificaciones restantes fallan rápido sin llamar al proveedor.
    expect(proveedor.llamadas).toBe(1 + 2);
    const pendientes = (await bandeja()).slice(1);
    expect(pendientes.every((f) => !f.publicado && f.intentos === 1)).toBe(true);
    expect(pendientes.map((f) => f.ultimo_error)).toEqual([
      'ErrorEntregaNotificacion',
      'ErrorEntregaNotificacion',
      'ErrorCircuitoAbierto',
      'ErrorCircuitoAbierto',
    ]);
  });

  it('4 · al recuperarse el proveedor el circuito se cierra y se entregan las notificaciones acumuladas', async () => {
    proveedor.disponible = true;
    await new Promise((r) => setTimeout(r, REAPERTURA_MS + 50));
    reloj.avanzar(60_000);

    expect(await sondeo.procesarLote()).toEqual({ publicados: 4, fallidos: 0 });

    expect(interruptor.estado).toBe('cerrado');
    expect(proveedor.entregados.map((e) => e.telefonoMovil)).toEqual([
      '+50581110001',
      '+50581110002',
      '+50581110003',
      '+50581110004',
      '+50581110005',
    ]);
    expect((await bandeja()).every((f) => f.publicado)).toBe(true);
  });
});
