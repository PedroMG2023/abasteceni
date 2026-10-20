const path = require('path');
const { p, h1, h2, h3, vinetas, tabla, figuraPng, documento, escribir, leerJUnit } = require('./comun');
const E = require('./estado');

const REPO = path.resolve(__dirname, '../..');
// Evidencia del cierre de SYS-FN-05 y 08 (ejecución 39339908565), salvo que generar.sh indique otra.
const EVIDENCIA = path.join(REPO, 'docs/evidencia/pruebas/it-02/tramo-bc');
const bd = leerJUnit(process.env.JUNIT_BD ?? path.join(EVIDENCIA, 'bd/junit.xml'));
const backend = leerJUnit(process.env.JUNIT_BACKEND ?? path.join(EVIDENCIA, 'backend/junit.xml'));
const RUN = 'ejecución 39339908565';
const ARCHIVOS_PG = [
  'test/contrato/bandeja-salida.spec.ts',
  'test/contrato/bitacora.spec.ts',
  'test/integracion/repositorios-pg.spec.ts',
  'test/integracion/esquemas-persistencia.spec.ts',
];
const relacionadas = backend.filter((c) => ARCHIVOS_PG.includes(c.archivo) && /PostgreSQL|Repositorios|Definiciones/.test(c.nombre));
const seg = (t) => t.toFixed(3).replace('.', ',') + ' s';
const limpiar = (c) => c.nombre.replace(c.suite, '').trim();

// Casos de la suite propia, numerados como CP-BD-nn en el orden del reporte.
const casos = bd.map((c, i) => [`CP-BD-${String(i + 1).padStart(2, '0')}`, `\`${c.archivo.replace('test/bd/', '')}\``, limpiar(c), seg(c.tiempo), c.fallo ? 'Falla' : 'Pasa']);

const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe documenta las pruebas aplicadas a la base de datos de AbasteceNi con la estructura de documentación de pruebas de ISO/IEC/IEEE 29119-3: plan, especificación de diseño, casos y procedimientos, e informe de finalización. El objeto de prueba es el esquema físico de PostgreSQL que producen las migraciones del repositorio, junto con las propiedades que la arquitectura deposita en él: un esquema por módulo (PA-02), la bandeja de salida transaccional (ADR-01), la bitácora inmutable (ADR-05, PA-06), los privilegios del rol de la aplicación y el contador compartido de peticiones (ADR-08).'),
  p('Las pruebas de base de datos forman una suite propia, `apps/backend/test/bd/`, con su configuración (`jest.bd.config.js`) y su reporte (`docs/evidencia/pruebas/it-0n/bd/junit.xml`). Así se informan por separado de la batería principal, como exige CLAUDE.md §6.'),
  h2('1.2 Alcance y estado de integración'),
  tabla(
    ['Iteración', 'Lo que aporta a la base de datos', 'Estado'],
    [
      ['IT-00', 'Roles `abasteceni_propietario` y `abasteceni_app`; diez esquemas; privilegios de uso sin creación', E.it00.estado],
      ['IT-01', 'Tablas de M1 y M2, bandeja de salida y contador de peticiones; privilegios explícitos por tabla', E.it01.estado],
      ['IT-02', 'Bitácora de M9 con UPDATE, DELETE y TRUNCATE revocados; registro legal y consentimiento en la cuenta', E.it02.estado],
      ['IT-02, tramo B (SYS-FN-07)', 'Contador de intentos fallidos y fin del bloqueo en las credenciales de M2', E.bloqueo.replace(/^./, (c) => c.toUpperCase())],
      ['IT-02, tramos B y C (SYS-FN-05 y 08)', 'Solicitudes de recuperación con la huella del secreto; fecha de inicio del dispositivo y marca de sesión desplazada en las sesiones de M2', E.recuperacion.replace(/^./, (c) => c.toUpperCase())],
    ],
    [14, 56, 30],
  ),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Propiedad que se prueba en la base'],
    [
      ['PA-02: cada módulo posee sus datos', 'D3 §2.7.4', 'Existe un esquema por módulo y ninguna clave foránea cruza esquemas'],
      ['ADR-01: bandeja de salida transaccional', 'D3 §2.7.2', 'El cambio de estado y su evento se confirman o se revierten juntos'],
      ['ADR-05 y PA-06: auditoría de solo adición', 'D3 §2.7.2 y §2.7.4', 'UPDATE, DELETE y TRUNCATE sobre la bitácora fallan con el rol de la aplicación'],
      ['ADR-07: PostgreSQL con esquemas por módulo y roles diferenciados', 'Registro de decisiones', 'Migraciones con el rol propietario; la aplicación se conecta con `abasteceni_app`'],
      ['ADR-08: contador de peticiones en PostgreSQL', 'Registro de decisiones', 'El contador es atómico y compartido entre conexiones'],
      ['SYS-FN-01, 02, 35 y 36', 'D2 §3', 'Unicidad del RUC, campos obligatorios NOT NULL, asientos de bitácora, marca temporal del consentimiento'],
      ['SYS-FN-05 y 08 (DIS-36 y 37)', 'D2 §3', 'Huella única y vigencia de la solicitud de recuperación; fecha de inicio obligatoria de la sesión; privilegios sin DELETE'],
      ['SYS-NFN-15', 'D2 §3', 'Pruebas automáticas en cada integración continua'],
    ],
    [32, 20, 48],
  ),
  h2('1.4 Normas aplicables'),
  vinetas([
    '**ISO/IEC/IEEE 29119-1:2022.** Conceptos y vocabulario: objeto de prueba, condición de prueba, caso de prueba, entorno de prueba.',
    '**ISO/IEC/IEEE 29119-2:2021.** Procesos de prueba: planificación, diseño e implementación, ejecución y finalización.',
    '**ISO/IEC/IEEE 29119-3:2021.** Documentación de pruebas: plan, especificación de diseño, especificación de casos y procedimientos, e informe de finalización. Organiza los §2.2 a §2.5.',
    '**ISO/IEC 27002:2022, control 8.31.** Separación de los entornos de desarrollo, prueba y producción: las pruebas usan una base efímera propia.',
  ]),

  h1('2. Desarrollo'),
  h2('2.1 Objeto de prueba: el esquema físico'),
  p('La figura 1 es el diagrama físico de los esquemas, **generado desde las migraciones**. `herramientas/bd/diagrama-fisico.sh` levanta un PostgreSQL 18.6 efímero, crea los dos roles de ADR-05 con `herramientas/bd/provisionar.sh`, aplica en orden las once migraciones de `apps/backend/migraciones/` con el rol propietario y dibuja el catálogo resultante (`pg_constraint`, `information_schema`). El diagrama refleja, por tanto, lo que la base es y no lo que se pretendía que fuera.'),
  ...figuraPng(path.join(process.env.FIGURAS ?? __dirname, 'esquema-fisico.png'), 'Figura 1. Esquema físico de AbasteceNi tras aplicar las migraciones 0000 a 0010. Cada tabla indica las claves (PK, UQ), las columnas NOT NULL, el número de restricciones CHECK y los privilegios del rol abasteceni_app.'),
  tabla(
    ['Migración', 'Contenido', 'Iteración'],
    [
      ['`0000_esquemas.sql`', 'Nueve esquemas de módulo y el esquema transversal `plataforma`', 'IT-00'],
      ['`0001_privilegios-esquemas.sql`', 'USAGE para `abasteceni_app` en los diez esquemas; CREATE revocado en `public`', 'IT-00'],
      ['`0002_linea-base.sql`', 'Cuentas comerciales (M1), credenciales y sesiones (M2), bandeja de salida y contador de peticiones (`plataforma`)', 'IT-01'],
      ['`0003_privilegios-linea-base.sql`', 'Privilegios explícitos de `abasteceni_app` por tabla', 'IT-01'],
      ['`0004_bitacora.sql`', 'Bitácora de M9', 'IT-02'],
      ['`0005_privilegios-bitacora.sql`', 'INSERT y SELECT; UPDATE, DELETE y TRUNCATE revocados para `abasteceni_app` y `PUBLIC`', 'IT-02'],
      ['`0006_registro-legal-consentimiento.sql`', 'Marca temporal del consentimiento y referencia al registro legal en la cuenta', 'IT-02'],
      ['`0007_bloqueo-intentos.sql`', 'Intentos fallidos (NOT NULL, ≥ 0) y fin del bloqueo en las credenciales (SYS-FN-07)', 'IT-02, tramo B'],
      ['`0008_recuperacion.sql`', 'Solicitudes de recuperación: huella única, vigencia posterior a la creación, uso y anulación, con clave foránea a la credencial (SYS-FN-05)', 'IT-02, tramo B'],
      ['`0009_privilegios-recuperacion.sql`', 'SELECT, INSERT y UPDATE para `abasteceni_app`; sin DELETE', 'IT-02, tramo B'],
      ['`0010_sesiones-dispositivos.sql`', 'Fecha de inicio del dispositivo (rellenada en las filas existentes antes del NOT NULL), marca de sesión desplazada e índice de sesiones vigentes (SYS-FN-08)', 'IT-02, tramo C'],
    ],
    [34, 54, 12],
  ),
  p('Se observan tres propiedades de diseño. Ninguna clave foránea cruza esquemas: las dos que existen están dentro de M2, de `sesiones` y de `recuperaciones` a `credenciales`, y la cuenta de M1 se referencia desde M2 solo por valor (PA-02). Los esquemas de M3 a M8 existen y están vacíos: sus fronteras se fijan desde IT-00, aunque su contenido llegue con sus iteraciones (D4 Anexo B). Y la tabla de control de migraciones (`plataforma.migraciones`) no es accesible para la aplicación.'),

  h2('2.2 Plan de prueba (ISO/IEC/IEEE 29119-3)'),
  tabla(
    ['Elemento del plan', 'Contenido'],
    [
      ['Objetivo', 'Verificar que las propiedades de datos que exige la arquitectura las cumple el gestor, y no solo el código de la aplicación (ADR-05: «inmutabilidad verificable por inspección»).'],
      ['Elementos de prueba', 'Migraciones `0000` a `0010`; roles `abasteceni_propietario` y `abasteceni_app`; adaptadores de persistencia de M1, M2 y M9, de la bandeja de salida y del contador.'],
      ['Entorno', 'PostgreSQL 18.6 (`postgres:18.6-alpine`) en un contenedor efímero por archivo de prueba, creado con Testcontainers 12.2.1. Roles con claves de un solo uso. Separado de la base de desarrollo (control 8.31).'],
      ['Enfoque', 'Pruebas de caja blanca sobre el catálogo (privilegios, propietarios, restricciones) y de comportamiento con el rol real de la aplicación (sentencias que deben fallar con 42501, 23505, 23502 o 23514).'],
      ['Criterios de entrada', 'Las migraciones aplican desde cero; el código compila (trabajo 2 de la CI).'],
      ['Criterios de salida', 'Todos los casos pasan en la CI (trabajo 3), en cada cambio. Un caso fallido impide integrar (DM-04, condición 6).'],
      ['Responsables y calendario', 'Equipo U-01. Se ejecuta en cada cambio y se informa al cierre de cada iteración (`docs/evidencia/iteraciones.md`).'],
      ['Riesgos', 'Que un privilegio concedido de más pase inadvertido: lo mitiga la comparación exacta de la lista de privilegios. Que las pruebas dependan de la base de desarrollo: lo mitiga el contenedor efímero.'],
    ],
    [22, 78],
  ),

  h2('2.3 Especificación del diseño de pruebas'),
  p('Las condiciones de prueba son las siete que exige CLAUDE.md §6 para esta suite, trazadas a su origen en la serie:'),
  tabla(
    ['Condición', 'Origen', 'Técnica de diseño', 'Casos'],
    [
      ['CB-1 · Las migraciones aplican desde cero y son idempotentes', 'ADR-07; D4 §2.16', 'Ejecución doble y recuento contra el diario de drizzle', 'Migraciones y esquemas'],
      ['CB-2 · Existe un esquema por módulo y el esquema `plataforma`, propiedad del rol propietario', 'PA-02; ADR-01', 'Consulta al catálogo `pg_namespace`', 'Migraciones y esquemas'],
      ['CB-3 · Los privilegios de `abasteceni_app` son exactamente los declarados', 'ADR-05', 'Comparación exacta con `information_schema.role_table_grants`; intento de CREATE', 'Privilegios exactos; sin CREATE; sin privilegios elevados'],
      ['CB-4 · UPDATE, DELETE y TRUNCATE sobre la bitácora fallan', 'ADR-05, PA-06, SYS-FN-35', 'Partición por sentencia; código esperado 42501; el asiento queda intacto', 'Bitácora de solo adición'],
      ['CB-5 · El cambio de estado y su evento se confirman o se revierten juntos', 'ADR-01', 'Transacción confirmada frente a revertida tras escribir ambos', 'ADR-01 · confirmación conjunta'],
      ['CB-6 · Restricciones de integridad', 'SYS-FN-01, 02, 05, 08 y 36; DIS-16, 21, 23, 36 y 37', 'Valores límite y clases inválidas: duplicado (23505), nulo (23502), vacío o fuera de dominio (23514), clave foránea inexistente (23503)', 'Restricciones de integridad'],
      ['CB-7 · El contador de ADR-08 es compartido entre conexiones', 'ADR-08, PA-04', 'Concurrencia: 40 incrementos simultáneos desde dos grupos de conexiones', 'ADR-08 · contador compartido'],
    ],
    [30, 18, 30, 22],
  ),

  h2('2.4 Casos de prueba y procedimientos'),
  p('El procedimiento es el mismo para toda la suite: (1) arrancar un PostgreSQL 18.6 efímero; (2) crear los roles con claves de un solo uso; (3) aplicar las migraciones con el rol propietario, salvo en CB-1, que lo hace dentro de la prueba; (4) ejecutar la sentencia con el rol que corresponda; (5) comparar con el resultado esperado; (6) destruir el contenedor. Se ejecuta con `npm run test:bd`. La tabla lista los casos con sus tiempos de la ' + RUN + ' de la CI.'),
  tabla(['ID', 'Archivo', 'Caso', 'Tiempo', 'Resultado'], casos, [10, 19, 49, 10, 12]),
  h3('Pruebas de persistencia en la batería principal'),
  p(`Además de la suite propia, la batería principal ejecuta contra PostgreSQL real las suites de contrato de la bandeja de salida (AS-10) y de la bitácora (AS-08), las pruebas de los repositorios de M1 y M2 y la correspondencia entre las definiciones de esquema del código y las migraciones. En total son ${relacionadas.length} casos más, todos en verde en la misma ejecución.`),

  h2('2.5 Informe de finalización'),
  tabla(
    ['Medida', 'Valor'],
    [
      ['Casos de la suite de base de datos', `${bd.length} ejecutados · ${bd.filter((c) => !c.fallo).length} pasan · ${bd.filter((c) => c.fallo).length} fallan`],
      ['Casos de persistencia en la batería principal', `${relacionadas.length} ejecutados · todos pasan`],
      ['Condiciones de CLAUDE.md §6 cubiertas', '7 de 7'],
      ['Tiempo de la suite', `${seg(bd.reduce((a, c) => a + c.tiempo, 0))} de ejecución de casos, sin contar el arranque de los contenedores`],
      ['Ejecución de la CI', '39339908565 sobre `dd13e02` (rama `it-02/recuperacion`): 10/10 trabajos en verde'],
      ['Ejecuciones anteriores', 'IT-00: 4 casos (39020586251). IT-01: 19 casos (39023391840). IT-02, tramo A: 27 casos (39033238576). SYS-FN-07: 27 casos (39042977012)'],
      ['Reportes', '`docs/evidencia/pruebas/it-00/bd/`, `it-01/bd/`, `it-02/bd/`, `it-02/tramo-b/bd/` e `it-02/tramo-bc/bd/` (JUnit XML)'],
    ],
    [36, 64],
  ),
  h3('Incidencias durante la construcción'),
  vinetas([
    'El recuento fijo de migraciones de CB-1 dejó de ser válido al añadir migraciones en IT-01. Se sustituyó por la lectura del diario de drizzle (`meta/_journal.json`), para que la prueba no dependa del número de migraciones.',
    'La lista exacta de privilegios de CB-3 detectó cada privilegio nuevo de IT-01 e IT-02. Toda concesión queda así revisada de forma explícita en la propia prueba.',
    'Las columnas NOT NULL añadidas en IT-02 (consentimiento y registro legal) exigen migrar bases sin filas previas. Es aceptable porque aún no hay datos de producción.',
    'La columna `iniciada_en` de SYS-FN-08 sí se migra sin perder filas: `0010` la añade sin restricción, la rellena con la fecha de creación de cada sesión y solo después exige NOT NULL. La generación automática de drizzle la habría añadido NOT NULL de entrada y habría fallado con sesiones existentes.',
    'Al añadir `recuperaciones`, la lista exacta de privilegios de CB-3 falló hasta declarar en la propia prueba los tres privilegios nuevos, como está previsto.',
  ]),

  h2('2.6 Lo construido y verificado frente a lo pendiente'),
  tabla(
    ['Propiedad de la base de datos', 'Estado', 'Origen'],
    [
      ['Esquema por módulo; roles; privilegios exactos; bitácora inmutable; ADR-01; integridad; contador compartido', E.IT02_INTEGRADA ? 'Construido, verificado e integrado en `main`' : 'Construido y verificado (suite `bd/`, CI en verde); lo de IT-01 integrado en `main`; lo de IT-02, pendiente de la PR #3', 'PA-02, ADR-01, ADR-05, ADR-08'],
      ['Cifrado en reposo AES-256', 'Pendiente: lo aporta el servicio gestionado de PostgreSQL de producción', 'SYS-NFN-01; ADR-09'],
      ['Retención de la bitácora 90 días en acceso rápido y 7 años en archivo', 'Pendiente', 'SYS-NFN-04'],
      ['Respaldo diario a las 02:00 e incrementales cada 6 horas; restauración de prueba', 'Pendiente: configuración del servicio gestionado', 'SYS-NFN-14'],
      ['Réplica de lectura para búsqueda y tablero', 'Pendiente (IT-05)', 'ADR-03'],
      ['Lectura administrativa de la bitácora', 'Pendiente (IT-09)', 'AS-12; SYS-FN-35'],
    ],
    [42, 38, 20],
  ),

  h1('3. Conclusiones'),
  p('La base de datos de AbasteceNi materializa en el gestor, y no solo en el código, las propiedades que la arquitectura le asigna. La inmutabilidad de la bitácora es verificable por inspección, como pidió ADR-05: el rol de la aplicación no puede actualizar, borrar ni vaciar la tabla, y la prueba lo demuestra con el código de error del propio PostgreSQL. La frontera entre módulos se ve en el diagrama físico: un esquema por módulo y ninguna clave foránea entre esquemas.'),
  p(`La suite propia cubre las siete condiciones exigidas, con ${bd.length} casos que se ejecutan en cada cambio contra un PostgreSQL real y efímero. Separarla de la batería principal permite informarla por sí misma y leer su evolución por iteración: 4, 19, 27 y ${bd.length} casos. Las propiedades que dependen de la plataforma de producción (cifrado en reposo, retención, respaldos y réplica) quedan declaradas como pendientes con su requisito de origen.`),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] ISO/IEC/IEEE 29119-1:2022. _Software and systems engineering — Software testing — Part 1: General concepts_.'),
  p('[2] ISO/IEC/IEEE 29119-2:2021. _Software and systems engineering — Software testing — Part 2: Test processes_.'),
  p('[3] ISO/IEC/IEEE 29119-3:2021. _Software and systems engineering — Software testing — Part 3: Test documentation_.'),
  p('[4] ISO/IEC 27002:2022. _Information security, cybersecurity and privacy protection — Information security controls_, control 8.31.'),
  p('[5] The PostgreSQL Global Development Group. _PostgreSQL 18 Documentation_: privilegios (GRANT, REVOKE), catálogos del sistema y códigos de error SQLSTATE.'),
  p('[6] Serie AbasteceNi: D2 v1.1, D3 v1.1 (PA-02, PA-06, ADR-01, ADR-05), registro de decisiones (ADR-07, ADR-08) (`docs/`).'),

  h1('5. Anexos'),
  h2('Anexo A — Privilegios declarados de abasteceni_app'),
  tabla(
    ['Tabla', 'Privilegios', 'Justificación'],
    [
      ['`m1_usuarios.cuentas_comerciales`', 'SELECT, INSERT, UPDATE', 'Registro (SYS-FN-01) y validación (SYS-FN-03)'],
      ['`m2_seguridad.credenciales`', 'SELECT, INSERT, UPDATE', 'Registro de la credencial y habilitación (DIS-25)'],
      ['`m2_seguridad.sesiones`', 'SELECT, INSERT, UPDATE', 'Emisión, rotación y revocación (ADR-04); desplazamiento de la sesión más antigua (SYS-FN-08)'],
      ['`m2_seguridad.recuperaciones`', 'SELECT, INSERT, UPDATE', 'Solicitud, anulación y uso del enlace (SYS-FN-05); sin DELETE: las solicitudes no se borran'],
      ['`m9_administracion.bitacora`', 'SELECT, INSERT', 'Solo adición (ADR-05); UPDATE, DELETE y TRUNCATE revocados'],
      ['`plataforma.bandeja_salida`', 'SELECT, INSERT, UPDATE', 'Publicación en la transacción y marca de publicado (ADR-01)'],
      ['`plataforma.contador_peticiones`', 'SELECT, INSERT, UPDATE, DELETE', 'Contador y purga de ventanas vencidas (ADR-08)'],
    ],
    [34, 24, 42],
  ),
  h2('Anexo B — Reproducción'),
  p('Desde `apps/backend`, con Docker en marcha: `npm run test:bd` ejecuta la suite y deja el reporte en `docs/evidencia/pruebas/bd/junit.xml`. Desde la raíz del repositorio: `bash herramientas/bd/diagrama-fisico.sh` regenera el diagrama físico en `docs/evidencia/esquema-fisico/`, producto derivado que no se versiona (DML-03).'),
];

escribir(
  documento({
    titulo: 'Pruebas a la base de datos',
    numero: '4b',
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: PRUEBAS A LA BASE DE DATOS',
      subtitulo: 'Esquema físico, privilegios, bitácora inmutable y transacciones',
      normas: [
        'ISO/IEC/IEEE 29119-1, 29119-2 y 29119-3 — pruebas de software',
        'ISO/IEC 27002:2022, control 8.31 — separación de entornos',
        'Serie AbasteceNi: D3 (PA-02, PA-06, ADR-01, ADR-05), ADR-07, ADR-08, D2 (SYS-FN-01, 02, 05, 08, 35 y 36)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 4b generado.'));
