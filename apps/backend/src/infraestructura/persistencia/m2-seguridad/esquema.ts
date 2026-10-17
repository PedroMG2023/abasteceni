import { sql } from 'drizzle-orm';
import { check, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Esquema de M2 Seguridad y sesiones (PA-02). Sin claves foráneas hacia otros
// esquemas: cuenta_id referencia a M1 solo por valor.
export const esquema = pgSchema('m2_seguridad');

export const credenciales = esquema.table(
  'credenciales',
  {
    id: uuid('id').primaryKey(),
    cuentaId: uuid('cuenta_id').unique('credenciales_cuenta_unica'),
    correo: text('correo').notNull().unique('credenciales_correo_unico'),
    hashContrasena: text('hash_contrasena').notNull(),
    rol: text('rol').notNull(),
    habilitacion: text('habilitacion').notNull(),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull(),
  },
  (t) => [
    check('credenciales_rol', sql`${t.rol} IN ('Comprador', 'Proveedor', 'Productor', 'Administrador')`),
    check('credenciales_habilitacion', sql`${t.habilitacion} IN ('habilitada', 'pendiente', 'rechazada')`),
  ],
);

// Sesiones de renovación: solo la huella SHA-256 del secreto (ADR-04).
export const sesiones = esquema.table('sesiones', {
  id: uuid('id').primaryKey(),
  credencialId: uuid('credencial_id')
    .notNull()
    .references(() => credenciales.id),
  huella: text('huella').notNull().unique('sesiones_huella_unica'),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull(),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  revocadaEn: timestamp('revocada_en', { withTimezone: true }),
});
