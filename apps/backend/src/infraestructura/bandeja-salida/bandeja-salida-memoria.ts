import type { EventoDominio, Transaccion } from '../../dominio/puertos';
import { comoTransaccionMemoria } from '../persistencia/unidad-trabajo-memoria';
import { causaFallo, esperaReintentoMs, type BandejaSalida, type ResultadoEntrega } from './bandeja-salida';

interface Entrada {
  evento: EventoDominio;
  publicadoEn: Date | null;
  intentos: number;
  proximoIntentoEn: Date | null;
  ultimoError: string | null;
}

// Bandeja de salida en memoria (AS-10), para pruebas sin infraestructura.
export class BandejaSalidaMemoria implements BandejaSalida {
  readonly entradas: Entrada[] = [];

  async publicar(evento: EventoDominio, tx: Transaccion): Promise<void> {
    comoTransaccionMemoria(tx).alConfirmar(() =>
      this.entradas.push({ evento, publicadoEn: null, intentos: 0, proximoIntentoEn: null, ultimoError: null }),
    );
  }

  async entregarPendientes(
    entregar: (evento: EventoDominio) => Promise<void>,
    { limite, ahora }: { limite: number; ahora: Date },
  ): Promise<ResultadoEntrega> {
    const pendientes = this.entradas
      .filter((e) => e.publicadoEn === null && (e.proximoIntentoEn === null || e.proximoIntentoEn <= ahora))
      .slice(0, limite);
    const resultado: ResultadoEntrega = { publicados: 0, fallidos: 0 };
    for (const entrada of pendientes) {
      try {
        await entregar(entrada.evento);
        entrada.publicadoEn = ahora;
        resultado.publicados += 1;
      } catch (error) {
        entrada.intentos += 1;
        entrada.ultimoError = causaFallo(error);
        entrada.proximoIntentoEn = new Date(ahora.getTime() + esperaReintentoMs(entrada.intentos));
        resultado.fallidos += 1;
      }
    }
    return resultado;
  }
}
