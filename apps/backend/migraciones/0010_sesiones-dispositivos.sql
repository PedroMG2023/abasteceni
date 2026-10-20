-- SYS-FN-08 (DIS-37). Las sesiones existentes toman su fecha de creación como
-- inicio del dispositivo antes de exigir NOT NULL.
ALTER TABLE "m2_seguridad"."sesiones" ADD COLUMN "iniciada_en" timestamp with time zone;--> statement-breakpoint
UPDATE "m2_seguridad"."sesiones" SET "iniciada_en" = "creada_en";--> statement-breakpoint
ALTER TABLE "m2_seguridad"."sesiones" ALTER COLUMN "iniciada_en" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "m2_seguridad"."sesiones" ADD COLUMN "desplazada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "sesiones_vigentes" ON "m2_seguridad"."sesiones" USING btree ("credencial_id","iniciada_en") WHERE "m2_seguridad"."sesiones"."revocada_en" IS NULL;--> statement-breakpoint
ALTER TABLE "m2_seguridad"."sesiones" ADD CONSTRAINT "sesiones_inicio" CHECK ("m2_seguridad"."sesiones"."iniciada_en" <= "m2_seguridad"."sesiones"."creada_en");
