import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Esquema de M9 Administración, soporte y auditoría (PA-02, ADR-05).
export const esquema = pgSchema('m9_administracion');

// Bitácora de auditoría de solo adición (SYS-FN-35, PA-06). La aplicación solo
// puede insertar y leer: UPDATE, DELETE y TRUNCATE están revocados en el gestor.
export const bitacora = esquema.table(
  'bitacora',
  {
    id: uuid('id').primaryKey(),
    usuarioId: uuid('usuario_id'),
    accion: text('accion').notNull(),
    recursoTipo: text('recurso_tipo').notNull(),
    recursoId: text('recurso_id').notNull(),
    detalle: jsonb('detalle').notNull(),
    ip: text('ip').notNull(),
    registradoEn: timestamp('registrado_en', { withTimezone: true }).notNull(),
  },
  (t) => [
    check('bitacora_accion', sql`btrim(${t.accion}) <> ''`),
    index('bitacora_recurso').on(t.recursoTipo, t.recursoId),
  ],
);
