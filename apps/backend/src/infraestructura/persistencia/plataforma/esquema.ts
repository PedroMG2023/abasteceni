import { sql } from 'drizzle-orm';
import { bigserial, index, integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Esquema transversal: bandeja de salida (ADR-01) y contador de peticiones (ADR-08).
export const esquema = pgSchema('plataforma');

// Bandeja de salida única (D5 AM-05: «existe y es única»). El evento se inserta
// en la misma transacción que el cambio de estado; el trabajador la sondea.
export const bandejaSalida = esquema.table(
  'bandeja_salida',
  {
    secuencia: bigserial('secuencia', { mode: 'number' }).primaryKey(),
    id: uuid('id').notNull().unique(),
    tipo: text('tipo').notNull(),
    datos: jsonb('datos').notNull(),
    ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull(),
    publicadoEn: timestamp('publicado_en', { withTimezone: true }),
    intentos: integer('intentos').notNull().default(0),
    proximoIntentoEn: timestamp('proximo_intento_en', { withTimezone: true }),
    ultimoError: text('ultimo_error'),
  },
  (t) => [index('bandeja_salida_pendientes').on(t.secuencia).where(sql`${t.publicadoEn} IS NULL`)],
);

// Contador por IP y ventana de un minuto, compartido entre instancias (ADR-08, PA-04).
export const contadorPeticiones = esquema.table(
  'contador_peticiones',
  {
    clave: text('clave').notNull(),
    ventana: timestamp('ventana', { withTimezone: true }).notNull(),
    cuenta: integer('cuenta').notNull(),
  },
  (t) => [primaryKey({ columns: [t.clave, t.ventana] })],
);
