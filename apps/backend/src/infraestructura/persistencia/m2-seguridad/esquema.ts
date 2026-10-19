import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
    // SYS-FN-07: intentos fallidos consecutivos y fin del bloqueo temporal.
    intentosFallidos: integer('intentos_fallidos').notNull().default(0),
    bloqueadaHasta: timestamp('bloqueada_hasta', { withTimezone: true }),
  },
  (t) => [
    check('credenciales_rol', sql`${t.rol} IN ('Comprador', 'Proveedor', 'Productor', 'Administrador')`),
    check('credenciales_habilitacion', sql`${t.habilitacion} IN ('habilitada', 'pendiente', 'rechazada')`),
    check('credenciales_intentos', sql`${t.intentosFallidos} >= 0`),
  ],
);

// Sesiones de renovación: solo la huella SHA-256 del secreto (ADR-04). SYS-FN-08
// (DIS-37): fecha de inicio del dispositivo y marca de sesión desplazada.
export const sesiones = esquema.table(
  'sesiones',
  {
    id: uuid('id').primaryKey(),
    credencialId: uuid('credencial_id')
      .notNull()
      .references(() => credenciales.id),
    huella: text('huella').notNull().unique('sesiones_huella_unica'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull(),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    revocadaEn: timestamp('revocada_en', { withTimezone: true }),
    iniciadaEn: timestamp('iniciada_en', { withTimezone: true }).notNull(),
    desplazada: boolean('desplazada').notNull().default(false),
  },
  (t) => [
    index('sesiones_vigentes').on(t.credencialId, t.iniciadaEn).where(sql`${t.revocadaEn} IS NULL`),
    check('sesiones_inicio', sql`${t.iniciadaEn} <= ${t.creadaEn}`),
  ],
);

// Solicitudes de recuperación de la contraseña (SYS-FN-05; DIS-36): solo la
// huella SHA-256 del secreto del enlace, como en las sesiones.
export const recuperaciones = esquema.table(
  'recuperaciones',
  {
    id: uuid('id').primaryKey(),
    credencialId: uuid('credencial_id')
      .notNull()
      .references(() => credenciales.id),
    huella: text('huella').notNull().unique('recuperaciones_huella_unica'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull(),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    usadaEn: timestamp('usada_en', { withTimezone: true }),
    anuladaEn: timestamp('anulada_en', { withTimezone: true }),
  },
  (t) => [
    index('recuperaciones_credencial').on(t.credencialId),
    check('recuperaciones_vigencia', sql`${t.expiraEn} > ${t.creadaEn}`),
  ],
);
