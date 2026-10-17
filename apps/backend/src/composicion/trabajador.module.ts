import { Inject, Injectable, Logger, Module, type DynamicModule, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { DespachadorEventos } from '../aplicacion/despachador/despachador-eventos';
import { NotificarCuentaRegistrada } from '../aplicacion/despachador/manejadores/notificar-cuenta-registrada';
import { NotificarCuentaBloqueada } from '../aplicacion/despachador/manejadores/notificar-cuenta-bloqueada';
import { NotificarCuentaAprobada, NotificarCuentaRechazada } from '../aplicacion/despachador/manejadores/notificar-decision-cuenta';
import { CUENTA_BLOQUEADA } from '../dominio/m2-seguridad';
import { SIMBOLOS } from '../aplicacion/simbolos';
import { CUENTA_APROBADA, CUENTA_RECHAZADA, CUENTA_REGISTRADA } from '../dominio/m1-usuarios';
import type { PuertoNotificacion, PuertoReloj } from '../dominio/puertos';
import { BandejaSalidaPg } from '../infraestructura/bandeja-salida/bandeja-salida-pg';
import { ContadorPeticionesPg } from '../infraestructura/limite-peticiones/contador-peticiones-pg';
import { NotificadorCorreo, ProveedorCorreoSimulado } from '../infraestructura/notificacion/correo';
import { NotificadorConInterruptor } from '../infraestructura/notificacion/interruptor';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../infraestructura/notificacion/whatsapp';
import type { BaseDatos } from '../infraestructura/persistencia/base-datos';
import { SondeoBandeja } from '../infraestructura/sondeo/sondeo-bandeja';
import type { Configuracion } from './configuracion';
import { BASE_DATOS, CONFIGURACION, proveedoresComunes } from './infraestructura-comun';

export const ADAPTADORES_TRABAJADOR = {
  notificador: Symbol('PuertoNotificacion'),
  // Canal de correo para los avisos que SYS-FN-07 dirige al correo registrado.
  notificadorCorreo: Symbol('PuertoNotificacionCorreo'),
  despachador: Symbol('PuertoDespachoEventos'),
  sondeo: Symbol('SondeoBandeja'),
  contador: Symbol('ContadorPeticionesPg'),
} as const;

const A = ADAPTADORES_TRABAJADOR;

// Ciclo de vida del trabajador: sondeo de la bandeja y purga del contador de ADR-08.
@Injectable()
export class TareasTrabajador implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly registro = new Logger('Trabajador');
  private purga: NodeJS.Timeout | null = null;

  constructor(
    @Inject(A.sondeo) private readonly sondeo: SondeoBandeja,
    @Inject(A.contador) private readonly contador: ContadorPeticionesPg,
    @Inject(A.notificador) private readonly notificador: PuertoNotificacion,
    @Inject(A.notificadorCorreo) private readonly notificadorCorreo: PuertoNotificacion,
    @Inject(SIMBOLOS.reloj) private readonly reloj: PuertoReloj,
  ) {}

  onApplicationBootstrap(): void {
    this.sondeo.iniciar();
    this.purga = setInterval(() => {
      this.contador.purgar(new Date(this.reloj.ahora().getTime() - 120_000)).catch(() => this.registro.warn('Purga del contador fallida.'));
    }, 60_000);
    this.registro.log('Sondeo de la bandeja de salida iniciado.');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.purga) clearInterval(this.purga);
    await this.sondeo.detener();
    for (const notificador of [this.notificador, this.notificadorCorreo]) {
      if (notificador instanceof NotificadorConInterruptor) notificador.apagar();
    }
  }
}

// Raíz de composición del trabajador asíncrono (MD-03). El interruptor de
// circuito envuelve aquí al adaptador de notificación, nunca en la API (ADR-02).
@Module({})
export class TrabajadorModule {
  static registrar(configuracion: Configuracion): DynamicModule {
    const registro = new Logger('Interruptor');
    return {
      module: TrabajadorModule,
      providers: [
        ...proveedoresComunes(configuracion),
        {
          provide: A.notificador,
          useFactory: (c: Configuracion) => {
            const [adaptador, canal] = ((): [PuertoNotificacion, string] => {
              if (c.trabajador.canalNotificacion === 'correo') return [new NotificadorCorreo(new ProveedorCorreoSimulado()), NotificadorCorreo.CANAL];
              const proveedor = new ProveedorWhatsAppSimulado();
              proveedor.disponible = c.trabajador.whatsappSimuladoDisponible;
              return [new NotificadorWhatsApp(proveedor), NotificadorWhatsApp.CANAL];
            })();
            return new NotificadorConInterruptor(adaptador, canal, undefined, (estado) => registro.warn(`Circuito del canal ${canal}: ${estado}.`));
          },
          inject: [CONFIGURACION],
        },
        {
          provide: A.notificadorCorreo,
          useFactory: () =>
            new NotificadorConInterruptor(new NotificadorCorreo(new ProveedorCorreoSimulado()), NotificadorCorreo.CANAL, undefined, (estado) =>
              registro.warn(`Circuito del canal ${NotificadorCorreo.CANAL}: ${estado}.`),
            ),
        },
        {
          provide: A.despachador,
          useFactory: (notificador: PuertoNotificacion, correo: PuertoNotificacion) =>
            new DespachadorEventos()
              .registrar(CUENTA_REGISTRADA, new NotificarCuentaRegistrada(notificador))
              .registrar(CUENTA_APROBADA, new NotificarCuentaAprobada(notificador))
              .registrar(CUENTA_RECHAZADA, new NotificarCuentaRechazada(notificador))
              .registrar(CUENTA_BLOQUEADA, new NotificarCuentaBloqueada(correo)),
          inject: [A.notificador, A.notificadorCorreo],
        },
        {
          provide: A.sondeo,
          useFactory: (db: BaseDatos, despachador: DespachadorEventos, reloj: PuertoReloj, c: Configuracion) => {
            const fallo = new Logger('Sondeo');
            return new SondeoBandeja(
              new BandejaSalidaPg(db),
              despachador,
              reloj,
              { intervaloMs: c.trabajador.intervaloSondeoMs, tamanoLote: c.trabajador.tamanoLote },
              (error) => fallo.error(`Ciclo de sondeo fallido: ${error instanceof Error ? error.name : 'Error'}`),
            );
          },
          inject: [BASE_DATOS, A.despachador, SIMBOLOS.reloj, CONFIGURACION],
        },
        { provide: A.contador, useFactory: (db: BaseDatos) => new ContadorPeticionesPg(db), inject: [BASE_DATOS] },
        TareasTrabajador,
      ],
    };
  }
}
