const path = require('path');
const { p, h1, h2, h3, vinetas, tabla, documento, escribir, leerJUnit } = require('./comun');
const E = require('./estado');

const REPO = path.resolve(__dirname, '../..');
const RUN = process.env.RUN_SISTEMA; // ejecución de CI con los 21 escenarios
const sistema = leerJUnit(process.env.JUNIT_SISTEMA);
const backend = leerJUnit(path.join(REPO, 'docs/evidencia/pruebas/it-02/backend/junit.xml'));
const http = backend.filter((c) => c.archivo.startsWith('test/integracion/'));
const seg = (t) => t.toFixed(2).replace('.', ',') + ' s';
const archivo = (c) => (c.archivo ? path.basename(c.archivo) : c.suite.split(' › ')[0].replace(/^pruebas\//, ''));
const nombreCorto = (c) => c.nombre.split(' › ').slice(-1)[0];
const grupo = (c) => c.nombre.split(' › ').slice(-2, -1)[0] ?? '';

const casosSistema = sistema.map((c, i) => [`CP-SIS-${String(i + 1).padStart(2, '0')}`, archivo(c), grupo(c) ? `${grupo(c)}: ${nombreCorto(c)}` : nombreCorto(c), seg(c.tiempo), c.fallo ? 'Falla' : 'Pasa']);
const porArchivoHttp = Object.entries(
  http.reduce((acc, c) => ((acc[c.archivo] = (acc[c.archivo] ?? 0) + 1), acc), {}),
).map(([a, n]) => [`\`${a.replace('test/integracion/', '')}\``, String(n)]);

const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe documenta las pruebas de sistema de AbasteceNi con la estructura de ISO/IEC/IEEE 29119-3. Comprende dos niveles: las pruebas **de extremo a extremo** con Playwright, que recorren la interfaz real contra la API, el trabajador y PostgreSQL levantados con Docker Compose, y las pruebas **de integración HTTP**, que ejercitan la API completa contra PostgreSQL real y validan cada respuesta contra el contrato OpenAPI (PA-07). Cada escenario cita el criterio de aceptación (CT) o el requisito (SYS-FN, SYS-NFN) que verifica.'),
  h2('1.2 Alcance y estado de integración'),
  p(`Las pruebas cubren lo construido en IT-00, IT-01 e IT-02 (tramo A). Las de extremo a extremo se ejecutan en el trabajo 10 de la CI (DIS-14); la ejecución citada es la ${RUN}, sobre la rama \`it-02/informes\`, que contiene el código de IT-02 y los escenarios de accesibilidad añadidos para el informe 2. ${E.resumen}`),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Uso en las pruebas de sistema'],
    [
      ['Criterios de aceptación CT-REG-01, CT-REG-02, CT-ADM-03 y CT-SEG-04', 'D2 §3', 'Escenarios de extremo a extremo y de integración HTTP con el nombre del CT'],
      ['Criterios de salida de IT-01 e IT-02', 'D4 §2.13', 'Escenarios de la línea base y de la afiliación completa'],
      ['SYS-NFN-03, 08, 09, 10 y 12', 'D2 §3', 'Límite de 120 peticiones por minuto, carga, adaptación, peso y teclado'],
      ['MD-05: servicio de aplicación y trabajador como dos procesos del mismo artefacto', 'D5 §2.12.5', 'Entorno de sistema con una imagen para la API y el trabajador, y nginx como red de distribución'],
      ['PA-07: contrato antes que el código', 'D3 §2.7.4', 'Cada respuesta HTTP de la integración se valida contra `openapi.yaml`'],
      ['DM-04: Definición de Terminado, condición 1', 'D4 §2.10', 'El criterio de aceptación se ejecuta con el método asignado y su resultado consta'],
    ],
    [36, 16, 48],
  ),
  h2('1.4 Normas aplicables'),
  vinetas([
    '**ISO/IEC/IEEE 29119-1:2022**, conceptos; **29119-2:2021**, procesos; **29119-3:2021**, documentación: plan, especificación de diseño, casos y procedimientos, e informe de finalización.',
    '**ISO/IEC/IEEE 29148:2011**, §5.2.5: cada requisito es verificable y su criterio de aceptación se convierte en caso de prueba.',
    '**ISO/IEC 27002:2022**, control 8.31: el entorno de sistema usa secretos de un solo uso y se destruye al terminar.',
  ]),

  h1('2. Desarrollo'),
  h2('2.1 Plan de prueba'),
  tabla(
    ['Elemento del plan', 'Contenido'],
    [
      ['Objetivo', 'Demostrar que los criterios de aceptación de D2 y los criterios de salida de las iteraciones se cumplen en el sistema completo, con la interfaz real y los procesos tal como se despliegan.'],
      ['Elementos de prueba', 'Imagen del artefacto (`Dockerfile`, etapa `artefacto`) ejecutada como API, trabajador, migraciones y siembra del Administrador; imagen web (`nginx:1.29-alpine`) con los activos de Vite; PostgreSQL 18.6.'],
      ['Entorno', '`docker-compose.sistema.yml`, levantado por `herramientas/sistema/ejecutar.sh` con secretos aleatorios de un solo uso. Chromium sin interfaz (Playwright 1.64.1). En la CI, `ubuntu-24.04`.'],
      ['Enfoque', 'Caja negra a través de la interfaz, con verificación del estado de la base en los criterios que exigen inspeccionarlo (estado de la cuenta, bitácora, bandeja de salida). Integración HTTP con supertest contra la composición real de la API.'],
      ['Criterios de entrada', 'Las imágenes se construyen; las migraciones aplican; la API responde en `/api/v1/salud` a través de nginx.'],
      ['Criterios de salida', 'Todos los escenarios pasan en el trabajo 10 de la CI. Un fallo impide integrar (DM-04, condición 6).'],
      ['Riesgos', 'Flaqueza por tiempos: se usan esperas por condición (`expect.poll`, `toBeVisible`) y nunca esperas fijas. Datos compartidos: cada escenario crea un RUC y un correo únicos.'],
    ],
    [22, 78],
  ),
  h2('2.2 Especificación del diseño de pruebas'),
  tabla(
    ['Condición', 'Criterio de D2 o de D4', 'Técnica', 'Nivel'],
    [
      ['Registro válido queda «Pendiente de validación»; RUC vacío rechazado con mensaje', 'CT-REG-01', 'Clases de equivalencia válidas e inválidas', 'Sistema e integración HTTP'],
      ['PDF de 4 MB aceptado; 8 MB rechazado con mensaje; contenido que no es PDF ni JPG rechazado', 'CT-REG-02', 'Valores límite alrededor de 5 MB; tipo por contenido frente a extensión', 'Sistema e integración HTTP'],
      ['Aprobar pasa a «Activa»; rechazar registra el motivo en la bitácora', 'CT-ADM-03', 'Transiciones de estado válidas e inválidas', 'Sistema e integración HTTP'],
      ['Cada uno de los cuatro roles inicia sesión y ve su panel', 'CT-SEG-04', 'Partición por rol', 'Sistema e integración HTTP'],
      ['La decisión consta en la bitácora y no puede modificarse', 'Criterio de salida de IT-02; SYS-FN-35', 'Intento de UPDATE y DELETE con el rol de la aplicación', 'Sistema e integración'],
      ['Consentimiento obligatorio y registrado con marca temporal', 'SYS-FN-36', 'Clase inválida (sin aceptar) y verificación en la bitácora', 'Sistema e integración HTTP'],
      ['Evento persistido con su cambio de estado, publicado y entregado; el circuito abre ante el fallo', 'Criterio de salida de IT-01', 'Inyección de fallos en el proveedor simulado', 'Integración; sistema para la publicación'],
      ['429 a partir de la petición 121 por IP y minuto, con dos instancias', 'SYS-NFN-03; ADR-08', 'Valor límite 120/121', 'Integración HTTP'],
      ['320 px sin desplazamiento horizontal; teclado; WCAG 2.1 AA', 'SYS-NFN-09 y 12', 'Inspección automatizada (axe-core) y navegación por teclado', 'Sistema'],
    ],
    [36, 20, 26, 18],
  ),

  h2('2.3 Procedimiento de prueba'),
  vinetas([
    '**Pruebas de extremo a extremo.** Desde la raíz del repositorio: `bash herramientas/sistema/ejecutar.sh`.',
    '**Qué hace el guion:** (1) genera claves y secretos aleatorios de un solo uso; (2) construye las imágenes y levanta PostgreSQL, migraciones, siembra, API, trabajador y web; (3) espera a que `/api/v1/salud` responda a través de nginx; (4) ejecuta Playwright; (5) guarda el registro de la API y del trabajador; (6) destruye el entorno con sus volúmenes.',
    '**Pruebas de integración HTTP.** `npm test -w @abasteceni/backend` levanta la composición real de la API sobre un PostgreSQL efímero por archivo y valida cada respuesta contra el contrato.',
  ]),

  h2('2.4 Casos de prueba de extremo a extremo y resultados'),
  p(`Casos ejecutados en la ${RUN} de la CI (trabajo 10), con sus tiempos:`),
  tabla(['ID', 'Archivo', 'Escenario', 'Tiempo', 'Resultado'], casosSistema, [10, 16, 50, 11, 13]),
  h3('Casos de integración HTTP'),
  p(`La batería principal ejecutó ${http.length} casos de integración HTTP contra PostgreSQL real en la ejecución 39033238576, todos en verde. Cada respuesta se valida contra \`packages/contrato/openapi.yaml\` (\`test/soporte/contrato.ts\`).`),
  tabla(['Archivo', 'Casos'], porArchivoHttp, [80, 20]),

  h2('2.5 Trazabilidad de los criterios de aceptación'),
  tabla(
    ['Criterio', 'Método en D2', 'Escenarios que lo ejecutan', 'Resultado'],
    [
      ['CT-REG-01 (SYS-FN-01)', 'Prueba', '`registro.spec.ts` (3); `api-cuentas-sesiones.spec.ts`; `cuenta-comercial.spec.ts`', 'Pasa'],
      ['CT-REG-02 (SYS-FN-02)', 'Prueba', '`afiliacion.spec.ts` (sistema e integración)', 'Pasa'],
      ['CT-ADM-03 (SYS-FN-03)', 'Prueba', '`afiliacion.spec.ts` (sistema e integración)', 'Pasa'],
      ['CT-SEG-04 (SYS-FN-04)', 'Prueba', '`sesion.spec.ts`; `afiliacion.spec.ts` (cuatro roles)', 'Pasa'],
      ['SYS-FN-35', 'Análisis de la tabla de auditoría', '`afiliacion.spec.ts`; suite `bd/` (informe 4b)', 'Pasa'],
      ['SYS-FN-36', 'Inspección del formulario y del registro', '`afiliacion.spec.ts` (consentimiento); captura de la pantalla 2 (informe 2)', 'Pasa'],
      ['SYS-NFN-03', 'Análisis con prueba de carga de 200 peticiones por minuto', '`api-cuentas-sesiones.spec.ts`: 120 peticiones pasan y la 121 recibe 429 con dos instancias. No se ejecutó la prueba de carga de 200', 'Pasa en el valor límite; carga pendiente'],
      ['SYS-NFN-08, 09, 10 y 12', 'Análisis y demostración', 'Lighthouse y `accesibilidad.spec.ts` (informe 2); `registro.spec.ts` a 320 px', 'Pasa'],
      ['Criterio de salida de IT-01', 'D4 §2.13', '`linea-base.spec.ts` (integración); `registro.spec.ts` (publicación en el sistema)', 'Pasa'],
      ['Criterio de salida de IT-02', 'D4 §2.13', '`afiliacion.spec.ts` (integración y sistema)', 'Pasa'],
    ],
    [22, 22, 40, 16],
  ),

  h2('2.6 Informe de finalización'),
  tabla(
    ['Medida', 'Valor'],
    [
      ['Escenarios de extremo a extremo', `${sistema.length} ejecutados · ${sistema.filter((c) => !c.fallo).length} pasan · ${sistema.filter((c) => c.fallo).length} fallan`],
      ['Casos de integración HTTP', `${http.length} ejecutados · todos pasan`],
      ['Criterios de aceptación de D2 del alcance ejecutados', 'CT-REG-01, CT-REG-02, CT-ADM-03, CT-SEG-04, SYS-FN-35 y SYS-FN-36: 6 de 6'],
      ['Retardo de publicación de eventos (MT-04)', '0,51 s (IT-01) y 0,08 s (IT-02) en la CI; umbral comprometido de 60 s (R-02)'],
      ['Ejecuciones de CI', `IT-01: 39023391840 (8 escenarios). IT-02: 39033238576 (13 escenarios). Con accesibilidad: ${RUN} (${sistema.length} escenarios)`],
    ],
    [36, 64],
  ),
  h3('Defectos detectados por las pruebas y corregidos'),
  tabla(
    ['Defecto', 'Cómo se detectó', 'Corrección'],
    [
      ['La sonda `/api/v1/salud` exigía credencial: el balanceador no habría podido usarla', 'Integración HTTP: 401 en la prueba de 429', 'Ruta marcada como pública, sujeta al límite de peticiones'],
      ['`GET /cuentas` podía responder 400 sin que el contrato lo declarara', 'Validación de respuestas contra el contrato (PA-07)', 'Respuesta 400 añadida a `openapi.yaml` y tipos regenerados'],
      ['El cliente web propagaba como error el cuerpo vacío de una respuesta sin JSON', 'Prueba del cliente HTTP', 'Detección del cuerpo vacío en `cliente-api-http.ts`'],
      ['Los adaptadores del almacén de documentos no estaban versionados', 'Construcción de la imagen del entorno de sistema', 'Patrón de `.gitignore` anclado al directorio de datos (`a25c7da`)'],
      ['Activos de la interfaz servidos sin comprimir (SYS-NFN-10)', 'Medición con Lighthouse en el entorno de sistema', 'gzip en `nginx.conf`; la carga en 3G bajó de 4,88 s a 2,79 s'],
    ],
    [36, 30, 34],
  ),

  h2('2.7 Lo construido y verificado frente a lo pendiente'),
  tabla(
    ['Elemento', 'Estado'],
    [
      ['Criterios de aceptación de SYS-FN-01 a 04, 35 y 36', E.IT02_INTEGRADA ? 'Verificados e integrados en `main`' : 'Verificados en sistema e integración; SYS-FN-01 y 04 de IT-01 integrados; los de IT-02, pendientes de la PR #3'],
      ['Prueba de carga de 200 peticiones por minuto (SYS-NFN-03) y de 500 usuarios concurrentes (SYS-NFN-06)', 'Pendientes: requieren el entorno de nube de ADR-09'],
      ['TLS 1.3 (SYS-NFN-02) y cifrado en reposo (SYS-NFN-01)', 'Pendientes: los aporta la infraestructura de producción (ADR-09); el entorno de sistema local no termina TLS'],
      ['CT-SEG-05 a CT-SEG-08 (tramos B y C de IT-02)', 'Pendientes: no construidos a la fecha de corte'],
      ['Notificaciones reales por WhatsApp Business API y correo', 'Pendientes: en el alcance vigente se verifican con proveedores simulados'],
    ],
    [50, 50],
  ),

  h1('3. Conclusiones'),
  p('Los seis criterios de aceptación de D2 del alcance construido se ejecutaron con el método asignado y su resultado consta, como exige la condición 1 de la Definición de Terminado. También se ejecutaron, contra el sistema completo, los criterios de salida de IT-01 e IT-02. Las pruebas de sistema corren en cada cambio dentro de la CI, sobre la misma imagen que se desplegaría, con secretos de un solo uso y un entorno que se destruye al terminar.'),
  p('Las pruebas cumplieron su función de control: detectaron y llevaron a corregir cinco defectos que no habrían aparecido en las pruebas unitarias. Entre ellos, una sonda de vitalidad inutilizable por el balanceador y activos sin comprimir que ponían la carga en 3G al borde del umbral. Quedan pendientes las pruebas que dependen de la infraestructura de producción (carga, TLS y cifrado en reposo) y las de los tramos B y C.'),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] ISO/IEC/IEEE 29119-1:2022, 29119-2:2021 y 29119-3:2021. _Software and systems engineering — Software testing_, partes 1, 2 y 3.'),
  p('[2] ISO/IEC/IEEE 29148:2011. _Systems and software engineering — Life cycle processes — Requirements engineering_.'),
  p('[3] ISO/IEC 27002:2022, control 8.31.'),
  p('[4] Microsoft. _Playwright_ 1.64.1. Documentación de pruebas y reportes JUnit.'),
  p('[5] Serie AbasteceNi: D2 v1.1 (criterios de aceptación), D4 v1.1 (§2.13, DM-04), D5 v1.1 (MD-05) (`docs/serie/`).'),

  h1('5. Anexos'),
  h2('Anexo A — Reportes'),
  vinetas([
    'Escenarios de extremo a extremo: `docs/evidencia/pruebas/it-01/sistema/junit.xml` (8 casos), `docs/evidencia/pruebas/it-02/sistema/junit.xml` (13 casos) y `docs/evidencia/pruebas/it-02/experiencia/sistema-junit.xml` (21 casos, con accesibilidad y capturas).',
    'Integración HTTP: `docs/evidencia/pruebas/it-02/backend/junit.xml` (156 casos de la batería principal, de los cuales ' + http.length + ' son de integración).',
    'Registro de los servicios durante la prueba: `docs/evidencia/pruebas/it-02/sistema/servicios.log`. Contiene solo método, ruta declarada, estado y duración, sin datos personales (V-03).',
  ]),
];

escribir(
  documento({
    titulo: 'Pruebas de sistema',
    numero: '4a',
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: PRUEBAS DE SISTEMA',
      subtitulo: 'Extremo a extremo con Playwright e integración HTTP contra el contrato',
      normas: [
        'ISO/IEC/IEEE 29119-1, 29119-2 y 29119-3 — pruebas de software',
        'ISO/IEC/IEEE 29148:2011 — verificabilidad de los requisitos',
        'Serie AbasteceNi: D2 (CT-REG-01, CT-REG-02, CT-ADM-03, CT-SEG-04), D4 (§2.13, DM-04), D5 (MD-05)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 4a generado.'));
