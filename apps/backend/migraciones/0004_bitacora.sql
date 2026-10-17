CREATE TABLE "m9_administracion"."bitacora" (
	"id" uuid PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"accion" text NOT NULL,
	"recurso_tipo" text NOT NULL,
	"recurso_id" text NOT NULL,
	"detalle" jsonb NOT NULL,
	"ip" text NOT NULL,
	"registrado_en" timestamp with time zone NOT NULL,
	CONSTRAINT "bitacora_accion" CHECK (btrim("m9_administracion"."bitacora"."accion") <> '')
);
--> statement-breakpoint
CREATE INDEX "bitacora_recurso" ON "m9_administracion"."bitacora" USING btree ("recurso_tipo","recurso_id");