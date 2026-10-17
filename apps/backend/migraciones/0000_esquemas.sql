CREATE SCHEMA "m1_usuarios";
--> statement-breakpoint
CREATE SCHEMA "m2_seguridad";
--> statement-breakpoint
CREATE SCHEMA "m3_demandas";
--> statement-breakpoint
CREATE SCHEMA "m4_ofertas";
--> statement-breakpoint
CREATE SCHEMA "m5_busqueda";
--> statement-breakpoint
CREATE SCHEMA "m6_cotizaciones";
--> statement-breakpoint
CREATE SCHEMA "m7_chat";
--> statement-breakpoint
CREATE SCHEMA "m8_reputacion";
--> statement-breakpoint
CREATE SCHEMA "m9_administracion";
--> statement-breakpoint
-- El migrador crea antes este esquema para su tabla de control.
CREATE SCHEMA IF NOT EXISTS "plataforma";
