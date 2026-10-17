#!/usr/bin/env bash
# Pruebas de sistema (CLAUDE.md §6; trabajo 10 de la CI, DIS-14): levanta el
# entorno de docker-compose.sistema.yml con secretos aleatorios de un solo uso,
# ejecuta Playwright y lo desmonta. Deja el reporte en docs/evidencia/pruebas/sistema/.
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${RAIZ}"

aleatorio() { node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))"; }
export CLAVE_SUPERUSUARIO_BD="${CLAVE_SUPERUSUARIO_BD:-$(aleatorio)}"
export CLAVE_PROPIETARIO_BD="${CLAVE_PROPIETARIO_BD:-$(aleatorio)}"
export CLAVE_APP_BD="${CLAVE_APP_BD:-$(aleatorio)}"
export SECRETO_FIRMA_ACCESO="${SECRETO_FIRMA_ACCESO:-$(aleatorio)}"
export CORREO_ADMINISTRADOR="${CORREO_ADMINISTRADOR:-administrador@sistema.abasteceni.ni}"
export CONTRASENA_ADMINISTRADOR="${CONTRASENA_ADMINISTRADOR:-$(aleatorio)}"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  for secreto in CLAVE_SUPERUSUARIO_BD CLAVE_PROPIETARIO_BD CLAVE_APP_BD SECRETO_FIRMA_ACCESO CONTRASENA_ADMINISTRADOR; do
    echo "::add-mask::${!secreto}"
  done
fi

COMPOSE=(docker compose -f docker-compose.sistema.yml)
desmontar() {
  "${COMPOSE[@]}" logs --no-color api trabajador > docs/evidencia/pruebas/sistema/servicios.log 2>&1 || true
  "${COMPOSE[@]}" down -v --remove-orphans > /dev/null 2>&1 || true
}
mkdir -p docs/evidencia/pruebas/sistema
trap desmontar EXIT

"${COMPOSE[@]}" down -v --remove-orphans > /dev/null 2>&1 || true
"${COMPOSE[@]}" up -d --build

echo "Esperando a la API a través de la interfaz…"
for _ in $(seq 1 90); do
  if curl -fs http://localhost:8080/api/v1/salud > /dev/null; then break; fi
  sleep 2
done
curl -fs http://localhost:8080/api/v1/salud

npm run test:sistema

# Medición de la experiencia de usuario de la vista inicial (informe 2), opcional.
if [[ "${MEDIR_EXPERIENCIA:-}" == "1" ]]; then
  node herramientas/sistema/medir-experiencia.mjs
fi
