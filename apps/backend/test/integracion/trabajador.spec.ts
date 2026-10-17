import { Test, type TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { ADAPTADORES_TRABAJADOR, TrabajadorModule } from '../../src/composicion/trabajador.module';
import type { ContadorPeticionesPg } from '../../src/infraestructura/limite-peticiones/contador-peticiones-pg';
import { NotificadorConInterruptor } from '../../src/infraestructura/notificacion/interruptor';
import { crearBaseDatos } from '../../src/infraestructura/persistencia/base-datos';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { configuracionPrueba } from '../soporte/configuracion';
import { consultar } from '../soporte/consultas';

// Proceso del trabajador (MD-03) con su composición real, sin sustituciones.
describe('Trabajador asíncrono: composición y ciclo de vida (MD-03, ADR-02)', () => {
  let bd: BaseDatosPrueba;
  let trabajador: TestingModule;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
  }, 120000);

  afterAll(async () => {
    await bd.detener();
  });

  it('envuelve el adaptador de WhatsApp en el interruptor, sondea la bandeja al iniciar y se detiene al cerrar', async () => {
    trabajador = await Test.createTestingModule({
      imports: [TrabajadorModule.registrar(configuracionPrueba(bd.urlApp, { intervaloSondeoMs: 20, whatsappSimuladoDisponible: false }))],
    }).compile();
    const app = trabajador.createNestApplication({ logger: false });

    expect(trabajador.get(ADAPTADORES_TRABAJADOR.notificador)).toBeInstanceOf(NotificadorConInterruptor);

    const propietario = crearBaseDatos(bd.urlPropietario, 1);
    await propietario.db.execute(
      sql`INSERT INTO plataforma.bandeja_salida (id, tipo, datos, ocurrido_en)
          VALUES ('00000000-0000-4000-8000-000000000001', 'CuentaRegistrada',
                  '{"cuentaId":"c","tipo":"Comprador","telefonoMovil":"+50588887777","correo":"a@b.ni"}', now())`,
    );
    await propietario.pool.end();

    await app.init();
    await new Promise((r) => setTimeout(r, 200));
    await app.close();

    // Con el proveedor simulado caído, el evento queda pendiente con su intento registrado.
    const [fila] = await consultar(bd.urlPropietario, 'SELECT publicado_en IS NULL AS pendiente, intentos, ultimo_error FROM plataforma.bandeja_salida');
    expect(fila).toEqual({ pendiente: true, intentos: 1, ultimo_error: 'ErrorEntregaNotificacion' });
  });

  it('purga las ventanas vencidas del contador de ADR-08', async () => {
    trabajador = await Test.createTestingModule({ imports: [TrabajadorModule.registrar(configuracionPrueba(bd.urlApp))] }).compile();
    const contador = trabajador.get<ContadorPeticionesPg>(ADAPTADORES_TRABAJADOR.contador);
    await contador.registrar('203.0.113.7', new Date('2026-10-17T11:58:00.000Z'));
    await contador.registrar('203.0.113.7', new Date('2026-10-17T12:00:00.000Z'));

    expect(await contador.purgar(new Date('2026-10-17T11:59:00.000Z'))).toBe(1);
    await trabajador.close();
  });
});
