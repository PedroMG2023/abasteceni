#!/usr/bin/env bash
# Diagrama físico de los esquemas generado desde las migraciones (informe 4b).
# Levanta un PostgreSQL efímero, crea los roles de ADR-05, aplica en orden las
# migraciones de apps/backend/migraciones con el rol propietario y dibuja el
# catálogo resultante. Producto derivado: no se versiona (DML-03).
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SALIDA="${1:-${RAIZ}/docs/evidencia/esquema-fisico}"
NOMBRE="abasteceni-diagrama-$$"
clave() { node -e "process.stdout.write(require('node:crypto').randomBytes(16).toString('hex'))"; }
CLAVE_PROPIETARIO="$(clave)"; CLAVE_APP="$(clave)"

docker run -d --rm --name "${NOMBRE}" -e POSTGRES_PASSWORD="$(clave)" \
  -e CLAVE_PROPIETARIO_BD="${CLAVE_PROPIETARIO}" -e CLAVE_APP_BD="${CLAVE_APP}" \
  -v "${RAIZ}/herramientas/bd/provisionar.sh:/docker-entrypoint-initdb.d/provisionar.sh:ro" \
  postgres:18.6-alpine > /dev/null
trap 'docker stop "${NOMBRE}" > /dev/null' EXIT
until docker exec "${NOMBRE}" pg_isready -U postgres -d abasteceni -q 2>/dev/null; do sleep 1; done
sleep 2

psql_propietario() { docker exec -i -e PGPASSWORD="${CLAVE_PROPIETARIO}" "${NOMBRE}" psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U abasteceni_propietario -d abasteceni "$@"; }
psql_propietario -c 'CREATE SCHEMA IF NOT EXISTS plataforma;'
for migracion in "${RAIZ}"/apps/backend/migraciones/*.sql; do
  sed 's/--> statement-breakpoint//' "${migracion}" | psql_propietario
  echo "Aplicada $(basename "${migracion}")"
done

mkdir -p "${SALIDA}"
psql_propietario -At -c "
SELECT json_build_object(
  'columnas', (SELECT json_agg(json_build_object('esquema', table_schema, 'tabla', table_name, 'columna', column_name,
                 'tipo', data_type, 'nulo', is_nullable = 'YES') ORDER BY table_schema, table_name, ordinal_position)
               FROM information_schema.columns WHERE table_schema IN ('plataforma') OR table_schema LIKE 'm_\_%'),
  'restricciones', (SELECT json_agg(json_build_object('esquema', n.nspname, 'tabla', c.relname, 'nombre', r.conname,
                     'tipo', r.contype, 'definicion', pg_get_constraintdef(r.oid)) ORDER BY n.nspname, c.relname, r.conname)
                   FROM pg_constraint r JOIN pg_class c ON c.oid = r.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname IN ('plataforma') OR n.nspname LIKE 'm_\_%'),
  'privilegios', (SELECT json_agg(json_build_object('esquema', table_schema, 'tabla', table_name, 'privilegio', privilege_type)
                   ORDER BY table_schema, table_name, privilege_type)
                 FROM information_schema.role_table_grants WHERE grantee = 'abasteceni_app'),
  'esquemas', (SELECT json_agg(nspname ORDER BY nspname) FROM pg_namespace WHERE nspname = 'plataforma' OR nspname LIKE 'm_\_%')
)" > "${SALIDA}/catalogo.json"
node "${RAIZ}/herramientas/bd/dibujar-esquema.mjs" "${SALIDA}/catalogo.json" > "${SALIDA}/esquema-fisico.dot"
dot -Tpng -Gdpi=150 "${SALIDA}/esquema-fisico.dot" -o "${SALIDA}/esquema-fisico.png"
echo "Diagrama en ${SALIDA}/esquema-fisico.png"
