#!/usr/bin/env bash
# Aprovisionamiento de la base local (docker-compose): los dos roles de ADR-05 y
# la base de datos propiedad de abasteceni_propietario. Equivale a
# apps/backend/scripts/provisionar.ts, que usan las pruebas. Las claves llegan
# por variables de entorno y se pasan a psql como variables, nunca concatenadas.
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v clave_propietario="$CLAVE_PROPIETARIO_BD" -v clave_app="$CLAVE_APP_BD" <<'SQL'
CREATE ROLE abasteceni_propietario LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'clave_propietario';
CREATE ROLE abasteceni_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'clave_app';
CREATE DATABASE abasteceni OWNER abasteceni_propietario;
REVOKE ALL ON DATABASE abasteceni FROM PUBLIC;
GRANT CONNECT ON DATABASE abasteceni TO abasteceni_app;
SQL
