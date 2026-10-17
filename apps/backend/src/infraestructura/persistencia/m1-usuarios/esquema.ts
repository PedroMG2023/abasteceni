import { sql } from 'drizzle-orm';
import { check, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Esquema de M1 Usuarios y validación (PA-02).
export const esquema = pgSchema('m1_usuarios');

// Cuenta comercial (MD-01). Los campos obligatorios de SYS-FN-01 son NOT NULL y
// no vacíos; el RUC es único.
export const cuentasComerciales = esquema.table(
  'cuentas_comerciales',
  {
    id: uuid('id').primaryKey(),
    tipo: text('tipo').notNull(),
    razonSocial: text('razon_social').notNull(),
    ruc: text('ruc').notNull().unique('cuentas_comerciales_ruc_unico'),
    departamento: text('departamento').notNull(),
    municipio: text('municipio').notNull(),
    rubro: text('rubro').notNull(),
    telefonoMovil: text('telefono_movil').notNull(),
    correo: text('correo').notNull(),
    estado: text('estado').notNull(),
    registradaEn: timestamp('registrada_en', { withTimezone: true }).notNull(),
    // Consentimiento de SYS-FN-36 (atributo consentimiento de MD-01).
    consentimientoAceptadoEn: timestamp('consentimiento_aceptado_en', { withTimezone: true }).notNull(),
    // Documento de registro legal de SYS-FN-02 en el almacén de documentos (DIS-32).
    registroLegalClave: uuid('registro_legal_clave').notNull(),
    registroLegalTipo: text('registro_legal_tipo').notNull(),
  },
  (t) => [
    check('cuentas_comerciales_tipo', sql`${t.tipo} IN ('Comprador', 'Proveedor', 'Productor')`),
    check('cuentas_comerciales_estado', sql`${t.estado} IN ('Pendiente de validación', 'Activa', 'Rechazada')`),
    check(
      'cuentas_comerciales_obligatorios',
      sql`btrim(${t.razonSocial}) <> '' AND btrim(${t.departamento}) <> '' AND btrim(${t.municipio}) <> '' AND btrim(${t.rubro}) <> ''`,
    ),
    check('cuentas_comerciales_ruc_formato', sql`${t.ruc} ~ '^(J[0-9]{13}|[0-9]{13}[A-Z])$'`),
    check('cuentas_comerciales_registro_legal_tipo', sql`${t.registroLegalTipo} IN ('application/pdf', 'image/jpeg')`),
  ],
);
