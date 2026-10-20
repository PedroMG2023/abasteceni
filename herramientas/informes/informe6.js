const { p, h1, h2, h3, vinetas, tabla, documento, escribir } = require('./comun');
const { execFileSync } = require('child_process');
const path = require('path');
const E = require('./estado');

// Recuentos de commits desde la base documental (28f9d6d), calculados del historial.
const asuntos = execFileSync('git', ['log', '--no-merges', '--format=%s', '28f9d6d..HEAD'], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' })
  .trim()
  .split('\n');
const porTipo = asuntos.reduce((acc, a) => {
  const tipo = (a.match(/^([a-z]+)(\([^)]*\))?:/) ?? [])[1] ?? 'otro';
  acc[tipo] = (acc[tipo] ?? 0) + 1;
  return acc;
}, {});
const n = (tipo) => String(porTipo[tipo] ?? 0);
const conReferencias = asuntos.filter((a) => a.includes('[')).length;

const REVISION_REGISTRADA = process.env.REVISION_REGISTRADA === '1';
// Fecha y hora UTC de la fusión de la PR #8, si ya ocurrió (p. ej. «2026-10-20 18:00»).
const FUSION_RECUPERACION = process.env.FUSION_RECUPERACION ?? '';

const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe describe cómo se gestiona la configuración del software de AbasteceNi en su repositorio, conforme al proceso de gestión de la configuración de ISO/IEC/IEEE 12207:2017 (§6.3.5) y al paquete de despliegue de gestión de la configuración de ISO/IEC 29110 para entidades muy pequeñas. Recorre las actividades del proceso: identificación de los elementos de configuración, control de cambios, informe de estado, evaluación y gestión de entregas. Para cada una cita la estructura, las ramas, la integración continua, las convenciones de commits y el historial reales del repositorio `PedroMG2023/abasteceni`.'),
  h2('1.2 Alcance y estado'),
  p('Abarca el repositorio desde su base documental hasta la fecha de corte, prorrogada al 20 de octubre: las iteraciones IT-00, IT-01 e IT-02 (tramos A y B, y SYS-FN-08 del tramo C) y la redacción de estos informes. ' + E.resumen),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Consecuencia sobre el repositorio'],
    [
      ['Gestión de la configuración y del cambio', 'D4 §2.16', 'Elementos bajo control, ramas de vida corta (≤ 2 días), identificación de versiones por iteración, gobierno del cambio por intercambio (DM-09)'],
      ['PR-12: control de versiones y ramas de vida corta', 'D4 §2.11', 'Ramas `it-0n/<tema>`'],
      ['DM-05: revisión cruzada obligatoria antes de integrar', 'D4 §2.10', 'Solicitudes de integración revisadas por la otra persona del equipo'],
      ['DM-06 y PR-08: integración continua con verificación de dependencias', 'D4 §2.10 y §2.11', 'Diez trabajos de CI en cada cambio'],
      ['DM-04: Definición de Terminado de siete condiciones', 'D4 §2.10', 'Integración en `main` con la batería en verde y la revisión registrada'],
      ['PR-11: registro de decisiones como artefacto vivo', 'D4 §2.11', '`docs/decisiones/registro-decisiones.md`'],
      ['DML-03: la fuente textual del modelo es normativa; la imagen es derivada', 'D5 §2.7', 'Se versionan los `.puml`, no las figuras'],
      ['RO-04: segregación de funciones', 'D1 §2.12', 'Protección de `main` y revisión por la otra persona'],
    ],
    [36, 16, 48],
  ),
  h2('1.4 Normas aplicables'),
  vinetas([
    '**ISO/IEC/IEEE 12207:2017, §6.3.5 Proceso de gestión de la configuración.** Actividades: planificar la gestión, identificar los elementos de configuración, gestionar los cambios y las entregas, informar del estado, y evaluar y auditar la configuración.',
    '**ISO/IEC 29110** (perfil básico para entidades muy pequeñas): el proceso de implementación de software exige un repositorio con control de versiones y líneas base. D4 §2.20 conserva íntegro su paquete de despliegue de gestión de la configuración.',
  ]),

  h1('2. Desarrollo'),
  h2('2.1 Identificación de los elementos de configuración'),
  tabla(
    ['Elemento (D4 §2.16)', 'Ubicación en el repositorio', 'Formato y regla'],
    [
      ['Documentos D1 a D5 de la serie', '`docs/serie/`', '`.docx` normativos; solo se sustituyen por una versión nueva de la serie'],
      ['Modelos de D5 (14)', '`docs/modelos/*.puml`', 'Fuente textual; las figuras son derivadas y no se versionan (DML-03); el trabajo 7 de la CI comprueba que compilan los 14'],
      ['Registro de decisiones (PR-11)', '`docs/decisiones/registro-decisiones.md`', 'ADR-01 a ADR-09'],
      ['Código fuente', '`apps/backend/`, `apps/web/`', 'TypeScript; monorepo con npm workspaces'],
      ['Contrato de interfaz (PA-07)', '`packages/contrato/openapi.yaml` y `generado/`', 'OpenAPI 3.0; la CI verifica que los tipos generados estén al día'],
      ['Migraciones del esquema de datos', '`apps/backend/migraciones/`', 'SQL con diario de drizzle-kit; se aplican con el rol propietario'],
      ['Configuración de la integración continua', '`.github/workflows/ci.yml`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, `redocly.yaml`', 'Diez trabajos'],
      ['Herramientas de verificación', '`herramientas/`', 'Prueba negativa de dependencias, verificación de modelos, entorno de sistema, diagrama físico'],
      ['Entorno reproducible', '`package-lock.json`, `.nvmrc`, `Dockerfile`, `docker-compose*.yml`', 'Versiones exactas; Node.js 24; PostgreSQL 18.6'],
      ['Evidencia', '`docs/evidencia/`', 'Matriz AS, discrepancias, iteraciones y reportes de pruebas por iteración'],
      ['Informes de la fase de desarrollo', '`docs/informes/`, `docs/red/`', '`.docx`'],
    ],
    [30, 34, 36],
  ),
  p('Los productos derivados no se versionan y están en `.gitignore`: figuras (`docs/figuras/`), grafo de dependencias, diagrama físico, reportes vivos de pruebas, `node_modules`, compilaciones y el directorio de documentos de desarrollo. Tampoco los secretos: `.env` y `.env.*`, salvo `.env.example`, que no lleva valores.'),

  h2('2.2 Estructura del repositorio'),
  tabla(
    ['Ruta', 'Contenido', 'Origen'],
    [
      ['`apps/backend/src/{composicion,aplicacion,dominio,infraestructura}`', 'Las cuatro capas de V-01, con `main.api.ts` y `main.trabajador.ts` como dos procesos del mismo artefacto', 'D3 V-01; D5 MD-03 y MD-05'],
      ['`apps/backend/src/dominio/{m1..m9,puertos}`', 'Los nueve módulos de V-02, cada uno con su `index.ts` público, y el paquete de puertos', 'D3 V-02; D5 MD-02'],
      ['`apps/backend/test/{unitarias,contrato,integracion,bd}`', 'Batería por tipo; la de base de datos se informa aparte', 'CLAUDE.md §6'],
      ['`apps/web/src/{paginas,componentes,hooks,puertos,infraestructura,contexto}`', 'Capa 1 desacoplada', 'ADR-06'],
      ['`e2e/pruebas/`', 'Pruebas de sistema con Playwright', 'DIS-14'],
      ['`packages/contrato/`', 'Contrato OpenAPI y tipos generados', 'PA-07'],
    ],
    [40, 42, 18],
  ),

  h2('2.3 Estrategia de ramas y solicitudes de integración'),
  p('Cada iteración se desarrolla en una rama de vida corta `it-0n/<tema>` y se integra en `main` mediante una solicitud de integración (PR-12). En la fecha de corte, las ramas se encadenaron: cada iteración partió de la anterior antes de que esta se fusionara, para no detener la construcción mientras esperaba la revisión. Al fusionarse una iteración, la siguiente se actualizó con `main` (commit `84d8b55`).'),
  tabla(
    ['Rama', 'Solicitud', 'Base', 'Estado', 'Vida de la rama'],
    [
      ['`it-00/entorno`', 'PR #1', '`main`', 'Fusionada (`9e16046`)', 'Menos de un día'],
      ['`it-01/linea-base`', 'PR #2', '`it-00/entorno`, reapuntada a `main` tras fusionarse #1', 'Fusionada (`8d1845e`)', 'Menos de un día'],
      ['`it-02/afiliacion`', 'PR #3 (la #4 se cerró como duplicada)', '`main`', E.IT02_INTEGRADA ? 'Fusionada (`6d0f2d3`)' : 'Abierta, actualizada con `main`, CI en verde', 'Menos de un día'],
      ['`it-02/informes`', 'PR #5', '`it-02/afiliacion`, reapuntada a `main` tras fusionarse #3', 'Fusionada (`72c7a93`)', 'Menos de un día'],
      ['`it-02/bloqueo`', 'PR #6', '`it-02/informes`, reapuntada a `main` tras fusionarse #5', E.BLOQUEO_INTEGRADO ? 'Fusionada (`2bd1b3e`)' : 'SYS-FN-07 y mejora del formulario; abierta', 'Menos de un día'],
      ['`it-02/cierre`', 'PR #7', '`main`', 'Fusionada (`963854d`): decisiones DIS-26, 27, 32 y 35 e informes regenerados', '2 días y 9 horas'],
      ['`it-02/recuperacion`', 'PR #8', '`it-02/cierre`; `main` integrada en la rama tras fusionarse #7 (`d878cdc`)', E.RECUPERACION_INTEGRADA ? `Fusionada (\`${process.env.COMMIT_RECUPERACION ?? ''}\`): SYS-FN-05 y 08` : 'Abierta: SYS-FN-05 y 08, CI en verde', E.RECUPERACION_INTEGRADA ? 'Menos de dos días' : 'Abierta desde el 19 de octubre'],
      ['`it-02/informes-cierre`', 'PR #9', '`it-02/recuperacion`', 'Esta versión de los informes', '—'],
    ],
    [18, 20, 26, 22, 14],
  ),
  p('Todas las ramas cumplen el plazo de D4 §2.16 (integración en dos días como máximo), salvo `it-02/cierre`: lista con la CI en verde el 17 de octubre, esperó a la fusión hasta el 20 de octubre, en total 2 días y 9 horas. Es una desviación del plazo y se registra como tal; no afectó al contenido, que no cambió en la espera. Nunca se hizo push directo a `main`: la protección de la rama lo impide, también a los administradores (§2.5).'),

  h2('2.4 Convenciones de commits'),
  p('Los commits siguen el formato convencional en español, con el ámbito entre paréntesis y las referencias a la serie entre corchetes. Por ejemplo: `feat(dominio): puertos transversales y servicios de M1 y M2 [AS-13] [SYS-FN-01] [SYS-FN-04] [ADR-04]`. El cuerpo explica el porqué y cada commit lleva la línea de coautoría.'),
  tabla(
    ['Tipo', 'Commits desde IT-00', 'Uso'],
    [
      ['`feat`', n('feat'), 'Funcionalidad: contrato, dominio, infraestructura, capa 2, composición, web, SYS-FN-07, 05 y 08'],
      ['`docs`', n('docs'), 'Evidencia de cierre de iteración, discrepancias, informes'],
      ['`test`', n('test'), 'Pruebas de base de datos, de sistema, de accesibilidad, de bloqueo'],
      ['`fix`', n('fix'), 'Correcciones detectadas por la CI y por las mediciones'],
      ['`build`', n('build'), 'Monorepo y pila de ADR-07; generador de los informes'],
      ['`ci`', n('ci'), 'Los nueve trabajos de integración continua y la prueba negativa'],
      ['`wip`', n('wip'), 'Trabajo en curso confirmado de urgencia ante un corte de cuota de la herramienta de asistencia (`3700413`)'],
    ],
    [14, 22, 64],
  ),
  p(`De los ${asuntos.length} commits sin fusión desde IT-00, ${conReferencias} llevan al menos una referencia entre corchetes a un requisito, una decisión o un elemento de la matriz, lo que permite la trazabilidad desde el historial hasta la serie (ISO/IEC/IEEE 29148, atributo de trazabilidad).`),

  h2('2.5 Control de cambios'),
  vinetas([
    '**Protección de main** (ISO/IEC 27002 8.4 y 8.32): solicitud de integración obligatoria, prohibición de push directo y forzado (también para administradores) y los diez trabajos de la CI como checks obligatorios en modo estricto, es decir, con la rama al día. La activó el titular del repositorio (DIS-11); el trabajo 10, añadido en IT-01, pasó a ser obligatorio el 17 de octubre, tras la integración de la PR #5.',
    '**Revisión cruzada (DM-05):** ' + (REVISION_REGISTRADA
      ? 'consta en las solicitudes de integración con resultado favorable.'
      : 'las solicitudes #1, #2, #3, #5, #6 y #7 se fusionaron sin una revisión de la segunda persona del equipo registrada en GitHub. Solo constan el análisis automático de CodeQL y, en la #7, un comentario de aprobación escrito desde la cuenta del propio autor, que no es una revisión cruzada. La segunda persona ya es colaboradora del repositorio, de modo que puede revisar la PR #8 y dejar constancia sobre las ya fusionadas. Para cumplir la condición 5 de la Definición de Terminado, la revisión debe quedar registrada en la solicitud o en `docs/evidencia/iteraciones.md`. Es la principal no conformidad con D4 a la fecha de corte.'),
    '**Discrepancias y reglas faltantes:** `docs/evidencia/discrepancias.md` registra 39 entradas (DIS-01 a DIS-39), todas resueltas con aprobación del equipo; las cuatro últimas, del 19 de octubre, fijan las reglas de SYS-FN-05 y 08, el aplazamiento de SYS-FN-06 y las etiquetas de las pantallas de recuperación. Las de DIS-32 y DIS-35 modifican MD-01 y quedan pendientes de incorporarse a D5 v1.2. Ninguna regla de negocio se fijó sin aprobación del equipo (CLAUDE.md §1).',
    '**Decisiones (PR-11):** el registro contiene ADR-01 a ADR-09. Las elecciones técnicas de la construcción que no alteran la arquitectura (versiones, parámetros del interruptor) se registran en `iteraciones.md`, como prevé ADR-07.',
    '**Gobierno del cambio de requisitos (DM-09):** no se admitieron cambios al catálogo. Las precisiones aprobadas (DIS-16 a DIS-23, DIS-28 a DIS-31, DIS-36, DIS-37 y DIS-39) se acumulan para la próxima versión menor de D2 y D5, como prevé D4 §2.16.',
  ]),

  h2('2.6 Integración continua'),
  tabla(
    ['Trabajo', 'Qué verifica', 'Origen'],
    [
      ['1 · Instalación', '`npm ci` desde el archivo de bloqueo', 'CLAUDE.md §7; ADR-07'],
      ['2 · Lint y tipos', 'ESLint, `tsc` por espacio de trabajo y tipos del contrato al día', 'PA-07'],
      ['3 · Pruebas', 'Backend con umbral de cobertura (global y de dominio), suite de base de datos y frontend', 'SYS-NFN-15; DM-04'],
      ['4 · Dependencias', 'Cuatro reglas de dependency-cruiser; MT-03 = 0', 'DM-06; PA-01; PA-02'],
      ['5 · Prueba negativa', 'Cada regla rechaza su fixture de acceso prohibido', 'Criterio de salida de IT-00'],
      ['6 · Contrato', 'Lint de Redocly', 'SYS-NFN-16'],
      ['7 · Modelos', 'Los 14 `.puml` compilan con PlantUML 1.2026.8 (SHA-256 verificado)', 'D5 AM-03'],
      ['8 · Auditoría', '`npm audit --audit-level=high`', 'ISO/IEC 27002 8.8'],
      ['9 · CodeQL', 'Análisis estático `security-extended`', 'ISO/IEC 27002 8.29'],
      ['10 · Sistema', 'Playwright sobre Docker Compose', 'CLAUDE.md §6; DIS-14'],
    ],
    [22, 54, 24],
  ),
  h3('Defectos de configuración que detectó la CI'),
  p('De las ejecuciones del día, 7 fallaron y 5 se cancelaron, porque un push más reciente de la misma rama sustituye al anterior. Las fallidas corresponden a commits intermedios de `it-02/afiliacion` y demuestran que la CI detectó defectos que en la máquina de desarrollo pasaban inadvertidos:'),
  tabla(
    ['Commit', 'Trabajo fallido', 'Causa', 'Corrección'],
    [
      ['`dd5a0f4`', '1 · Instalación', 'El commit de urgencia `3700413` no incluyó `package-lock.json`', 'El archivo de bloqueo se confirmó con el commit siguiente'],
      ['`46dcacb`, `d953e37`', '2, 3, 4 y 10', 'Los adaptadores del almacén de documentos nunca se habían versionado: el patrón `almacen-documentos/` de `.gitignore` ocultaba también la carpeta de código', '`a25c7da`: patrón anclado al directorio de datos'],
      ['`a25c7da`', '10 · Sistema', 'Localizador de Playwright ambiguo: el texto del consentimiento contiene «razón social» y «RUC»', '`aa72608`: etiquetas exactas'],
    ],
    [16, 18, 40, 26],
  ),
  p('La lección para el proceso: el entorno local no basta como fuente de verdad del estado de la configuración. La CI sobre un clon limpio es la que garantiza que lo integrado es lo que está versionado.'),

  h2('2.7 Identificación de versiones y líneas base'),
  vinetas([
    '**Versiones de la pila:** exactas en `package-lock.json` (`--save-exact`) y registradas por iteración en `docs/evidencia/iteraciones.md`, incluida la herramienta de modelos con su suma SHA-256.',
    '**Líneas base de iteración:** cada cierre registra los commits, las ejecuciones de CI y los reportes de pruebas (`docs/evidencia/pruebas/it-0n/`).',
    '**Etiquetas it-00, it-01 e it-02:** se crean solo tras la revisión cruzada, por indicación del equipo (CLAUDE.md §8). A la fecha **no se han creado**.',
  ]),

  h2('2.8 Informe de estado de la configuración'),
  tabla(
    ['Artefacto', 'Estado a la fecha'],
    [
      ['Matriz AS (`docs/evidencia/matriz-AS.md`)', '17 elementos Evidenciados, 1 en Discrepancia (AS-13, por nombres) y 2 de Diseño (AS-19 y AS-20)'],
      ['Iteraciones (`docs/evidencia/iteraciones.md`)', 'Entradas de cierre de IT-00, IT-01, IT-02 (tramo A), SYS-FN-07 y SYS-FN-05 y 08, con MT-03, cobertura, versiones, CI y pendientes'],
      ['Discrepancias', '39 entradas, todas resueltas'],
      ['Reportes de pruebas', 'JUnit y cobertura por iteración y por tramo (`it-02/tramo-b/`, `it-02/tramo-bc/`); capturas y mediciones de experiencia de usuario de IT-02'],
      ['Ejecuciones de CI de cierre', 'IT-00: 39020586251 (9/9). IT-01: 39023391840 (10/10). IT-02: 39033238576 (10/10). Informes: 39036501600 (10/10). SYS-FN-07: 39042977012 (10/10). SYS-FN-05 y 08: 39339908565 (10/10)'],
    ],
    [36, 64],
  ),

  h2('2.9 Seguridad del repositorio'),
  vinetas([
    'Escaneo de secretos con protección de push activado: impide subir credenciales reconocibles.',
    'CodeQL en cada cambio. Sus dos alertas de gravedad alta se trataron: la #1 se analizó y se descartó con justificación (DIS-33) y la #2, del generador de informes, se corrigió (informe 3). El código de SYS-FN-05 y 08 no añadió alertas.',
    'Scripts de instalación de dependencias de terceros denegados en `package.json` (`allowScripts`): reduce el riesgo de la cadena de suministro.',
    'Secretos de prueba de un solo uso, generados en cada ejecución y enmascarados en los registros de la CI.',
  ]),

  h2('2.10 Correspondencia con ISO/IEC 29110 (perfil básico)'),
  tabla(
    ['Producto de trabajo o tarea de ISO/IEC 29110', 'Realización en el repositorio'],
    [
      ['Repositorio del proyecto con control de versiones', 'GitHub con ramas protegidas'],
      ['Línea base del software y de la documentación', 'Cierre de iteración en `iteraciones.md`; las etiquetas se crean tras la revisión'],
      ['Solicitudes de cambio y su registro', 'Solicitudes de integración; `discrepancias.md`; registro de decisiones'],
      ['Verificación y validación registradas', 'Reportes de la CI por iteración; matriz AS; informes 4a y 4b'],
      ['Configuración del software entregada', 'Artefacto único (`Dockerfile`) y entorno de sistema reproducible'],
    ],
    [44, 56],
  ),

  h2('2.11 Lo cumplido frente a lo pendiente'),
  tabla(
    ['Elemento', 'Estado'],
    [
      ['Identificación de elementos, ramas de vida corta, commits trazables, CI de diez trabajos, protección de `main`', 'Cumplido'],
      ['Revisión cruzada registrada (DM-05; DM-04, condición 5)', REVISION_REGISTRADA ? 'Cumplido' : 'Pendiente: no consta en las PR #1 a #8'],
      ['Segunda persona del equipo como colaboradora en GitHub', 'Cumplido: aceptó la invitación'],
      ['Los diez trabajos de la CI como checks obligatorios de `main`', 'Cumplido, en modo estricto y también para administradores'],
      ['Plazo de dos días por rama (D4 §2.16)', 'Cumplido salvo `it-02/cierre` (PR #7): 2 días y 9 horas'],
      ['Integración de SYS-FN-05 y 08 (PR #8) y de esta versión de los informes (PR #9)', E.RECUPERACION_INTEGRADA ? 'PR #8 integrada; PR #9 pendiente' : 'Pendientes de la revisión cruzada'],
      ['Etiquetas de iteración `it-00`, `it-01` e `it-02`', 'Pendiente: tras la revisión'],
    ],
    [56, 44],
  ),

  h1('3. Conclusiones'),
  p('El repositorio cubre las actividades del proceso de gestión de la configuración de ISO/IEC/IEEE 12207. Sus elementos están identificados y separados de los productos derivados. Los cambios entran por ramas de vida corta y solicitudes de integración, sobre una rama principal protegida, y cada commit es trazable a la serie. El estado de la configuración se informa en artefactos vivos que la propia construcción mantiene.'),
  p('La integración continua actuó como auditoría de la configuración: detectó un archivo de bloqueo sin confirmar y archivos de código ocultos por un patrón de `.gitignore`, defectos invisibles en la máquina de desarrollo. La no conformidad principal es de proceso y no de herramienta: la revisión cruzada de DM-05 no consta en las solicitudes ya fusionadas. La segunda, también de proceso, es que una rama superó el plazo de dos días mientras esperaba la fusión. Registrarla y crear las etiquetas de iteración cierra el ciclo de las líneas base.'),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] ISO/IEC/IEEE 12207:2017. _Systems and software engineering — Software life cycle processes_, §6.3.5 Configuration management process.'),
  p('[2] ISO/IEC 29110 (serie). _Systems and software engineering — Lifecycle profiles for Very Small Entities (VSEs)_, perfil básico.'),
  p('[3] ISO/IEC 27002:2022, controles 8.4 (acceso al código fuente) y 8.32 (gestión de cambios).'),
  p('[4] Conventional Commits 1.0.0. https://www.conventionalcommits.org'),
  p('[5] Serie AbasteceNi: D4 v1.1 (§2.10, §2.11, §2.16, §2.20), D5 v1.1 (DML-03) (`docs/serie/`); `CLAUDE.md` §8.'),

  h1('5. Anexos'),
  h2('Anexo A — Solicitudes de integración'),
  tabla(
    ['Solicitud', 'Rama', 'Creada (UTC)', 'Fusionada (UTC)', 'Revisiones registradas'],
    [
      ['#1', '`it-00/entorno`', '2026-10-17 09:21', '2026-10-17 09:28', 'Ninguna humana (comentario del bot de CodeQL)'],
      ['#2', '`it-01/linea-base`', '2026-10-17 10:06', '2026-10-17 13:23', 'Ninguna humana (revisión automática de CodeQL)'],
      ['#3', '`it-02/afiliacion`', '2026-10-17 10:22', E.IT02_INTEGRADA ? '2026-10-17 14:48' : 'Abierta', 'Revisión automática de CodeQL'],
      ['#4', '`it-02/afiliacion`', '2026-10-17 13:05', 'Cerrada sin fusionar (duplicada de #3)', 'Comentario del autor'],
      ['#5', '`it-02/informes`', '2026-10-17 13:36', '2026-10-17 15:26', 'Revisión automática de CodeQL'],
      ['#6', '`it-02/bloqueo`', '2026-10-17 14:58', '2026-10-17 16:58', 'Ninguna'],
      ['#7', '`it-02/cierre`', '2026-10-17 17:01', '2026-10-20 01:57', 'Comentario de aprobación de la cuenta del autor; no es revisión cruzada'],
      ['#8', '`it-02/recuperacion`', '2026-10-20 02:01', E.RECUPERACION_INTEGRADA ? FUSION_RECUPERACION || 'Fusionada' : 'Abierta', REVISION_REGISTRADA ? 'Revisión de la segunda persona del equipo' : 'Pendiente de la revisión cruzada'],
    ],
    [12, 20, 20, 22, 26],
  ),
];

escribir(
  documento({
    titulo: 'Repositorio',
    numero: 6,
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: REPOSITORIO Y GESTIÓN DE LA CONFIGURACIÓN',
      subtitulo: 'Estructura, ramas, integración continua, convenciones e historial',
      normas: [
        'ISO/IEC/IEEE 12207:2017 §6.3.5 — gestión de la configuración',
        'ISO/IEC 29110 — perfil básico para entidades muy pequeñas',
        'Serie AbasteceNi: D4 (§2.16, DM-04, DM-05, DM-06, PR-11, PR-12), D5 (DML-03)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 6 generado.'));
