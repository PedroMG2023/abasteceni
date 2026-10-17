import type { PuertoDespachoEventos, PuertoReloj } from '../../dominio/puertos';
import type { BandejaSalida, ResultadoEntrega } from '../bandeja-salida/bandeja-salida';

export interface OpcionesSondeo {
  intervaloMs: number;
  tamanoLote: number;
}

// Sondeo periódico de la bandeja de salida en el trabajador (AS-02, primera
// pieza): toma los pendientes y los entrega al despachador (capa 2) por el
// puerto PuertoDespachoEventos. No conoce manejadores ni canales.
export class SondeoBandeja {
  private temporizador: NodeJS.Timeout | null = null;
  private enCurso: Promise<unknown> = Promise.resolve();
  private activo = false;

  constructor(
    private readonly bandeja: BandejaSalida,
    private readonly despacho: PuertoDespachoEventos,
    private readonly reloj: PuertoReloj,
    private readonly opciones: OpcionesSondeo,
    private readonly alFallar: (error: unknown) => void = () => undefined,
  ) {}

  procesarLote(): Promise<ResultadoEntrega> {
    return this.bandeja.entregarPendientes((evento) => this.despacho.despachar(evento), {
      limite: this.opciones.tamanoLote,
      ahora: this.reloj.ahora(),
    });
  }

  iniciar(): void {
    this.activo = true;
    const ciclo = () => {
      if (!this.activo) return;
      this.enCurso = this.procesarLote()
        .catch(this.alFallar)
        .finally(() => {
          if (this.activo) this.temporizador = setTimeout(ciclo, this.opciones.intervaloMs);
        });
    };
    ciclo();
  }

  async detener(): Promise<void> {
    this.activo = false;
    if (this.temporizador) clearTimeout(this.temporizador);
    await this.enCurso;
  }
}
