#!/usr/bin/env bash
# Regenera los informes de docs/informes/ (CLAUDE.md §13) desde la evidencia
# versionada. Requiere Docker (diagrama físico), Graphviz y Python con Pillow.
# Variables: RECUPERACION_INTEGRADA=1 y COMMIT_RECUPERACION=<sha> cuando se
# fusione la PR #8 (SYS-FN-05 y 08); REVISION_REGISTRADA=1 cuando conste la
# revisión de la segunda persona del equipo en las PR (informe 6). Las PR #3 y
# #6 ya están fusionadas (estado.js). RUN_SISTEMA, JUNIT_SISTEMA, RAMA_SISTEMA,
# RUN_BACKEND y JUNIT_BACKEND fijan la evidencia del informe 4a.
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AQUI="${RAIZ}/herramientas/informes"
export FIGURAS="$(mktemp -d)"
cd "${AQUI}" && npm ci --no-audit --no-fund --silent

# Figura del informe 1: grafo de dependencias agrupado por capa y módulo.
(cd "${RAIZ}" && npx depcruise apps/backend/src --config .dependency-cruiser.cjs --output-type dot \
  --collapse '^apps/backend/src/(dominio/[^/]+|infraestructura/[^/]+|aplicacion/[^/]+|composicion|main\.[a-z]+\.ts)' \
  | sed 's/Helvetica-bold/DejaVu Sans/g; s/Helvetica/DejaVu Sans/g' | dot -Tpng -Gdpi=150 -Grankdir=LR -o "${FIGURAS}/grafo-dependencias.png")

# Figuras del informe 2: capturas de la afiliación y de la recuperación (e2e/pruebas/capturas.spec.ts).
python3 - "${RAIZ}/docs/evidencia/pruebas/it-02/experiencia/capturas" "${FIGURAS}" <<'PY'
import sys
from PIL import Image
base, salida = sys.argv[1], sys.argv[2]
def mosaico(nombres, archivo, alto=1100):
    imgs = [Image.open(f'{base}/{n}.png') for n in nombres]
    imgs = [i.crop((0, 0, i.width, min(i.height, int(i.width * alto / 360)))) for i in imgs]
    imgs = [i.resize((int(i.width * alto / i.height), alto)) for i in imgs]
    m = Image.new('RGB', (sum(i.width for i in imgs) + 24 * (len(imgs) - 1), alto), 'white')
    x = 0
    for i in imgs:
        m.paste(i, (x, 0)); x += i.width + 24
    m.save(f'{salida}/{archivo}')
mosaico(['01-inicio', '02-registro-vacio', '03-registro-errores'], 'fig-ux-1.png')
mosaico(['04-registro-ruc-con-guiones', '05-registro-confirmado', '06-sesion-cuenta-pendiente'], 'fig-ux-2.png')
mosaico(['07-panel-administrador-rechazo', '08-panel-administrador-aprobada', '09-panel-comprador'], 'fig-ux-3.png')
mosaico(['10-recuperacion-aviso', '11-restablecimiento-errores', '12-restablecimiento-enlace-vencido'], 'fig-ux-4.png')
PY

# Figura del informe 4b: diagrama físico generado desde las migraciones.
bash "${RAIZ}/herramientas/bd/diagrama-fisico.sh" "${FIGURAS}/esquema" > /dev/null
cp "${FIGURAS}/esquema/esquema-fisico.png" "${FIGURAS}/esquema-fisico.png"

D="${RAIZ}/docs/informes"
# Evidencia del cierre de SYS-FN-05 y 08: los reportes que publicó la ejecución 39339908565.
EVIDENCIA="${RAIZ}/docs/evidencia/pruebas/it-02/tramo-bc"
export RUN_SISTEMA="${RUN_SISTEMA:-ejecución 39339908565}"
export JUNIT_SISTEMA="${JUNIT_SISTEMA:-${EVIDENCIA}/sistema/junit.xml}"
export RAMA_SISTEMA="${RAMA_SISTEMA:-it-02/recuperacion}"
export RUN_BACKEND="${RUN_BACKEND:-ejecución 39339908565}"
export JUNIT_BACKEND="${JUNIT_BACKEND:-${EVIDENCIA}/backend/junit.xml}"
export JUNIT_BD="${JUNIT_BD:-${EVIDENCIA}/bd/junit.xml}"
node informe1.js "${D}/Informe1_SOLID_AbasteceNi_v1.0.docx"
node informe2.js "${D}/Informe2_ISO9241_Experiencia_de_Usuario_AbasteceNi_v1.0.docx"
node informe3.js "${D}/Informe3_Programacion_Segura_AbasteceNi_v1.0.docx"
node informe4a.js "${D}/Informe4a_Pruebas_de_Sistema_AbasteceNi_v1.0.docx"
node informe4b.js "${D}/Informe4b_Pruebas_Base_de_Datos_AbasteceNi_v1.0.docx"
node informe6.js "${D}/Informe6_Repositorio_AbasteceNi_v1.0.docx"
