const path = require('path');
const { p, h1, h2, h3, vinetas, tabla, figuraPng, documento, escribir } = require('./comun');
const E = require('./estado');

const CI00 = 'CI 39020586251';
const CI01 = 'CI 39023391840';
const CI02 = 'CI 39033238576';

const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe muestra cómo se aplican los cinco principios SOLID en el código construido de AbasteceNi y con qué evidencia verificable se sostiene cada aplicación. No enuncia los principios de forma genérica: recorre los veinte elementos de la matriz de aplicación (AS-01 a AS-20) que el equipo escribió **antes** del código, en `docs/evidencia/matriz-AS.md`, y para cada uno cita el archivo y las líneas, el commit, la prueba o regla que lo verifica y la ejecución de la integración continua (CI) que lo dejó en verde.'),
  p('La matriz tiene dos tablas. La de diseño fija qué debe existir y cómo se verifica, y no se modifica durante la construcción. La de evidencia la llena la construcción. Este informe es la lectura razonada de la segunda contra la primera.'),
  h2('1.2 Alcance y estado de integración'),
  p('El alcance vigente es el de las iteraciones IT-00, IT-01 e IT-02 del documento 4 (D4 §2.13): de IT-02, los tramos A y B completos y SYS-FN-08 del tramo C. Conforme a la Definición de Terminado (DM-04, condiciones 5 y 6), un elemento solo forma parte del incremento cuando la revisión cruzada consta como favorable y está integrado en la rama principal con la batería en verde. ' + E.resumen + ' Cada afirmación del Desarrollo indica a qué iteración pertenece:'),
  tabla(
    ['Iteración', 'Rama y solicitud de integración', 'CI de cierre', 'Estado'],
    [
      ['IT-00 Entorno', '`it-00/entorno` — PR #1', `${CI00}: 9/9 trabajos en verde`, E.it00.estado],
      ['IT-01 Línea base', '`it-01/linea-base` — PR #2', `${CI01}: 10/10 en verde`, E.it01.estado],
      ['IT-02 Afiliación, tramo A', '`it-02/afiliacion` — PR #3', `${CI02}: 10/10 en verde`, E.it02.estado],
      ['IT-02, SYS-FN-07', '`it-02/bloqueo` — PR #6', 'CI 39042977012: 10/10 en verde', E.BLOQUEO_INTEGRADO ? 'Integrado en `main` (commit de fusión `2bd1b3e`)' : 'Pendiente de la revisión cruzada (PR #6)'],
      ['IT-02, SYS-FN-05 y 08', '`it-02/recuperacion` — PR #8', 'CI 39339908565: 10/10 en verde', E.RECUPERACION_INTEGRADA ? E.recuperacion.replace(/^integrados/, 'Integrados') : 'Construidos y verificados; pendientes de la revisión cruzada (PR #8)'],
    ],
    [16, 26, 26, 32],
  ),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Consecuencia sobre el diseño de clases'],
    [
      ['PA-01: las dependencias apuntan hacia el dominio', 'D3 §2.7.4', 'El dominio es TypeScript puro y declara los puertos; la infraestructura los implementa (D de SOLID).'],
      ['PA-02: cada módulo posee sus datos', 'D3 §2.7.4', 'Un módulo solo usa la interfaz pública `index.ts` de otro y su propio esquema de base de datos.'],
      ['PA-03: lo que no se espera, no se espera', 'D3 §2.7.4', 'Los efectos diferibles (notificar) salen por eventos y un despachador extensible (O).'],
      ['PA-07: interfaz documentada antes que implementada', 'D3 §2.7.4', 'El contrato OpenAPI tipa el cliente web y las respuestas del servidor (L en la capa 1).'],
      ['V-01: cuatro capas y dirección de dependencias', 'D3 §2.9.1', 'Preocupaciones transversales como envolturas de la capa 2, no dentro de los controladores (S).'],
      ['R-04: sobrecoste de indirección', 'D3 §2.7.3', 'Patrón completo en M3, M4, M6 y M8; graduado en M1, M2 y M9. Se gradúa la indirección, nunca la dirección.'],
      ['MD-02, MD-03, MD-04', 'D5 §2.12', 'Paquete de puertos, componentes del servicio y del trabajador, y la estructura de M6 (AS-19, AS-20).'],
      ['DM-06, PR-08, MT-03', 'D4 §2.10, §2.11, §2.17', 'Verificación automática de dependencias en la CI; cualquier acceso cruzado detiene la integración.'],
    ],
    [30, 16, 54],
  ),
  h2('1.4 Normas aplicables'),
  p('**SWEBOK v4, KA 03 (Software Design).** El §5.4 recoge SOLID como mnemotecnia de principios de diseño de clases, y el §1.4 los fundamenta en la modularización (una responsabilidad por módulo, en el sentido de Parnas), la separación entre interfaz e implementación y el binomio acoplamiento y cohesión. Este informe usa SOLID como lente para verificar esos principios de base.'),
  p('**ISO/IEC 25010:2011, característica Mantenibilidad.** Sus cinco subcaracterísticas (modularidad, reusabilidad, analizabilidad, modificabilidad y capacidad de prueba) son la calidad que persigue cada elemento AS. La última columna de la tabla de diseño de la matriz las asocia, y el §2.8 de este informe las contrasta con medidas reales.'),

  h1('2. Desarrollo'),
  h2('2.1 Método: matriz escrita antes que el código'),
  p('Cada elemento AS-nn declara cuatro cosas: el principio, la decisión de la serie que lo origina, el elemento de código que debe existir y la verificación que lo demuestra. La verificación es siempre **ejecutable o inspeccionable**: una prueba automatizada, una regla de la CI o una inspección de tipos. Los estados de la tabla de evidencia son: _Evidenciado_ (el código y la verificación existen y la CI está en verde), _Pendiente_, _Diseño_ (respaldado en un modelo de D5, sin código en el alcance vigente) y _Discrepancia_ (la realidad difiere del diseño, con su registro en `docs/evidencia/discrepancias.md`).'),
  p('Resultado a la fecha: **17 elementos Evidenciados**, 1 en Discrepancia por nombres (AS-13, DIS-12) y 2 de Diseño (AS-19 y AS-20, que se materializan en IT-06 con M6). Ninguno queda Pendiente.'),

  h2('2.2 La arquitectura que hace verificable a SOLID'),
  p('El backend se organiza en las cuatro capas de D3 V-01 y en los nueve módulos de V-02. La figura 1 es el grafo real de dependencias, generado por dependency-cruiser desde el código y agrupado por capa y por módulo de dominio. Se observa lo que exige PA-01: `dominio/` solo depende de sí mismo y del paquete `puertos`; `aplicacion/` e `infraestructura/` dependen del dominio y nunca entre sí; y solo `composicion/`, invocada por `main.api.ts` y `main.trabajador.ts`, ve las cuatro capas.'),
  ...figuraPng(path.join(process.env.FIGURAS ?? __dirname, 'grafo-dependencias.png'), 'Figura 1. Grafo de dependencias del backend en la rama it-02/recuperacion (dependency-cruiser + Graphviz). Los módulos M3 a M8 existen como fronteras vacías: se construyen a partir de IT-03.'),
  p('Cuatro reglas en `.dependency-cruiser.cjs` convierten esa forma en una restricción que la CI hace cumplir (trabajo 4, MT-03). Una prueba negativa (trabajo 5, `herramientas/dependencias/prueba-negativa.mjs`) exige que un fixture con un acceso prohibido por cada regla sea rechazado, y que un fixture con dependencias permitidas no lo sea. Si una regla deja de rechazar su fixture, la CI falla. Lo comprobó una prueba de mutación local: al neutralizar el origen de `pa-02-fronteras-modulo`, el trabajo 5 terminó con código 1.'),
  tabla(
    ['Regla', 'Qué prohíbe', 'Principio y origen', 'MT-03 en cada cierre'],
    [
      ['`pa-01-dominio-puro`', 'Que `dominio/` importe otra capa, un paquete npm o un módulo interno de Node', 'D · PA-01, MD-02 (AS-15)', '0 · 0 · 0'],
      ['`pa-02-fronteras-modulo`', 'Que un módulo `mN-*` importe de otro algo distinto de `dominio/mK-*/index.ts`, en todas las capas', 'D · PA-02 (AS-16)', '0 · 0 · 0'],
      ['`v-01-capa-aplicacion`', 'Que `aplicacion/` e `infraestructura/` se importen entre sí', 'D · V-01', '0 · 0 · 0'],
      ['`web-cliente-abstracto`', 'Que páginas, componentes o hooks importen el cliente HTTP concreto', 'D · PA-07, ADR-06 (AS-18)', '0 · 0 · 0'],
    ],
    [22, 40, 20, 18],
  ),

  h2('2.3 S — Principio de responsabilidad única'),
  h3('AS-01 · Máquina de estados de la cuenta comercial (M1, capa 3) — IT-02'),
  p('La transición de aprobación o rechazo pertenece a M1 (D3 §2.9.2, nota sobre SYS-FN-03). Se aísla en `apps/backend/src/dominio/m1-usuarios/maquina-estados.ts:1-18`, una tabla de transiciones sin dependencias. La operación `validar` de MD-01 la consulta (`cuenta-comercial.ts:113-120`). El servicio del módulo (`servicio-usuarios.ts:118`) no decide estados: orquesta el repositorio, la credencial de M2, la bitácora de M9 y la bandeja de salida.'),
  p('**Verificación:** `test/unitarias/dominio/cuenta-comercial.spec.ts` comprueba que las cuatro transiciones no previstas desde «Activa» y «Rechazada» se rechazan con `ErrorTransicion`, sin base de datos ni red. Commit `3700413`; ' + CI02 + '. Analizabilidad y capacidad de prueba.'),
  h3('AS-02 · Sondeo, despacho y entrega en tres piezas (trabajador) — IT-01'),
  p('El sondeo de la bandeja (`infraestructura/sondeo/sondeo-bandeja.ts:12-50`) solo toma eventos pendientes y los entrega por el puerto `PuertoDespachoEventos`; no conoce manejadores ni canales. El despachador (`aplicacion/despachador/despachador-eventos.ts:11-24`) solo resuelve manejadores por tipo. El adaptador (`infraestructura/notificacion/whatsapp.ts:24-38`) solo entrega por su canal. Cada pieza tiene pruebas unitarias con dobles de las otras dos. Commits `aff76c7` y `148f5ec`; ' + CI01 + '.'),
  h3('AS-03 · Preocupaciones transversales como envolturas de la capa 2 — IT-01'),
  p('Límite de peticiones, autenticación, control de rol, manejo uniforme de errores y trazas son cinco clases distintas en `apps/backend/src/aplicacion/transversal/`: `limite-peticiones.guard.ts`, `autenticacion.guard.ts`, `roles.guard.ts`, `filtro-errores.filter.ts` y `registro-peticiones.interceptor.ts`. Se registran en un solo lugar y en orden (`composicion/api.module.ts:124-129`). Ningún controlador contiene lógica de autenticación, de límite ni de traducción de errores.'),
  p('**Verificación:** `test/integracion/api-cuentas-sesiones.spec.ts` obtiene 401 sin credencial o con credencial alterada, 403 con un rol no autorizado y 429 en la petición 121 de un minuto, con dos instancias que comparten el contador (ADR-08). ' + CI01 + '.'),
  h3('AS-04 · Componente, hook de caso de uso y cliente API separados (capa 1) — IT-02'),
  p('En el flujo de registro, `paginas/PaginaRegistro.tsx` solo renderiza; `hooks/useRegistroCuenta.ts` guarda el estado y el envío; `infraestructura/cliente-api-http.ts` es el transporte. El hook se prueba con el cliente de prueba (`test/hooks/useRegistroCuenta.test.tsx`) y la página con el hook simulado mediante `vi.mock` (`test/paginas/PaginaRegistro.test.tsx`). Commits `ca9d385` y `46dcacb`; ' + CI02 + '.'),
  h3('AS-19 · Cuatro partes de M6 (diseño) — IT-06'),
  p('Servicio, máquina de estados, política de rondas y cálculo del precio de referencia figuran como partes separadas en MD-04 (D5 §2.12.4). Es evidencia de diseño: M6 está fuera del alcance vigente (CLAUDE.md §2; DM-07).'),

  h2('2.4 O — Principio abierto/cerrado'),
  h3('AS-05 · Segundo adaptador de notificación sin tocar el dominio ni el despachador — IT-01'),
  p('El puerto `PuertoNotificacion` tenía un adaptador de WhatsApp (proveedor simulado). El adaptador de correo, canal de reserva de R-05, se incorporó en un commit propio, `794fe51`, que agrega `infraestructura/notificacion/correo.ts` y su elección por configuración. **Verificación:** `git show --name-only 794fe51` lista ocho archivos, y **ninguno** está bajo `dominio/` ni es el despachador. El nuevo adaptador pasa la misma suite de contrato que el primero. Modificabilidad. ' + CI01 + '.'),
  h3('AS-06 · Despachador abierto a nuevos eventos — IT-01 e IT-02'),
  p('`DespachadorEventos.registrar(tipo, manejador)` (`despachador-eventos.ts:14`) asocia manejadores por tipo de evento, y la composición del trabajador los registra (`trabajador.module.ts:97-101`). La evidencia más fuerte la aportó la propia construcción: en IT-02 se añadieron los avisos de aprobación y de rechazo (`manejadores/notificar-decision-cuenta.ts`, DIS-30); con SYS-FN-07, el aviso de bloqueo por el canal de correo (`manejadores/notificar-cuenta-bloqueada.ts`, ' + E.bloqueo + '); y con SYS-FN-05, el envío del enlace de recuperación (`manejadores/notificar-recuperacion.ts`, ' + E.pr8 + '). Los tres se registraron en la composición **sin modificar** `despachador-eventos.ts`. Además, `test/unitarias/aplicacion/despachador-eventos.spec.ts` registra un manejador para un evento nuevo y comprueba que el despachador lo entrega sin cambios.'),
  h3('AS-07 · Campo de formulario extensible por composición (capa 1) — IT-02'),
  p('`componentes/CampoFormulario.tsx:1-62` recibe una definición con etiqueta, ayuda contextual (SYS-NFN-11) y opciones. Los validadores son funciones componibles (`componentes/validadores.ts`). El formulario de registro se arma componiendo nueve definiciones en `componentes/campos-registro.ts`, sin modificar el componente base. Con SYS-FN-05, las pantallas de recuperación reutilizan las definiciones del correo y de la contraseña del registro, con sus validadores, y solo cambian la etiqueta o la ayuda (`componentes/campos-recuperacion.ts:6-14`, ' + E.pr8 + '). Lo verifican `test/componentes/CampoFormulario.test.tsx` y `test/paginas/PaginaRecuperacion.test.tsx`.'),
  h3('AS-20 · Política de rondas como parámetro (diseño) — IT-06'),
  p('Según MD-04, el límite de rondas de SYS-FN-20 y el rango del histograma son parámetros de una política, separados de la máquina de estados de la cotización. Es evidencia de diseño, pendiente de IT-06.'),

  h2('2.5 L — Principio de sustitución de Liskov'),
  p('La sustitución se verifica con **suites de contrato parametrizadas**: una sola suite, escrita contra el puerto, se ejecuta sin cambios contra cada implementación (CLAUDE.md §6). Si una implementación incumple el contrato, falla la misma prueba que pasa la otra.'),
  tabla(
    ['Elemento', 'Puerto', 'Implementaciones', 'Suite de contrato', 'Qué exige el contrato'],
    [
      ['AS-08 (IT-02)', 'PuertoBitacora', 'Memoria · PostgreSQL', '`test/contrato/bitacora.contrato.ts`', 'Solo `registrar`; asiento completo (usuario, acción, recurso, detalle, IP, marca temporal); se revierte con la transacción'],
      ['AS-09 (IT-01)', 'PuertoNotificacion', 'WhatsApp · correo (simulados)', '`test/contrato/notificacion.contrato.ts`', 'Entrega por su canal; ante la caída del proveedor rechaza con `ErrorEntregaNotificacion` de su canal, que es lo que interpreta el interruptor (ADR-02)'],
      ['AS-10 (IT-01)', 'PuertoPublicacionEventos (bandeja)', 'Memoria · PostgreSQL', '`test/contrato/bandeja-salida.contrato.ts`', 'Persiste dentro de la transacción recibida; no entrega lo revertido; entrega en orden; reintenta tras el plazo'],
      ['AS-11 (IT-01)', 'ClienteApi (web)', 'HTTP generado del contrato · prueba', 'Pruebas de hooks y páginas', 'Hooks y páginas funcionan con el cliente de prueba sin cambios; el HTTP se prueba aparte contra un servidor falso'],
    ],
    [12, 18, 18, 22, 30],
  ),
  p('La sustitución también se usa en la composición. Las pruebas de integración reemplazan el reloj y el notificador por dobles desde la raíz de composición (`overrideProvider`), y la aplicación funciona igual (AS-17). Las ejecuciones ' + CI01 + ' y ' + CI02 + ' corren las cuatro suites contra PostgreSQL 18.6 real, con Testcontainers.'),

  h2('2.6 I — Principio de segregación de interfaces'),
  h3('AS-12 · El puerto de bitácora solo declara registrar — IT-02'),
  p('`dominio/puertos/bitacora.ts:18-20` declara `PuertoBitacora` con una sola operación, `registrar(asiento, tx)`. M1 y M2 no pueden leer, modificar ni borrar la bitácora porque la interfaz no lo ofrece. La lectura administrativa de IT-09 será otra interfaz. El principio se refuerza en el gestor: la migración `0005_privilegios-bitacora.sql` concede a `abasteceni_app` solo INSERT y SELECT, y revoca UPDATE, DELETE y TRUNCATE (ADR-05, PA-06). `test/bd/bitacora.spec.ts` verifica que esas tres sentencias fallan con el código `42501` de PostgreSQL.'),
  h3('AS-13 · Puertos pequeños por necesidad — IT-01 e IT-02'),
  p('En lugar de un «servicio de infraestructura» único, el dominio declara puertos con una o pocas operaciones. El estado es _Discrepancia_ solo por los nombres: se usan los de MD-03 en lugar de los de la tabla de diseño de AS-13, porque D5 prevalece sobre la matriz (DIS-12).'),
  tabla(
    ['Puerto (nombre en MD-03)', 'Nombre en AS-13', 'Operaciones', 'Consumidor'],
    [
      ['PuertoUnidadTrabajo', '—', '1: ejecutar', 'Servicios de M1 y M2'],
      ['PuertoPublicacionEventos', 'BandejaSalida', '1: publicar', 'Servicio de M1'],
      ['PuertoDespachoEventos', '—', '1: despachar', 'Sondeo del trabajador'],
      ['PuertoNotificacion', 'Notificador', '1: notificar', 'Manejadores del despachador'],
      ['PuertoBitacora', 'Bitacora', '1: registrar', 'Servicio de M1'],
      ['PuertoAlmacenDocumentos', 'AlmacenDocumentos', '3: guardar, obtener, eliminar', 'Servicio de M1 (SYS-FN-02)'],
      ['PuertoReloj', 'Reloj', '1: ahora', 'Servicios y guard de límite'],
      ['PuertoIdentificadores', '—', '1: generar', 'Servicios de M1 y M2'],
      ['PuertoContadorPeticiones', '—', '1: registrar', 'Guard de límite (ADR-08)'],
      ['Puertos de M2: derivación de clave, firma de acceso, secretos de renovación', '—', '2 cada uno', 'Servicio de M2'],
    ],
    [34, 18, 22, 26],
  ),
  h3('AS-14 · Props mínimas en la capa 1 — IT-02'),
  p('`CampoFormulario` recibe solo su definición, el valor, el error y `alCambiar` (`CampoFormulario.tsx:15-19`), nunca la cuenta completa. `AvisoFormulario` recibe tipo y texto, y `PanelCuenta`, solo el rol. Cada hook devuelve solo lo que su vista consume. Se verifica por inspección de tipos (`npm run tipos`, trabajo 2).'),

  h2('2.7 D — Principio de inversión de dependencias'),
  h3('AS-15 · El dominio no depende de nada externo — IT-00 (integrado en main)'),
  p('Ninguna clase de `dominio/` importa NestJS, Drizzle, `pg`, `node:crypto` ni otra capa. Las clases del dominio no llevan decoradores del marco. Lo exige la regla `pa-01-dominio-puro` (`.dependency-cruiser.cjs:12-20`), y el fixture `pa-01-dominio-impuro` demuestra que la regla rechaza un dominio que importa infraestructura y `node:crypto`. Commit `5d4a32b`; ' + CI00 + ', y la regla sigue en verde en ' + CI01 + ' y ' + CI02 + '.'),
  h3('AS-16 · Fronteras entre módulos — IT-00 (integrado en main)'),
  p('Un módulo solo importa el `index.ts` público de otro, también en las definiciones de esquema de la persistencia (`.dependency-cruiser.cjs:21-33`). La dependencia real M1 → M2 (crear la credencial al registrar) pasa por la interfaz `RegistroCredenciales` que exporta `dominio/m2-seguridad/index.ts`. **Criterio de salida de IT-00:** el fixture `pa-02-acceso-cruzado`, en el que m3 importa `m4-ofertas/inventario-interno.ts`, es rechazado en cada ejecución de la CI.'),
  h3('AS-17 · Raíz de composición única — IT-01'),
  p('`composicion/api.module.ts:28-95` y `composicion/trabajador.module.ts` enlazan cada puerto con su adaptador por símbolo y construyen el dominio con fábricas (`useFactory`). Es el único lugar que ve las cuatro capas, como muestra la figura 1. **Verificación:** `test/integracion/linea-base.spec.ts:70` sustituye el notificador y el reloj desde la composición, y el criterio de salida de IT-01 se cumple con esos dobles.'),
  h3('AS-18 · La capa 1 depende de la abstracción ClienteApi — IT-01'),
  p('Hooks y componentes reciben `ClienteApi` por contexto (`contexto/cliente-api.ts`); solo `contexto/ProveedorClienteApiHttp.tsx` construye el cliente concreto. Lo exigen dos reglas: `web-cliente-abstracto` en dependency-cruiser y `no-restricted-globals` de ESLint, que prohíbe `fetch` en páginas, componentes y hooks (`eslint.config.mjs:38`).'),

  h2('2.8 Graduación por R-04 en M1, M2 y M9'),
  p('R-04 acepta el riesgo de sobrecoste de indirección y lo mitiga aplicando el patrón completo solo donde hay lógica de dominio real (M3, M4, M6 y M8). Para M1, M2 y M9 el código aplica el patrón graduado de CLAUDE.md §4. Lo que se gradúa es la **cantidad** de indirección, nunca la **dirección**:'),
  vinetas([
    '**Un puerto de persistencia por módulo:** `PuertoRepositorioUsuarios` (M1) y `PuertoRepositorioSeguridad` (M2), en lugar de uno por agregado.',
    '**Un servicio por módulo:** `ServicioUsuarios` y `ServicioSeguridad`, en lugar de una clase por caso de uso.',
    '**Sin mapeador separado:** el repositorio reconstruye la entidad desde la fila (`CuentaComercial.reconstruir` en `repositorio-usuarios-pg.ts`).',
    '**Los puertos transversales se mantienen siempre:** notificación, bandeja, bitácora y almacén. Las reglas `pa-01` y `v-01` no admiten excepción en ningún módulo.',
  ]),

  h2('2.9 Efecto sobre la mantenibilidad (ISO/IEC 25010:2011)'),
  tabla(
    ['Subcaracterística', 'Elementos AS', 'Medida obtenida en la construcción'],
    [
      ['Modularidad', 'AS-02, 03, 12, 13, 14, 15, 16', 'MT-03 = 0 en las tres iteraciones (179 módulos analizados en IT-02); los cinco fixtures prohibidos se rechazan en cada CI'],
      ['Reusabilidad', 'AS-06, 07, 09', 'El despachador y el campo de formulario se reutilizaron en IT-02 sin modificarse'],
      ['Analizabilidad', 'AS-01, 03, 04, 14', 'Reglas de negocio localizables en un archivo: la máquina de estados ocupa 18 líneas; las transiciones no previstas se rechazan explícitamente'],
      ['Modificabilidad', 'AS-05, 06, 07, 15, 17, 18', 'Un canal nuevo (correo) y dos eventos nuevos (aprobación y rechazo) sin tocar el dominio ni el despachador'],
      ['Capacidad de prueba', 'AS-01, 08, 09, 10, 11, 17', 'Cobertura del backend 98,35 % y de `dominio/` 99,67 % (' + CI02 + '), por encima del 80 % de SYS-NFN-15; el dominio se prueba sin infraestructura'],
    ],
    [20, 24, 56],
  ),

  h2('2.10 Lo construido y verificado frente a lo diseñado pendiente'),
  tabla(
    ['Elemento', 'Principio', 'Estado en la matriz', 'Iteración', 'Integración en main'],
    [
      ['AS-15, AS-16', 'D', 'Evidenciado', 'IT-00', 'Integrado (PR #1)'],
      ['AS-02, 03, 05, 06, 09, 10, 11, 17, 18', 'S, O, L, D', 'Evidenciado', 'IT-01', E.it01.corto],
      ['AS-01, 04, 07, 08, 12, 14', 'S, O, L, I', 'Evidenciado', 'IT-02', E.it02.corto],
      ['AS-13', 'I', 'Discrepancia (nombres, DIS-12)', 'IT-01 · IT-02', E.IT02_INTEGRADA ? 'Integrado (PR #2 y #3)' : 'IT-01 integrado; IT-02 pendiente (PR #3)'],
      ['AS-19, AS-20', 'S, O', 'Diseño (MD-04)', 'IT-06', 'No aplica: fuera del alcance vigente'],
    ],
    [26, 12, 22, 14, 26],
  ),
  p(E.IT02_INTEGRADA ? 'Todos los elementos evidenciados están integrados en `main` con la batería en verde (DM-04, condiciones 5 y 6).' : 'Los elementos de IT-02 están construidos y su verificación está en verde en la CI de su rama, pero **no se presentan como parte del incremento** hasta que la revisión cruzada de DM-05 conste como favorable y se integren en `main`, conforme a las condiciones 5 y 6 de DM-04.'),

  h1('3. Conclusiones'),
  p('La matriz AS cumplió su propósito: se escribió antes que el código y el código se construyó conforme a ella. Diecisiete de los veinte elementos tienen evidencia ejecutable; los dos de diseño pertenecen a M6, fuera del alcance vigente, y el elemento en discrepancia lo es solo por nombres y está registrado.'),
  p('La aplicación de SOLID es verificable, no declarativa. La inversión de dependencias y las fronteras entre módulos las hace cumplir la CI con reglas cuya eficacia demuestra una prueba negativa. La sustitución de Liskov se demuestra con suites de contrato que corren sin cambios contra memoria y contra PostgreSQL real. El principio abierto/cerrado se comprobó dos veces durante la propia construcción: el canal de correo y los avisos de decisión se añadieron sin tocar el dominio ni el despachador.'),
  p('El efecto sobre la mantenibilidad de ISO/IEC 25010 se refleja en medidas concretas: cero accesos cruzados (MT-03), cobertura del núcleo de dominio del 99,75 % y extensiones que no modificaron código existente. La graduación de R-04 mantuvo baja la indirección en M1, M2 y M9 sin ceder en la dirección de las dependencias.'),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] IEEE Computer Society. _SWEBOK Guide Version 4.0a_. Knowledge Area 03, Software Design, §1.4 y §5.4. IEEE, 2025.'),
  p('[2] ISO/IEC 25010:2011. _Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models_. ISO, 2011.'),
  p('[3] Martin, R. C. _Clean Architecture: A Craftsman’s Guide to Software Structure and Design_. Prentice Hall, 2017.'),
  p('[4] Parnas, D. L. «On the criteria to be used in decomposing systems into modules». _Communications of the ACM_, 15(12), 1972.'),
  p('[5] Serie AbasteceNi: D1 Objeto de Estudio v2.1; D2 Levantamiento de Requerimientos v1.1; D3 Arquitectura de Software v1.1; D4 Metodología v1.1; D5 Modelado v1.1 (`docs/serie/`).'),
  p('[6] Repositorio AbasteceNi: `docs/evidencia/matriz-AS.md`, `docs/evidencia/iteraciones.md`, `docs/evidencia/discrepancias.md`, `docs/decisiones/registro-decisiones.md`. https://github.com/PedroMG2023/abasteceni'),

  h1('5. Anexos'),
  h2('Anexo A — Ejecuciones de integración continua citadas'),
  tabla(
    ['Ejecución', 'Rama y commit', 'Trabajos', 'Resultado'],
    [
      ['39020586251', '`it-00/entorno` · `7745854`', '9 (instalación, lint y tipos, pruebas, dependencias, prueba negativa, contrato, modelos, auditoría, CodeQL)', '9/9 en verde'],
      ['39023391840', '`it-01/linea-base` · `27d1d63`', '10 (los nueve anteriores y pruebas de sistema)', '10/10 en verde'],
      ['39033238576', '`it-02/afiliacion` · `aa72608`', '10', '10/10 en verde'],
      ['39042977012', '`it-02/bloqueo` · `adf161c`', '10', '10/10 en verde'],
      ['39339908565', '`it-02/recuperacion` · `dd13e02`', '10', '10/10 en verde'],
    ],
    [16, 28, 40, 16],
  ),
  h2('Anexo B — Tabla de evidencia de la matriz AS'),
  p('La tabla completa, con archivo y líneas, commit, prueba o regla y resultado de la CI de cada elemento, está en `docs/evidencia/matriz-AS.md`, sección «Tabla de evidencia». Este informe la cita y no la duplica, para que exista una sola fuente.'),
];

escribir(
  documento({
    titulo: 'SOLID aplicado al proyecto',
    numero: 1,
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: PRINCIPIOS SOLID APLICADOS AL PROYECTO',
      subtitulo: 'Matriz de aplicación AS-01 a AS-20 y su evidencia en el código',
      normas: [
        'SWEBOK Guide v4.0a — KA 03 Software Design (§1.4 y §5.4)',
        'ISO/IEC 25010:2011 — característica Mantenibilidad',
        'Serie AbasteceNi: D3 (PA-01 a PA-07, V-01, R-04), D4 (DM-04, DM-06, MT-03), D5 (MD-02, MD-03, MD-04)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 1 generado.'));
