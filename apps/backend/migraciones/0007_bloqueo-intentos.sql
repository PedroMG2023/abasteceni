ALTER TABLE "m2_seguridad"."credenciales" ADD COLUMN "intentos_fallidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "m2_seguridad"."credenciales" ADD COLUMN "bloqueada_hasta" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "m2_seguridad"."credenciales" ADD CONSTRAINT "credenciales_intentos" CHECK ("m2_seguridad"."credenciales"."intentos_fallidos" >= 0);