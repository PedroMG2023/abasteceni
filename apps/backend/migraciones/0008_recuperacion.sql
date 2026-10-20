CREATE TABLE "m2_seguridad"."recuperaciones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credencial_id" uuid NOT NULL,
	"huella" text NOT NULL,
	"creada_en" timestamp with time zone NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usada_en" timestamp with time zone,
	"anulada_en" timestamp with time zone,
	CONSTRAINT "recuperaciones_huella_unica" UNIQUE("huella"),
	CONSTRAINT "recuperaciones_vigencia" CHECK ("m2_seguridad"."recuperaciones"."expira_en" > "m2_seguridad"."recuperaciones"."creada_en")
);
--> statement-breakpoint
ALTER TABLE "m2_seguridad"."recuperaciones" ADD CONSTRAINT "recuperaciones_credencial_id_credenciales_id_fk" FOREIGN KEY ("credencial_id") REFERENCES "m2_seguridad"."credenciales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recuperaciones_credencial" ON "m2_seguridad"."recuperaciones" USING btree ("credencial_id");