import { Inject, Injectable, Logger, Module, type DynamicModule, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { DespachadorEventos } from '../aplicacion/despachador/despachador-eventos';
import { NotificarCuentaRegistrada } from '../aplicacion/despachador/manejadores/notificar-cuenta-registrada';
import { SIMBOLOS } from '../aplicacion/simbolos';
import { CUENTA_REGISTRADA } from '../dominio/m1-usuarios';
import type { PuertoNotificacion, PuertoReloj } from '../dominio/puertos';
import { BandejaSalidaPg } from '../infraestructura/bandeja-salida/bandeja-salida-pg';
import { ContadorPeticionesPg } from '../infraestructura/limite-peticiones/contador-peticiones-pg';
import { NotificadorConInterruptor } from '../infraestructura/notificacion/interruptor';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../infraestructura/notificacion/whatsapp';
import type { BaseDatos } from '../infraestructura/persistencia/base-datos';
import { SondeoBandeja } from '../infraestructura/sondeo/sondeo-bandeja';
import type { Configuracion } from './configuracion';
import { BASE_DATOS, CONFIGURACION, proveedoresComunes } from './infraestructura-comun';

export const ADAPTADORES_TRABAJADOR = {
  notificador: Symbol('PuertoNotificacion'),
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
    if (this.notificador instanceof NotificadorConInterruptor) this.notificador.apagar();
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
            const proveedor = new ProveedorWhatsAppSimulado();
            proveedor.disponible = c.trabajador.whatsappSimuladoDisponible;
            return new NotificadorConInterruptor(new NotificadorWhatsApp(proveedor), NotificadorWhatsApp.CANAL, undefined, (estado) =>
              registro.warn(`Circuito del canal ${NotificadorWhatsApp.CANAL}: ${estado}.`),
            );
          },
          inject: [CONFIGURACION],
        },
        {
          provide: A.despachador,
          useFactory: (notificador: PuertoNotificacion) =>
            new DespachadorEventos().registrar(CUENTA_REGISTRADA, new NotificarCuentaRegistrada(notificador)),
          inject: [A.notificador],
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
