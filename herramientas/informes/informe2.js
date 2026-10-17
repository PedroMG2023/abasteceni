const fs = require('fs');
const path = require('path');
const { p, h1, h2, h3, vinetas, tabla, figura, documento, escribir } = require('./comun');
const E = require('./estado');

const REPO = path.resolve(__dirname, '../..');
const EXP = path.join(REPO, 'docs/evidencia/pruebas/it-02/experiencia');
const conCompresion = JSON.parse(fs.readFileSync(path.join(EXP, 'lighthouse-resumen.json'), 'utf8'));
const sinCompresion = JSON.parse(fs.readFileSync(path.join(EXP, 'lighthouse-resumen-sin-compresion.json'), 'utf8'));
const s = (ms) => (ms / 1000).toFixed(2).replace('.', ',') + ' s';
const kb = (b) => Math.round(b / 1024).toLocaleString('es-NI') + ' KB';
const filas = (r) =>
  r.mediciones.map((m) => [m.perfil, String(m.medicion), s(m.fcpMs), s(m.lcpMs), s(m.speedIndexMs), kb(m.pesoBytes), String(m.rendimiento), String(m.accesibilidad), m.cumpleCarga && m.cumplePeso ? 'Cumple' : 'No cumple']);
const maximo = (r, perfil) => Math.max(...r.mediciones.filter((m) => m.perfil === perfil).map((m) => m.lcpMs));
const peso = (r) => r.mediciones[0].pesoBytes;

const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe evalúa la experiencia de usuario de la interfaz construida de AbasteceNi conforme a la serie ISO 9241. Contrasta, pantalla por pantalla, el flujo de afiliación de IT-02 con los siete principios de diálogo de ISO 9241-110:2020. Mide la vista inicial con Lighthouse y la accesibilidad de todas las vistas con axe-core, frente a los requisitos de rendimiento, adaptación, peso y accesibilidad del documento 2 (SYS-NFN-08, 09, 10 y 12). La presentación de los resultados sigue la estructura del formato común de la industria de ISO/IEC 25062:2006, con una salvedad: no se realizaron sesiones con participantes, y el informe lo declara en lugar de simularlo.'),
  h2('1.2 Alcance y estado de integración'),
  p('La interfaz evaluada es la capa 1 (ADR-06) de la rama `it-02/afiliacion`. Su CI de cierre (ejecución 39033238576) terminó con 10 de 10 trabajos en verde. Las mediciones de este informe se tomaron después, sobre la rama `it-02/informes`, en el entorno de sistema de Docker Compose. ' + E.resumen),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Consecuencia para la experiencia de usuario'],
    [
      ['RO-06: operación territorial sobre redes celulares degradadas y teléfonos de gama media; alfabetización digital baja en parte del público', 'D1 §2.12', 'Diseño mobile-first desde 320 px, peso reducido, ayuda en cada campo y mensajes que dicen qué corregir'],
      ['Escenarios A y B del concepto operacional', 'D2 §2.6', 'Usuarios reales del contexto de uso: farmacia de El Viejo, finquero de Estelí'],
      ['SYS-NFN-08: carga < 2,5 s en 4G/LTE y < 5,0 s en 3G, en tres mediciones consecutivas', 'D2 §3', 'Medición con Lighthouse en perfiles 4G y 3G'],
      ['SYS-NFN-09: desde 320 px, sin desplazamiento horizontal', 'D2 §3', 'Prueba de sistema a 320 px'],
      ['SYS-NFN-10: activos comprimidos y minificados, ≤ 2,5 MB en la vista inicial', 'D2 §3', 'Peso total medido por Lighthouse'],
      ['SYS-NFN-11: ayuda contextual en los formularios críticos y tutoriales en video', 'D2 §3', 'Ayuda en cada campo del registro; los tutoriales quedan pendientes'],
      ['SYS-NFN-12: operación completa por teclado (WCAG 2.1 criterios 2.1.1 y 2.1.2), prioridad «Podría»', 'D2 §3', 'Pruebas automatizadas de teclado y análisis con axe-core'],
      ['ADR-06: interfaz cliente desacoplada', 'D3 §2.7.2', 'React con Vite; el cliente HTTP se genera desde el contrato'],
    ],
    [42, 12, 46],
  ),
  h2('1.4 Normas aplicables'),
  vinetas([
    '**ISO 9241-11:2018.** Define la usabilidad como el grado en que usuarios especificados logran objetivos especificados con eficacia, eficiencia y satisfacción en un contexto de uso especificado. Organiza el §2.1.',
    '**ISO 9241-110:2020.** Siete principios de interacción: adecuación a las tareas del usuario, autodescripción, conformidad con las expectativas del usuario, facilidad de aprendizaje, controlabilidad, robustez frente a errores de uso y compromiso del usuario. Organiza el §2.3.',
    '**ISO 9241-210:2019.** Diseño centrado en el ser humano: comprender el contexto de uso, especificar requisitos, producir soluciones de diseño y evaluarlas. Organiza el §2.2.',
    '**WCAG 2.1 nivel AA** (W3C), verificada con axe-core 4.11 a través de `@axe-core/playwright` 4.14.0. Organiza el §2.5.',
    '**ISO/IEC 25062:2006.** Formato común de la industria (CIF) para informes de pruebas de usabilidad. Organiza el §2.6.',
  ]),

  h1('2. Desarrollo'),
  h2('2.1 Contexto de uso (ISO 9241-11)'),
  tabla(
    ['Componente', 'Descripción en AbasteceNi'],
    [
      ['Usuarios', 'Compradores minoristas (farmacias, ferreterías, pulperías), proveedores mayoristas, productores agrícolas y el Administrador de la plataforma (D2 §2.2). Parte del público tiene alfabetización digital baja (RO-06).'],
      ['Objetivos evaluados', 'Afiliarse: registrar la cuenta comercial con su documento legal y su consentimiento (SYS-FN-01, 02 y 36). Validar solicitudes como Administrador (SYS-FN-03). Iniciar sesión y llegar al panel del propio rol (SYS-FN-04).'],
      ['Tareas', 'Completar el formulario de nueve campos, adjuntar el documento, aceptar el consentimiento y enviar; corregir los errores señalados; revisar y decidir una solicitud; iniciar y cerrar sesión.'],
      ['Equipo', 'Teléfono de gama media con navegador móvil. Se evaluó a 360 × 740 y a 320 px de ancho, con la CPU ralentizada ×4 en Lighthouse.'],
      ['Entorno físico y técnico', 'Comercios de Chinandega, El Viejo y Estelí con redes celulares 3G y 4G degradadas (D2 §2.6; RO-06).'],
    ],
    [22, 78],
  ),
  h2('2.2 Proceso de diseño centrado en el ser humano (ISO 9241-210)'),
  tabla(
    ['Actividad de ISO 9241-210', 'Cómo se realizó', 'Evidencia'],
    [
      ['Comprender y especificar el contexto de uso', 'Observación contextual y entrevistas en comercios de Chinandega y El Viejo, y escenarios de uso', 'D2 §2.4.1, §2.4.2 y §2.6'],
      ['Especificar los requisitos de usuario', 'Requisitos SYS-NFN-08 a 12 con umbrales medibles (Planguage), más las reglas aprobadas de textos y paneles', 'D2 §3; DIS-26, DIS-28 y DIS-31'],
      ['Producir soluciones de diseño', 'Formulario armado por composición de campos con ayuda contextual (AS-07), paneles por rol y mensajes en un catálogo único', '`apps/web/src/componentes/campos-registro.ts`; `apps/backend/src/aplicacion/transversal/mensajes.ts`'],
      ['Evaluar el diseño frente a los requisitos', 'Inspección por principios (§2.3), mediciones automatizadas (§2.4 y §2.5) y pruebas de sistema. La evaluación con usuarios está pendiente (§2.6).', '`e2e/pruebas/`; `docs/evidencia/pruebas/it-02/experiencia/`'],
    ],
    [26, 46, 28],
  ),

  h2('2.3 Contraste con los principios de ISO 9241-110, pantalla por pantalla'),
  p('Las capturas de las figuras 1 a 3 se tomaron con una prueba de sistema (`e2e/pruebas/capturas.spec.ts`) a 360 × 740 píxeles, sobre la aplicación real levantada con Docker Compose.'),
  ...figura(path.join(process.env.FIGURAS ?? __dirname, 'fig-ux-1.png'), 1303, 1100, 'Figura 1. Pantallas 1 a 3: vista inicial, formulario de registro vacío y formulario enviado sin datos.'),
  ...figura(path.join(process.env.FIGURAS ?? __dirname, 'fig-ux-2.png'), 1478, 1100, 'Figura 2. Pantallas 4 a 6: RUC escrito con guiones, registro confirmado e inicio de sesión de una cuenta pendiente.'),
  ...figura(path.join(process.env.FIGURAS ?? __dirname, 'fig-ux-3.png'), 1485, 1100, 'Figura 3. Pantallas 7 a 9: panel del Administrador con el rechazo en curso, solicitud aprobada y panel del Comprador.'),
  h3('Pantalla 1 — Vista inicial'),
  tabla(
    ['Principio', 'Observación', 'Valoración'],
    [
      ['Autodescripción', 'Nombre de la plataforma, su propósito en una línea y el estado del servicio visible', 'Cumple'],
      ['Conformidad con las expectativas', 'Navegación fija con tres destinos en lenguaje del usuario: Inicio, Registrar cuenta, Iniciar sesión', 'Cumple'],
      ['Compromiso del usuario', 'La vista no explica todavía el valor de consolidar la demanda (O-StRS-02); depende de funciones de M3, fuera del alcance', 'Mejora pendiente'],
    ],
    [24, 60, 16],
  ),
  h3('Pantallas 2 a 4 — Formulario de registro'),
  tabla(
    ['Principio', 'Observación', 'Valoración'],
    [
      ['Adecuación a la tarea', 'Solo se piden los datos de SYS-FN-01 y los aprobados en DIS-16, 17 y 19; el documento y el consentimiento van en el mismo envío (DIS-29), sin pasos extra', 'Cumple'],
      ['Autodescripción', 'Cada campo dice qué se espera: el RUC indica su formato y el teléfono, el código de país y su uso para los avisos por WhatsApp (SYS-NFN-11)', 'Cumple'],
      ['Robustez frente a errores de uso', 'Los errores se señalan en el propio campo (`aria-invalid`, borde rojo y texto), dicen cómo corregir y no borran lo escrito. El servidor repite la validación y su respuesta se coloca en el mismo campo (PA-05).', 'Cumple'],
      ['Robustez frente a errores de uso', 'Un RUC escrito con guiones se rechaza (pantalla 4). La regla aprobada (DIS-21) exige «sin guiones», pero el sistema podría tolerarlos y normalizarlos', 'Mejora propuesta'],
      ['Robustez y autodescripción', 'Hallazgo: con errores, el formulario no mostraba un resumen arriba ni llevaba el foco al primer campo inválido, y en un teléfono había que desplazarse para encontrarlos. **Corregido durante la evaluación** (commit `5273441`, ' + E.bloqueo + '): aviso «Revise los datos marcados.» arriba y foco en el primer campo con error, que anuncia su mensaje (WCAG 3.3.1). La pantalla 3 de la figura 1 ya muestra el aviso; la anterior se conserva como `03-registro-errores-sin-aviso.png`', 'Corregido'],
      ['Conformidad con las expectativas', 'El selector de archivo muestra «Choose File»: es el control nativo del navegador de pruebas, configurado en inglés. En un navegador en español aparece en español', 'Observación'],
      ['Controlabilidad', 'El usuario decide el orden, puede volver a cualquier campo y nada se envía hasta que lo pide', 'Cumple'],
    ],
    [24, 60, 16],
  ),
  h3('Pantallas 5 y 6 — Confirmación e inicio de sesión de una cuenta pendiente'),
  tabla(
    ['Principio', 'Observación', 'Valoración'],
    [
      ['Autodescripción', 'La confirmación dice en qué estado quedó la cuenta («Pendiente de validación») y qué sigue: el aviso al validarse (DIS-30)', 'Cumple'],
      ['Conformidad con las expectativas', 'Una cuenta pendiente que intenta entrar recibe «Su cuenta está pendiente de validación.» (DIS-25), no un error genérico', 'Cumple'],
      ['Robustez frente a errores de uso', 'Una contraseña incorrecta recibe un mensaje que no revela si el correo existe, como exige la seguridad, y no bloquea al usuario', 'Cumple'],
    ],
    [24, 60, 16],
  ),
  h3('Pantallas 7 a 9 — Paneles por rol'),
  tabla(
    ['Principio', 'Observación', 'Valoración'],
    [
      ['Adecuación a la tarea', 'El panel del Administrador muestra solo las solicitudes pendientes, con los datos para decidir y el acceso al documento (PM-01, actividad 4)', 'Cumple'],
      ['Controlabilidad', 'Rechazar pide el motivo antes de confirmar; aprobar actúa de inmediato y lo confirma con un mensaje', 'Cumple'],
      ['Robustez frente a errores de uso', 'Aprobar no pide confirmación y no puede deshacerse: la máquina de estados no admite una segunda decisión (AS-01). Una confirmación evitaría aprobaciones por error', 'Mejora propuesta'],
      ['Facilidad de aprendizaje', 'Cada rol ve un panel con su nombre (CT-SEG-04); los paneles de las cuentas comerciales anuncian que sus funciones llegan después (DIS-31)', 'Cumple'],
    ],
    [24, 60, 16],
  ),

  h2('2.4 Rendimiento, adaptación y peso de la vista inicial (SYS-NFN-08, 09 y 10)'),
  p('Se midió la vista inicial con Lighthouse 13.5.0 (`herramientas/sistema/medir-experiencia.mjs`): perfil móvil, simulación de red y CPU ralentizada ×4. Hubo tres mediciones consecutivas por perfil, como pide el criterio de SYS-NFN-08. El perfil 4G usa la red «4G lento» de Lighthouse (150 ms de latencia y 1,6 Mb/s), más exigente que los 100 ms del requisito. El perfil 3G usa «3G regular» (300 ms y 700 kb/s). Como instante de «carga completada» se toma el despliegue del elemento de contenido más grande (LCP), la métrica de carga que percibe el usuario.'),
  p('La primera medición destapó una brecha con SYS-NFN-10: los activos estaban minificados pero el servidor del entorno de sistema no los comprimía. Se activó gzip en `herramientas/sistema/nginx.conf` (en producción comprime la red de distribución de contenido, ADR-06) y se repitió la medición. Las dos series se conservan como evidencia.'),
  tabla(
    ['Perfil', 'Medición', 'FCP', 'LCP (carga)', 'Speed Index', 'Peso', 'Rendimiento', 'Accesibilidad', 'Resultado'],
    filas(conCompresion),
    [9, 9, 10, 12, 12, 11, 12, 13, 12],
  ),
  p(`**Con compresión** (\`docs/evidencia/pruebas/it-02/experiencia/lighthouse-resumen.json\`): la carga más lenta fue de ${s(maximo(conCompresion, '4G'))} en 4G (umbral 2,5 s) y de ${s(maximo(conCompresion, '3G'))} en 3G (umbral 5,0 s), y el peso de la vista inicial, de ${kb(peso(conCompresion))} (umbral 2,5 MB). **Sin compresión** (\`lighthouse-resumen-sin-compresion.json\`) la carga en 3G llegaba a ${s(maximo(sinCompresion, '3G'))}, apenas por debajo del umbral, con un peso de ${kb(peso(sinCompresion))}.`, {}),
  p('**SYS-NFN-09** lo verifica `e2e/pruebas/registro.spec.ts` («SYS-NFN-09 · el formulario se opera a 320 px sin desplazamiento horizontal»): el ancho del documento no supera el de la ventana y todos los controles caben a lo ancho.'),

  h2('2.5 Accesibilidad (WCAG 2.1 AA; SYS-NFN-12)'),
  p('`e2e/pruebas/accesibilidad.spec.ts` analiza con axe-core cada vista con las reglas WCAG 2.0 y 2.1 de niveles A y AA, y comprueba la operación por teclado.'),
  tabla(
    ['Vista analizada', 'Infracciones WCAG A y AA', 'Reglas superadas'],
    fs
      .readFileSync(path.join(EXP, 'axe-resumen.txt'), 'utf8')
      .trim()
      .split('\n')
      .map((linea) => {
        const m = linea.match(/axe · (.+): (\d+) infracciones, (\d+) reglas superadas/);
        return [m[1].replace(/^./, (c) => c.toUpperCase()), m[2], m[3]];
      }),
    [50, 25, 25],
  ),
  vinetas([
    '**Criterio 2.1.1 (teclado):** el registro se recorre con Tab por los nueve campos, el archivo, el consentimiento y el botón de envío; el inicio de sesión se completa solo con teclado y Enter.',
    '**Criterio 2.1.2 (sin trampa de foco):** Shift+Tab devuelve el foco desde el botón de envío a la casilla de consentimiento.',
    '**Foco visible:** contorno de 3 px de color ámbar en todos los controles (`apps/web/src/estilos.css`).',
    '**Puntuación de accesibilidad de Lighthouse:** 100 en las seis mediciones.',
  ]),
  p('El análisis automático no cubre todos los criterios de WCAG. La comprensión de los textos por personas con alfabetización digital baja (RO-06) requiere evaluación con usuarios (§2.6).'),

  h2('2.6 Informe de usabilidad en formato CIF (ISO/IEC 25062)'),
  tabla(
    ['Sección del CIF', 'Contenido para AbasteceNi'],
    [
      ['Resumen ejecutivo', 'La interfaz de afiliación cumple los umbrales medibles de rendimiento, peso, adaptación y accesibilidad automatizada (SYS-NFN-08 a 10 y 12). La inspección por principios de ISO 9241-110 identificó cuatro mejoras: una corregida durante la evaluación (el aviso de errores del formulario), una pendiente que depende de M3 y dos propuestas que requieren modificar reglas aprobadas. No se han realizado sesiones con participantes.'],
      ['Introducción: producto', 'Capa 1 de AbasteceNi: registro de cuenta comercial, inicio de sesión y paneles por rol (IT-01 e IT-02).'],
      ['Introducción: objetivos', 'Verificar los umbrales de D2 y la conformidad con ISO 9241-110 del flujo de afiliación (PM-01).'],
      ['Método: participantes', '**No realizado.** No hubo participantes del público objetivo en esta fase. Diseño previsto: cinco comerciantes de Chinandega y El Viejo, al menos dos con alfabetización digital baja (RO-06), reclutados por U-03.'],
      ['Método: tareas', 'T1: registrar la cuenta con su documento. T2: corregir un error señalado. T3: iniciar sesión tras la aprobación. T4 (Administrador): revisar y decidir una solicitud.'],
      ['Método: entorno', 'Teléfono de gama media sobre red celular de la zona; en esta evaluación se simuló con Lighthouse (CPU ×4, 4G y 3G) y Playwright a 360 y 320 px.'],
      ['Métricas previstas', 'Eficacia: tasa de tareas completadas sin ayuda. Eficiencia: tiempo por tarea y número de errores. Satisfacción: cuestionario SUS.'],
      ['Resultados obtenidos', 'Los de los §2.3 a §2.5: inspección por principios, rendimiento, peso, adaptación y accesibilidad automatizada.'],
      ['Resultados pendientes', 'Eficacia, eficiencia y satisfacción medidas con participantes.'],
    ],
    [26, 74],
  ),

  h2('2.7 Lo construido y verificado frente a lo pendiente'),
  tabla(
    ['Elemento', 'Estado', 'Evidencia'],
    [
      ['SYS-NFN-08: carga en 4G y 3G', 'Verificado en el entorno de sistema', 'Tres mediciones por perfil, todas bajo el umbral (§2.4)'],
      ['SYS-NFN-09: 320 px sin desplazamiento horizontal', 'Verificado', 'Prueba de sistema a 320 px'],
      ['SYS-NFN-10: peso ≤ 2,5 MB, comprimido y minificado', 'Verificado; la compresión se corrigió durante la medición', 'Lighthouse; `nginx.conf` con gzip'],
      ['SYS-NFN-11: ayuda contextual en el registro', 'Construida', 'Ayuda en los campos críticos del registro'],
      ['SYS-NFN-11: tutoriales en video de hasta 3 minutos', 'Pendiente', 'No construidos en el alcance vigente'],
      ['SYS-NFN-12: teclado y WCAG 2.1 AA (automatizado)', 'Verificado', '0 infracciones en cinco vistas; pruebas de teclado'],
      ['Resumen de errores al inicio del formulario y foco en el primer error', 'Corregida (`5273441`)', '§2.3, pantalla 3; `PaginaRegistro.test.tsx`'],
      ['RUC con guiones normalizado y confirmación al aprobar', 'Mejoras propuestas', '§2.3; exigen modificar DIS-21 y DIS-26'],
      ['Evaluación con participantes (ISO/IEC 25062)', 'Pendiente', 'Diseño en el §2.6'],
      ['Integración en `main`', E.BLOQUEO_INTEGRADO ? 'IT-00, IT-01, IT-02 (tramo A) y la corrección del formulario integradas' : E.IT02_INTEGRADA ? 'IT-00, IT-01 e IT-02 integradas' : 'IT-00 e IT-01 integradas; IT-02 pendiente de la revisión cruzada', E.BLOQUEO_INTEGRADO ? 'PR #1, #2, #3 y #6' : 'PR #1, #2 y #3'],
    ],
    [40, 26, 34],
  ),

  h1('3. Conclusiones'),
  p(`La interfaz de afiliación cumple los umbrales cuantitativos de la serie en el contexto de uso más exigente que la serie declara: teléfono de gama media y red 3G. Con la compresión activada, la carga más lenta fue de ${s(maximo(conCompresion, '3G'))} en 3G y de ${s(maximo(conCompresion, '4G'))} en 4G, con un peso de ${kb(peso(conCompresion))}, una décima parte del presupuesto de 2,5 MB. El análisis con axe-core no encontró infracciones WCAG 2.1 A ni AA, y la operación por teclado se verificó de forma automática.`),
  p('La medición cumplió también su función de control: reveló que los activos no se servían comprimidos, en contra de SYS-NFN-10, y la corrección redujo la carga en 3G de forma apreciable. La inspección por principios de ISO 9241-110 identificó mejoras concretas: el resumen de errores, la tolerancia a los guiones del RUC y la confirmación al aprobar. La primera se corrigió durante la propia evaluación. Las dos últimas requieren modificar reglas aprobadas por el equipo y no se implementan sin esa decisión.'),
  p('La evaluación con participantes del público objetivo sigue pendiente y es la que puede confirmar o refutar la adecuación de los textos para personas con alfabetización digital baja (RO-06). El formato CIF de ISO/IEC 25062 queda preparado para registrarla.'),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] ISO 9241-11:2018. _Ergonomics of human-system interaction — Part 11: Usability: Definitions and concepts_. ISO, 2018.'),
  p('[2] ISO 9241-110:2020. _Ergonomics of human-system interaction — Part 110: Interaction principles_. ISO, 2020.'),
  p('[3] ISO 9241-210:2019. _Ergonomics of human-system interaction — Part 210: Human-centred design for interactive systems_. ISO, 2019.'),
  p('[4] ISO/IEC 25062:2006. _Software engineering — Software product Quality Requirements and Evaluation (SQuaRE) — Common Industry Format (CIF) for usability test reports_. ISO, 2006.'),
  p('[5] W3C. _Web Content Accessibility Guidelines (WCAG) 2.1_. Recomendación del W3C, 2018.'),
  p('[6] Google. _Lighthouse_ 13.5.0, documentación de métricas (FCP, LCP, Speed Index) y de simulación de red.'),
  p('[7] Deque Systems. _axe-core_ y _@axe-core/playwright_ 4.14.0.'),
  p('[8] Brooke, J. «SUS: A quick and dirty usability scale». En _Usability Evaluation in Industry_. Taylor & Francis, 1996.'),
  p('[9] Serie AbasteceNi: D1 v2.1 (RO-06), D2 v1.1 (SYS-NFN-08 a 12; §2.6), D3 v1.1 (ADR-06), D4 v1.1 (§2.15) (`docs/serie/`).'),

  h1('5. Anexos'),
  h2('Anexo A — Mediciones sin compresión'),
  tabla(
    ['Perfil', 'Medición', 'FCP', 'LCP (carga)', 'Speed Index', 'Peso', 'Rendimiento', 'Accesibilidad', 'Resultado'],
    filas(sinCompresion),
    [9, 9, 10, 12, 12, 11, 12, 13, 12],
  ),
  h2('Anexo B — Reproducción de las mediciones'),
  p('Desde la raíz del repositorio, con Docker en marcha: `MEDIR_EXPERIENCIA=1 bash herramientas/sistema/ejecutar.sh`. El guion levanta el entorno de sistema con secretos de un solo uso, ejecuta los 21 escenarios de Playwright (incluidos los de accesibilidad y las capturas) y las seis mediciones de Lighthouse, y deja los resultados en `docs/evidencia/pruebas/experiencia/`. Las series citadas en este informe están versionadas en `docs/evidencia/pruebas/it-02/experiencia/`.'),
];

escribir(
  documento({
    titulo: 'ISO 9241: experiencia de usuario',
    numero: 2,
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: EXPERIENCIA DE USUARIO CONFORME A ISO 9241',
      subtitulo: 'Flujo de afiliación, principios de diálogo, rendimiento y accesibilidad',
      normas: [
        'ISO 9241-11:2018, ISO 9241-110:2020 e ISO 9241-210:2019 — usabilidad e interacción',
        'WCAG 2.1 nivel AA — accesibilidad · ISO/IEC 25062:2006 — formato CIF',
        'Serie AbasteceNi: D1 (RO-06), D2 (SYS-NFN-08 a 12), D3 (ADR-06)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 2 generado.'));
