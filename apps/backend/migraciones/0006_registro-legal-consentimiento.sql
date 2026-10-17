ALTER TABLE "m1_usuarios"."cuentas_comerciales" ADD COLUMN "consentimiento_aceptado_en" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "m1_usuarios"."cuentas_comerciales" ADD COLUMN "registro_legal_clave" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "m1_usuarios"."cuentas_comerciales" ADD COLUMN "registro_legal_tipo" text NOT NULL;--> statement-breakpoint
ALTER TABLE "m1_usuarios"."cuentas_comerciales" ADD CONSTRAINT "cuentas_comerciales_registro_legal_tipo" CHECK ("m1_usuarios"."cuentas_comerciales"."registro_legal_tipo" IN ('application/pdf', 'image/jpeg'));