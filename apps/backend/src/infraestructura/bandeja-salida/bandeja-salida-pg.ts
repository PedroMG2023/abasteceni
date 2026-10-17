import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { EventoDominio, Transaccion } from '../../dominio/puertos';
import { conexion, type BaseDatos } from '../persistencia/base-datos';
import { bandejaSalida } from '../persistencia/plataforma/esquema';
import { causaFallo, esperaReintentoMs, type BandejaSalida, type ResultadoEntrega } from './bandeja-salida';

// Bandeja de salida única en el esquema plataforma (ADR-01, D5 AM-05).
export class BandejaSalidaPg implements BandejaSalida {
  constructor(private readonly db: BaseDatos) {}

  async publicar(evento: EventoDominio, tx: Transaccion): Promise<void> {
    await conexion(this.db, tx).insert(bandejaSalida).values({
      id: evento.id,
      tipo: evento.tipo,
      datos: evento.datos,
      ocurridoEn: evento.ocurridoEn,
    });
  }

  // Bloquea las filas tomadas (FOR UPDATE SKIP LOCKED): varios trabajadores
  // pueden sondear sin entregar dos veces el mismo evento.
  entregarPendientes(
    entregar: (evento: EventoDominio) => Promise<void>,
    { limite, ahora }: { limite: number; ahora: Date },
  ): Promise<ResultadoEntrega> {
    return this.db.transaction(async (tx) => {
      const filas = await tx
        .select()
        .from(bandejaSalida)
        .where(
          and(
            isNull(bandejaSalida.publicadoEn),
            or(isNull(bandejaSalida.proximoIntentoEn), lte(bandejaSalida.proximoIntentoEn, ahora)),
          ),
        )
        .orderBy(asc(bandejaSalida.secuencia))
        .limit(limite)
        .for('update', { skipLocked: true });

      const resultado: ResultadoEntrega = { publicados: 0, fallidos: 0 };
      for (const fila of filas) {
        const evento: EventoDominio = { id: fila.id, tipo: fila.tipo, ocurridoEn: fila.ocurridoEn, datos: fila.datos as Record<string, unknown> };
        try {
          await entregar(evento);
          await tx.update(bandejaSalida).set({ publicadoEn: ahora }).where(eq(bandejaSalida.secuencia, fila.secuencia));
          resultado.publicados += 1;
        } catch (error) {
          const intentos = fila.intentos + 1;
          await tx
            .update(bandejaSalida)
            .set({
              intentos: sql`${bandejaSalida.intentos} + 1`,
              ultimoError: causaFallo(error),
              proximoIntentoEn: new Date(ahora.getTime() + esperaReintentoMs(intentos)),
            })
            .where(eq(bandejaSalida.secuencia, fila.secuencia));
          resultado.fallidos += 1;
        }
      }
      return resultado;
    });
  }
}
