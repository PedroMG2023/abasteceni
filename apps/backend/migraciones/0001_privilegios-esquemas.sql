-- Privilegios de la aplicación sobre los esquemas (ADR-05, PA-02, PA-06).
-- La aplicación se conecta con abasteceni_app: puede usar los esquemas, pero
-- no crear objetos en ellos. Cada migración que crea una tabla declara
-- explícitamente los privilegios de abasteceni_app sobre esa tabla.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA plataforma, m1_usuarios, m2_seguridad, m3_demandas, m4_ofertas, m5_busqueda, m6_cotizaciones, m7_chat, m8_reputacion, m9_administracion TO abasteceni_app;
