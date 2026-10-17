-- Privilegios explícitos de abasteceni_app sobre las tablas de IT-01 (ADR-05).
-- Cada privilegio responde a una operación de la aplicación; nada más.
GRANT SELECT, INSERT, UPDATE ON m1_usuarios.cuentas_comerciales TO abasteceni_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON m2_seguridad.credenciales TO abasteceni_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON m2_seguridad.sesiones TO abasteceni_app;
--> statement-breakpoint
-- La bandeja se inserta en la transacción del cambio de estado y el trabajador
-- marca cada evento como publicado; los eventos no se borran.
GRANT SELECT, INSERT, UPDATE ON plataforma.bandeja_salida TO abasteceni_app;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE plataforma.bandeja_salida_secuencia_seq TO abasteceni_app;
--> statement-breakpoint
-- El trabajador purga las ventanas vencidas del contador (ADR-08).
GRANT SELECT, INSERT, UPDATE, DELETE ON plataforma.contador_peticiones TO abasteceni_app;
