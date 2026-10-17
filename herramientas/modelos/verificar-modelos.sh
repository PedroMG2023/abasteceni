#!/usr/bin/env bash
# Verificación sintáctica de los modelos de D5 (AM-03, Anexo A; trabajo 7 de la CI).
# Procesa cada fuente PlantUML de docs/modelos/ con la versión fijada; un modelo
# que no se procesa sin error hace fallar la verificación. Exige además que estén
# los catorce modelos de D5 (DML-01: un modelo por tipo de diagrama).
# Las figuras se generan fuera del repositorio: son producto derivado (DML-03).
set -euo pipefail

VERSION="1.2026.8"
SHA256="5e1ecfa8ecd32c90b03bbf3b1eb6f020943f98ab0fcf4032be31a0002ee2c462"
URL="https://github.com/plantuml/plantuml/releases/download/v${VERSION}/plantuml-${VERSION}.jar"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE="${RAIZ}/herramientas/modelos/.cache"
JAR="${CACHE}/plantuml-${VERSION}.jar"
SALIDA="${FIGURAS:-$(mktemp -d)}"

MODELOS_ESPERADOS=(
  MA-01-casos-de-uso MA-02-actividad-negociacion MA-03-estados-cotizacion
  MA-04-secuencia-cotizacion MA-05-comunicacion-cotizacion MA-06-tiempos-reserva
  MA-07-vista-interaccion MD-01-clases MD-02-paquetes MD-03-componentes
  MD-04-estructura-compuesta-m6 MD-05-despliegue MD-06-objetos-escenario-a MD-07-perfil
)

mkdir -p "${CACHE}"
if [[ ! -f "${JAR}" ]]; then
  curl -fsSL -o "${JAR}" "${URL}"
fi
echo "${SHA256}  ${JAR}" | sha256sum --check --quiet

faltantes=0
for modelo in "${MODELOS_ESPERADOS[@]}"; do
  if [[ ! -f "${RAIZ}/docs/modelos/${modelo}.puml" ]]; then
    echo "✗ Falta el modelo ${modelo}.puml"
    faltantes=$((faltantes + 1))
  fi
done

shopt -s nullglob
fuentes=("${RAIZ}"/docs/modelos/*.puml)
echo "PlantUML ${VERSION}: procesando ${#fuentes[@]} modelos…"
java -Djava.awt.headless=true -jar "${JAR}" -tsvg -failfast2 -o "${SALIDA}" "${fuentes[@]}"
echo "✓ ${#fuentes[@]} modelos procesados sin error (figuras en ${SALIDA})."

if (( faltantes > 0 )); then
  echo "✗ Faltan ${faltantes} de los 14 modelos de D5."
  exit 1
fi
echo "✓ Están los 14 modelos de D5."
