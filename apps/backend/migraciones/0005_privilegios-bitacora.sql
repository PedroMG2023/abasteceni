-- Bitácora inmutable (ADR-05, PA-06, SYS-FN-35). abasteceni_app puede insertar
-- y leer; la actualización, el borrado y el vaciado se revocan de forma
-- explícita para que la inmutabilidad sea verificable por inspección (RF-10).
-- Las correcciones se registran como asientos compensatorios.
GRANT SELECT, INSERT ON m9_administracion.bitacora TO abasteceni_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON m9_administracion.bitacora FROM abasteceni_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON m9_administracion.bitacora FROM PUBLIC;
