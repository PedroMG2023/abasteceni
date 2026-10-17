CREATE TABLE "m1_usuarios"."cuentas_comerciales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"razon_social" text NOT NULL,
	"ruc" text NOT NULL,
	"departamento" text NOT NULL,
	"municipio" text NOT NULL,
	"rubro" text NOT NULL,
	"telefono_movil" text NOT NULL,
	"correo" text NOT NULL,
	"estado" text NOT NULL,
	"registrada_en" timestamp with time zone NOT NULL,
	CONSTRAINT "cuentas_comerciales_ruc_unico" UNIQUE("ruc"),
	CONSTRAINT "cuentas_comerciales_tipo" CHECK ("m1_usuarios"."cuentas_comerciales"."tipo" IN ('Comprador', 'Proveedor', 'Productor')),
	CONSTRAINT "cuentas_comerciales_estado" CHECK ("m1_usuarios"."cuentas_comerciales"."estado" IN ('Pendiente de validación', 'Activa', 'Rechazada')),
	CONSTRAINT "cuentas_comerciales_obligatorios" CHECK (btrim("m1_usuarios"."cuentas_comerciales"."razon_social") <> '' AND btrim("m1_usuarios"."cuentas_comerciales"."departamento") <> '' AND btrim("m1_usuarios"."cuentas_comerciales"."municipio") <> '' AND btrim("m1_usuarios"."cuentas_comerciales"."rubro") <> ''),
	CONSTRAINT "cuentas_comerciales_ruc_formato" CHECK ("m1_usuarios"."cuentas_comerciales"."ruc" ~ '^(J[0-9]{13}|[0-9]{13}[A-Z])$')
);
--> statement-breakpoint
CREATE TABLE "m2_seguridad"."credenciales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cuenta_id" uuid,
	"correo" text NOT NULL,
	"hash_contrasena" text NOT NULL,
	"rol" text NOT NULL,
	"habilitacion" text NOT NULL,
	"creada_en" timestamp with time zone NOT NULL,
	CONSTRAINT "credenciales_cuenta_unica" UNIQUE("cuenta_id"),
	CONSTRAINT "credenciales_correo_unico" UNIQUE("correo"),
	CONSTRAINT "credenciales_rol" CHECK ("m2_seguridad"."credenciales"."rol" IN ('Comprador', 'Proveedor', 'Productor', 'Administrador')),
	CONSTRAINT "credenciales_habilitacion" CHECK ("m2_seguridad"."credenciales"."habilitacion" IN ('habilitada', 'pendiente', 'rechazada'))
);
--> statement-breakpoint
CREATE TABLE "m2_seguridad"."sesiones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credencial_id" uuid NOT NULL,
	"huella" text NOT NULL,
	"creada_en" timestamp with time zone NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	CONSTRAINT "sesiones_huella_unica" UNIQUE("huella")
);
--> statement-breakpoint
CREATE TABLE "plataforma"."bandeja_salida" (
	"secuencia" bigserial PRIMARY KEY NOT NULL,
	"id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"datos" jsonb NOT NULL,
	"ocurrido_en" timestamp with time zone NOT NULL,
	"publicado_en" timestamp with time zone,
	"intentos" integer DEFAULT 0 NOT NULL,
	"proximo_intento_en" timestamp with time zone,
	"ultimo_error" text,
	CONSTRAINT "bandeja_salida_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "plataforma"."contador_peticiones" (
	"clave" text NOT NULL,
	"ventana" timestamp with time zone NOT NULL,
	"cuenta" integer NOT NULL,
	CONSTRAINT "contador_peticiones_clave_ventana_pk" PRIMARY KEY("clave","ventana")
);
--> statement-breakpoint
ALTER TABLE "m2_seguridad"."sesiones" ADD CONSTRAINT "sesiones_credencial_id_credenciales_id_fk" FOREIGN KEY ("credencial_id") REFERENCES "m2_seguridad"."credenciales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bandeja_salida_pendientes" ON "plataforma"."bandeja_salida" USING btree ("secuencia") WHERE "plataforma"."bandeja_salida"."publicado_en" IS NULL;