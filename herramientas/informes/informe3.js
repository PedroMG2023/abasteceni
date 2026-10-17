const { p, h1, h2, vinetas, tabla, documento, escribir } = require('./comun');
const E = require('./estado');

const B = 'apps/backend/src';
const contenido = [
  h1('1. Introducción'),
  h2('1.1 Propósito del documento'),
  p('Este informe muestra cómo el código construido de AbasteceNi realiza los controles de seguridad de ISO/IEC 27001:2022 (Anexo A), desarrollados en ISO/IEC 27002:2022, con OWASP ASVS 4.0.3 como lista de verificación técnica y la Ley No. 787 de Protección de Datos Personales de Nicaragua como marco legal. Para cada control se indica la práctica en el repositorio, el archivo y la línea donde se realiza, la prueba que la verifica y su estado. Los resultados del análisis estático (CodeQL) y de la auditoría de dependencias (`npm audit`) se informan con sus cifras reales, incluido el único hallazgo de gravedad alta y su tratamiento.'),
  h2('1.2 Alcance y estado de integración'),
  p('El alcance es el código de IT-00, IT-01 e IT-02 (tramo A): registro de cuentas, carga del registro legal, inicio de sesión sin estado, validación administrativa, bitácora inmutable y consentimiento. ' + E.resumen + ' SYS-FN-07 (bloqueo por intentos, tramo B) está ' + E.bloqueo + '. Los requisitos de seguridad restantes de los tramos B y C (SYS-FN-05, 06 y 08) y los que dependen de la infraestructura de producción (SYS-NFN-01 y 02) se declaran como pendientes.'),
  h2('1.3 Insumos heredados de la serie'),
  tabla(
    ['Insumo', 'Origen', 'Consecuencia'],
    [
      ['V-03: matriz de clasificación de datos y de control de acceso por rol', 'D3 §2.9.3', 'Credenciales «Secreto»; identificación comercial «Confidencial — dato personal»; bitácora «Crítico — inmutable»'],
      ['PA-05: la seguridad se aplica en la frontera y se verifica en el dominio', 'D3 §2.7.4', 'Validación declarativa en la capa 2 e invariantes en el dominio'],
      ['PA-06 y ADR-05: auditoría de solo adición, verificable en el gestor', 'D3', 'Privilegios revocados a nivel de PostgreSQL'],
      ['ADR-04: autenticación sin estado', 'D3 §2.7.2', 'Credencial de acceso firmada de vida corta y credencial de renovación revocable'],
      ['ADR-08: límite de peticiones en dos niveles', 'Registro de decisiones', 'Guard de la capa 2 con el contador en PostgreSQL'],
      ['RO-04: segregación de funciones', 'D1 §2.12', 'Rol Administrador sin registro público (DIS-24); protección de `main` y revisión cruzada (DM-05)'],
      ['SYS-FN-04 a 08, SYS-FN-35 y 36, SYS-NFN-01 a 03', 'D2 §3', 'Requisitos de seguridad, auditoría y privacidad'],
    ],
    [42, 18, 40],
  ),
  h2('1.4 Normas aplicables'),
  vinetas([
    '**ISO/IEC 27001:2022, Anexo A**, y **ISO/IEC 27002:2022**: controles 5.34, 8.4, 8.5, 8.8, 8.9, 8.15, 8.24 a 8.29, 8.31 y 8.32. La tabla de CLAUDE.md §9 asocia cada uno a una práctica del repositorio.',
    '**OWASP ASVS 4.0.3**: lista de verificación técnica de los capítulos V2 (autenticación), V3 (sesiones), V4 (acceso), V5 (validación), V7 (registros), V12 (archivos) y V14 (configuración).',
    '**Ley No. 787 de Protección de Datos Personales** (Nicaragua, 2012): consentimiento informado y tratamiento lícito de los datos personales.',
  ]),

  h1('2. Desarrollo'),
  h2('2.1 Controles de ISO/IEC 27002:2022 y su realización'),
  tabla(
    ['Control', 'Práctica en el repositorio', 'Evidencia', 'Estado'],
    [
      ['5.34 Privacidad y protección de datos personales', 'Consentimiento obligatorio con texto aprobado y asiento de bitácora (SYS-FN-36, DIS-28); datos de V-03 fuera de las trazas', '§2.5; `afiliacion.spec.ts`', 'Construido; cifrado en reposo y supresión pendientes'],
      ['8.4 Acceso al código fuente', '`main` protegida: PR obligatorio, sin push directo ni forzado, también para administradores; 9 trabajos de CI obligatorios', 'Configuración de GitHub (DIS-11)', 'Activo'],
      ['8.5 Autenticación segura', 'argon2id, credencial de acceso de 15 minutos, renovación rotada y revocable (ADR-04, DIS-06)', '§2.2', 'Construido, incluido el bloqueo por intentos (SYS-FN-07)'],
      ['8.8 Gestión de vulnerabilidades técnicas', 'Archivo de bloqueo, `npm audit --audit-level=high` en cada cambio, scripts de instalación de terceros denegados', '§2.8', 'Activo'],
      ['8.9 Gestión de la configuración', 'Secretos solo en variables de entorno; `.env.example` sin valores; el arranque falla si falta un secreto', '§2.9', 'Activo'],
      ['8.15 Registro de eventos', 'Bitácora inmutable en M9 con usuario, acción, marca temporal e IP (SYS-FN-35, ADR-05)', '§2.6; informe 4b', 'Construido; retención de 90 días y 7 años pendiente'],
      ['8.24 Uso de criptografía', 'argon2id, HMAC-SHA256 para la credencial de acceso, SHA-256 para la huella de la renovación, 256 bits aleatorios', '§2.2', 'Construido; TLS 1.3 y AES-256 en reposo dependen de producción (ADR-09)'],
      ['8.25 Ciclo de vida de desarrollo seguro', 'Definición de Terminado (DM-04), revisión cruzada (DM-05), CI con verificación de dependencias (DM-06)', 'Informe 6', 'Activo'],
      ['8.26 Requisitos de seguridad de la aplicación', 'SYS-FN-04 a 08 y SYS-NFN-01 a 03 con criterio de aceptación verificable', '§2.11', 'SYS-FN-04, SYS-FN-07 y SYS-NFN-03 verificados; resto pendiente'],
      ['8.27 Principios de arquitectura segura', 'PA-05 (frontera y dominio) y PA-06 (solo adición), con reglas de dependencia que la CI hace cumplir', '§2.3 y §2.4', 'Activo'],
      ['8.28 Codificación segura', 'Consultas parametrizadas, validación declarativa y de dominio, tipo de archivo por contenido', '§2.4', 'Activo'],
      ['8.29 Pruebas de seguridad', 'Pruebas 401, 403 y 429 (AS-03), de la bitácora, de las credenciales y de la carga de archivos; CodeQL `security-extended`', '§2.7 y §2.10', 'Activo'],
      ['8.31 Separación de entornos', 'Base de prueba efímera con Testcontainers; entorno de sistema con secretos de un solo uso que se destruye al terminar', 'Informes 4a y 4b', 'Activo'],
      ['8.32 Gestión de cambios', 'Ramas `it-0n/*`, commits convencionales con referencias, solicitudes de integración revisadas', 'Informe 6', 'Activo'],
    ],
    [22, 40, 18, 20],
  ),

  h2('2.2 Autenticación y gestión de sesiones (8.5, 8.24; ASVS V2 y V3)'),
  vinetas([
    `**Almacenamiento de la contraseña** (ASVS V2.4.1): argon2id con los parámetros por defecto de la biblioteca (64 MiB, 3 iteraciones, paralelismo 4), por encima del mínimo que recomienda OWASP (\`${B}/infraestructura/seguridad/derivacion-argon2.ts\`). La contraseña nunca se guarda, se registra en trazas ni se devuelve por la API (V-03).`,
    '**Longitud** (ASVS V2.1.1 y V2.1.2): de 12 a 128 caracteres (DIS-22), validada en la frontera y en el dominio.',
    `**Sin enumeración de cuentas:** un correo inexistente y una contraseña incorrecta reciben el mismo mensaje, y en ambos casos se verifica una huella argon2, lo que iguala el tiempo de respuesta (\`${B}/dominio/m2-seguridad/servicio-seguridad.ts:102-103\`). Lo comprueba \`api-cuentas-sesiones.spec.ts\`.`,
    `**Credencial de acceso** (ADR-04; ASVS V3.5.3): JWT HS256 de 15 minutos con emisor y audiencia fijos. La verificación fija el algoritmo (\`${B}/infraestructura/seguridad/firma-jwt.ts:26\`), y el secreto debe tener al menos 32 bytes. \`test/unitarias/infraestructura/seguridad.spec.ts\` rechaza credenciales alteradas, vencidas, de otro secreto, con algoritmo \`none\` (línea 33) o con un rol ajeno al catálogo.`,
    `**Credencial de renovación:** 256 bits aleatorios. El servidor solo guarda su huella SHA-256 (\`servicio-seguridad.ts:197\`), la rota en cada uso y revoca la anterior (\`:143\`); al cerrar sesión, la revoca. Viaja en una cookie con los atributos de ASVS V3.4.1, V3.4.2, V3.4.3 y V3.4.5: \`Secure\`, \`HttpOnly\`, \`SameSite=Strict\` y \`Path=/api/v1/sesiones\` (\`${B}/aplicacion/m2-seguridad/sesiones.controller.ts:63\`).`,
    '**Habilitación:** solo inician sesión las cuentas «Activa» y el Administrador (DIS-25). Una cuenta rechazada después de iniciar sesión ya no puede renovar.',
    `**Bloqueo por intentos fallidos** (SYS-FN-07; ASVS V2.2.1; DIS-34): al quinto fallo consecutivo la cuenta se bloquea 15 minutos (\`${B}/dominio/m2-seguridad/servicio-seguridad.ts\`). El contador se incrementa de forma atómica en el esquema de M2; durante el bloqueo no se evalúa la contraseña; un inicio exitoso reinicia el contador. El trabajador avisa al correo registrado. Lo verifican \`servicio-seguridad.spec.ts\` (5 casos), \`test/integracion/bloqueo.spec.ts\` y \`e2e/pruebas/sesion.spec.ts\`. Estado: ${E.bloqueo}.`,
    '**Pendiente:** límite de dos dispositivos (SYS-FN-08), segundo factor TOTP (SYS-FN-06) y recuperación por enlace temporal (SYS-FN-05), del tramo C y del resto del tramo B.',
  ]),

  h2('2.3 Control de acceso (ASVS V4; PA-05)'),
  vinetas([
    `**Denegación por defecto** (ASVS V4.1.5): el guard de autenticación es global; una ruta es pública solo si lo declara con \`@Publico()\` (\`${B}/aplicacion/transversal/autenticacion.guard.ts:20\`). Lo son el registro, el inicio de sesión, la renovación y la sonda de vitalidad.`,
    '**Control por rol en la frontera** (ASVS V4.1.1): `@Roles(\'Administrador\')` en el listado, la validación y la descarga del registro legal, conforme a la matriz de V-03 («Validación de cuentas ajenas: solo el Administrador»).',
    '**Verificación:** 401 sin credencial o con credencial alterada; 403 con rol Proveedor o Productor en `GET /cuentas`, `PATCH /cuentas/{id}` y `GET /cuentas/{id}/registro-legal` (`api-cuentas-sesiones.spec.ts`, `afiliacion.spec.ts`).',
    '**Segregación de funciones** (RO-04): no existe registro público de administradores; el primero se siembra desde variables de entorno (DIS-24).',
  ]),

  h2('2.4 Validación de entradas y codificación segura (8.28; ASVS V5 y V12)'),
  vinetas([
    `**Validación positiva en la frontera** (ASVS V5.1.3): DTO con class-validator, \`whitelist\` y \`forbidNonWhitelisted\` (\`${B}/aplicacion/transversal/validacion.ts:27\`). Una propiedad no declarada, como \`rol\` en el registro, se rechaza con 400.`,
    '**Verificación en el dominio** (PA-05): `CuentaComercial.comprobarDatos` y las políticas de M2 repiten las invariantes de negocio (RUC, teléfono E.164, correo, longitudes), de modo que una capa de API que evolucione no deja huecos.',
    `**Consultas parametrizadas** (ASVS V5.3.4): todo el acceso a datos usa el constructor de consultas de Drizzle, que parametriza los valores; no hay SQL concatenado con datos del usuario. El aprovisionamiento de roles, cuyas sentencias DDL no admiten parámetros, pasa las claves como parámetros de \`set_config\` y las cita en el servidor con \`format(%L)\` (\`apps/backend/scripts/provisionar.ts:15\`).`,
    `**Carga de archivos** (ASVS V12.1.1, V12.2.1, V12.3.1 y V12.4.1): tope de 5 MB aplicado por multer en memoria (\`${B}/aplicacion/m1-usuarios/cuentas.controller.ts:57\`). El tipo se decide por los bytes iniciales, no por la extensión ni por el tipo declarado (\`${B}/dominio/m1-usuarios/registro-legal.ts:21\`). El nombre del archivo del usuario no se usa: la clave es un UUID validado, lo que impide el recorrido de rutas (\`${B}/infraestructura/almacen-documentos/almacen-archivos.ts:6\`). Los archivos se crean con permisos 0600 fuera de la raíz web.`,
    '**Verificación:** un archivo con extensión `.pdf` y contenido ejecutable se rechaza; uno de 8 MB recibe 413; las claves `../../etc/passwd` y `x` se rechazan (`test/contrato/almacen-documentos.spec.ts`).',
  ]),

  h2('2.5 Protección de datos personales (5.34; Ley No. 787; V-03)'),
  vinetas([
    '**Consentimiento informado** (SYS-FN-36): la declaración aprobada en DIS-28 informa la finalidad, los derechos de acceso, rectificación, cancelación y oposición, y la transferencia internacional a Microsoft Azure en México que exige ADR-09. Sin aceptarla no se registra la cuenta. La aceptación queda en la cuenta y como asiento de bitácora con su marca temporal y la versión del texto.',
    `**Datos personales fuera de las trazas** (V-03; ASVS V7.1.1 y V7.1.2): el interceptor registra el método, la **ruta declarada** (no la URL concreta), el estado y la duración (\`${B}/aplicacion/transversal/registro-peticiones.interceptor.ts:17\`). El filtro de errores registra solo el tipo del error, nunca su mensaje (\`filtro-errores.filter.ts:77\`), y la bandeja de salida guarda como causa de fallo solo el nombre del error (\`bandeja-salida.ts:27\`). Una prueba unitaria verifica que un RUC presente en la URL no llega a la traza.`,
    '**Minimización:** los eventos de la bandeja llevan solo los datos de contacto que necesita el aviso; el listado y el documento de identificación comercial solo los ve el Administrador (V-03).',
    '**Pendiente:** cifrado AES-256 en reposo (SYS-NFN-01), que aporta el servicio gestionado de producción y el almacén de objetos (ADR-09); y supresión a los 30 días de la cancelación (SYS-FN-37, IT-09).',
  ]),

  h2('2.6 Registro de eventos y auditoría (8.15; PA-06, ADR-05)'),
  p('La bitácora de M9 registra la creación de la cuenta, la aceptación del consentimiento, la carga del registro legal y la decisión del Administrador, con usuario, acción, recurso, detalle, IP de origen y marca temporal (SYS-FN-35). La IP es la del cliente tras el balanceador (`trust proxy`). El rol de la aplicación solo puede insertar y leer: UPDATE, DELETE y TRUNCATE están revocados en el gestor. Lo prueba la suite de base de datos con el error 42501 de PostgreSQL, y lo repite la prueba de sistema contra el entorno completo (informes 4a y 4b).'),

  h2('2.7 Límite de peticiones (SYS-NFN-03; ADR-08)'),
  p(`El guard de la capa 2 cuenta las peticiones por IP y ventana de un minuto en \`plataforma.contador_peticiones\`, con una sola sentencia atómica (\`INSERT … ON CONFLICT DO UPDATE … RETURNING\`). Responde 429 con \`Retry-After\` a partir de la petición 121 (\`${B}/aplicacion/transversal/limite-peticiones.guard.ts:26\`). El guard se evalúa antes que la autenticación, de modo que también limita las peticiones anónimas. La prueba de integración usa dos instancias de la API sobre la misma base: las 120 primeras peticiones, repartidas entre ambas, pasan y la 121 recibe 429 en las dos. El contador no vive en la memoria del proceso (PA-04). En producción, el balanceador aplica el primer nivel del límite (ADR-08, ADR-09).`),

  h2('2.8 Gestión de vulnerabilidades técnicas (8.8)'),
  tabla(
    ['Herramienta', 'Resultado', 'Tratamiento'],
    [
      ['`npm audit --audit-level=high` (trabajo 8, en cada cambio)', '0 críticas · 0 altas · 24 moderadas', 'Las 24 moderadas están en herramientas de desarrollo: esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99, servidor de desarrollo que el proyecto no usa), arrastrado por drizzle-kit, y sprintf-js ≤ 1.1.3 (GHSA-hp3w-g68c-fv3c), arrastrado por Jest. Ninguna llega al artefacto de producción ni afecta al núcleo de ADR-07, que solo se revisa ante una vulnerabilidad alta o crítica sin corrección.'],
      ['Archivo de bloqueo `package-lock.json`', 'Versiones exactas (`--save-exact`)', 'La CI instala con `npm ci`; las versiones se registran en `iteraciones.md`.'],
      ['Scripts de instalación de terceros (`allowScripts`)', '7 paquetes con scripts, todos denegados', 'Funcionan con binarios precompilados; se reduce la superficie de ataque de la cadena de suministro.'],
      ['Escaneo de secretos de GitHub con protección de push', 'Activado', 'Impide subir credenciales reconocibles al repositorio.'],
    ],
    [28, 22, 50],
  ),

  h2('2.9 Configuración y secretos (8.9)'),
  vinetas([
    `Los secretos (URL de la base con su clave, secreto de firma, credenciales del Administrador) solo llegan por variables de entorno. La configuración falla al arrancar si falta uno (\`${B}/composicion/configuracion.ts:23\`).`,
    '`.env.example` declara las variables sin valores; `.env` y `.env.*` están en `.gitignore`.',
    'Las pruebas de integración usan claves válidas solo dentro de su contenedor efímero. El entorno de sistema genera secretos aleatorios de un solo uso en cada ejecución y, en la CI, los enmascara en el registro (`herramientas/sistema/ejecutar.sh`).',
  ]),

  h2('2.10 Análisis estático de seguridad con CodeQL (8.29)'),
  p('El trabajo 9 de la CI ejecuta CodeQL 2.27.2 para `javascript-typescript` con el conjunto `security-extended` (103 reglas) en cada cambio. Los fixtures de la prueba negativa se excluyen porque contienen accesos prohibidos a propósito.'),
  tabla(
    ['Alerta', 'Regla y gravedad', 'Ubicación', 'Análisis', 'Tratamiento'],
    [
      ['#1', '`js/clear-text-storage-of-sensitive-data`, alta', '`sesiones.controller.ts:63`', 'La credencial de renovación se envía al navegador en una cookie sin cifrar. Es una decisión deliberada (ADR-04): esa credencial debe residir en el cliente, y cifrarla no reduciría el riesgo porque seguiría siendo una credencial al portador. Está protegida con HttpOnly, Secure, SameSite=Strict, ruta restringida, vida de 7 días, rotación en cada uso y revocación; el servidor solo guarda su huella.', 'Descartada como «Won\'t fix» por el titular del repositorio, con la justificación registrada en DIS-33'],
    ],
    [8, 20, 16, 38, 18],
  ),
  p('**Riesgo residual de la alerta #1:** la bandera `COOKIE_SEGURA=false` desactiva el atributo `Secure`. Solo se usa en el entorno de sistema local, que no termina TLS. En producción el valor por defecto es `true` y TLS 1.3 lo aporta el borde (SYS-NFN-02, ADR-09).'),

  h2('2.11 Pruebas de seguridad (8.29) y requisitos de seguridad (8.26)'),
  tabla(
    ['Prueba', 'Archivo', 'Resultado'],
    [
      ['401 sin credencial y con credencial alterada', '`test/integracion/api-cuentas-sesiones.spec.ts`', 'Pasa'],
      ['403 por rol en listado, validación y documento', '`api-cuentas-sesiones.spec.ts`, `afiliacion.spec.ts`', 'Pasa'],
      ['429 a partir de la petición 121, con dos instancias', '`api-cuentas-sesiones.spec.ts`', 'Pasa'],
      ['Credencial alterada, vencida, con algoritmo `none`, otro secreto o rol ajeno', '`test/unitarias/infraestructura/seguridad.spec.ts`', 'Pasa'],
      ['Rotación, reutilización, vencimiento y revocación de la renovación', '`servicio-seguridad.spec.ts`; `api-cuentas-sesiones.spec.ts`', 'Pasa'],
      ['Cookie HttpOnly, SameSite=Strict, ruta y vida', '`api-cuentas-sesiones.spec.ts`; `e2e/pruebas/sesion.spec.ts`', 'Pasa'],
      ['Mensaje idéntico para correo inexistente y contraseña incorrecta', '`api-cuentas-sesiones.spec.ts`', 'Pasa'],
      ['CT-SEG-07: bloqueo al quinto intento, sin evaluar la contraseña durante 15 minutos, y aviso al correo', '`servicio-seguridad.spec.ts`; `test/integracion/bloqueo.spec.ts`; `e2e/pruebas/sesion.spec.ts`', 'Pasa'],
      ['UPDATE, DELETE y TRUNCATE de la bitácora fallan (42501)', '`test/bd/bitacora.spec.ts`; `e2e/pruebas/afiliacion.spec.ts`', 'Pasa'],
      ['Privilegios de `abasteceni_app` exactamente los declarados', '`test/bd/linea-base.spec.ts`', 'Pasa'],
      ['Tipo de archivo por contenido, tope de 5 MB y claves contra recorrido de rutas', '`afiliacion.spec.ts`; `almacen-documentos.spec.ts`', 'Pasa'],
      ['Cabeceras de seguridad (`nosniff`, sin `X-Powered-By`)', '`test/integracion/salud.spec.ts`', 'Pasa'],
      ['La traza no contiene datos personales de la URL', '`test/unitarias/aplicacion/transversal.spec.ts`', 'Pasa'],
    ],
    [46, 40, 14],
  ),
  p(`Las cabeceras HTTP las establece helmet 8.3.0 con su configuración por defecto (\`${B}/composicion/configurar-api.ts:18\`): política de seguridad de contenido, HSTS, \`X-Content-Type-Options: nosniff\` y protección contra el encuadre. CORS se restringe al origen del cliente web, con credenciales (línea 19; ASVS V14.5.3).`),

  h2('2.12 Lista de verificación OWASP ASVS 4.0.3'),
  tabla(
    ['Capítulo', 'Requisitos atendidos', 'Pendientes'],
    [
      ['V2 Autenticación', 'V2.1.1, V2.1.2 (longitud), V2.2.1 (bloqueo por intentos, SYS-FN-07), V2.4.1 (argon2id)', 'V2.5 (recuperación, SYS-FN-05), V2.8 (TOTP, SYS-FN-06)'],
      ['V3 Gestión de sesiones', 'V3.4.1, V3.4.2, V3.4.3, V3.4.5 (atributos de la cookie); V3.5.3 (credencial firmada); revocación de la renovación al cerrar sesión', 'Revocación inmediata de la credencial de acceso: vive como máximo 15 minutos (ADR-04)'],
      ['V4 Control de acceso', 'V4.1.1, V4.1.3, V4.1.5 (denegación por defecto, mínimo privilegio, control en el servidor)', '—'],
      ['V5 Validación', 'V5.1.3 (validación positiva), V5.3.4 (consultas parametrizadas)', '—'],
      ['V7 Registros', 'V7.1.1, V7.1.2 (sin credenciales ni datos sensibles en las trazas)', 'Retención y archivo de la bitácora (SYS-NFN-04)'],
      ['V12 Archivos', 'V12.1.1 (tamaño), V12.2.1 (tipo por contenido), V12.3.1 (sin nombre del usuario en la ruta), V12.4.1 (fuera de la raíz web)', 'Análisis antimalware de los documentos'],
      ['V14 Configuración', 'V14.2.1 (dependencias auditadas), V14.4 (cabeceras de helmet), V14.5.3 (CORS restringido)', 'TLS 1.3 y HSTS efectivo en el borde de producción (SYS-NFN-02)'],
    ],
    [18, 46, 36],
  ),

  h2('2.13 Lo construido y verificado frente a lo pendiente'),
  tabla(
    ['Elemento', 'Estado'],
    [
      ['Autenticación sin estado, control de acceso, límite de peticiones, validación, carga segura, bitácora inmutable, consentimiento, secretos, CodeQL y auditoría de dependencias', E.IT02_INTEGRADA ? 'Construido, verificado e integrado en `main`' : 'Construido y verificado; lo de IT-01 integrado en `main`, lo de IT-02 pendiente de la revisión cruzada (PR #3)'],
      ['SYS-FN-07 (bloqueo por intentos fallidos)', 'Construido y verificado; ' + E.bloqueo],
      ['SYS-FN-05, 06 y 08 (recuperación, TOTP, límite de dispositivos)', 'Pendiente: no construidos a la fecha de corte'],
      ['SYS-NFN-01 (AES-256 en reposo) y SYS-NFN-02 (TLS 1.3)', 'Pendiente: servicios gestionados de producción (ADR-09, informe 5)'],
      ['SYS-NFN-04 (retención de la bitácora) y SYS-FN-37 (supresión)', 'Pendiente: IT-09'],
      ['Análisis antimalware de los documentos cargados', 'Propuesta: no lo exige ningún documento de la serie; se registraría como regla nueva'],
    ],
    [56, 44],
  ),

  h1('3. Conclusiones'),
  p('Los controles de ISO/IEC 27002:2022 de la tabla de CLAUDE.md §9 tienen, en el código construido, una práctica concreta y una prueba automatizada que la verifica en cada cambio. Las propiedades críticas no dependen solo del código de la aplicación: la inmutabilidad de la bitácora la hace cumplir PostgreSQL, el límite de peticiones se comparte entre instancias en la base de datos y la protección de `main` impide integrar sin la CI en verde.'),
  p('El análisis estático encontró una alerta de gravedad alta. Se analizó y se descartó con justificación documentada, porque corresponde a una decisión de arquitectura cuyas protecciones están implementadas y probadas. La auditoría de dependencias no tiene hallazgos altos ni críticos. Del tramo B se construyó el bloqueo por intentos fallidos (SYS-FN-07). Los requisitos de seguridad pendientes están identificados: recuperación, segundo factor y límite de dispositivos, y los que dependen de la infraestructura de producción.'),

  h1('4. Referencias normativas y bibliográficas'),
  p('[1] ISO/IEC 27001:2022. _Information security, cybersecurity and privacy protection — Information security management systems — Requirements_, Anexo A.'),
  p('[2] ISO/IEC 27002:2022. _Information security, cybersecurity and privacy protection — Information security controls_.'),
  p('[3] OWASP Foundation. _Application Security Verification Standard_ 4.0.3, 2021.'),
  p('[4] OWASP Foundation. _Password Storage Cheat Sheet_ y _Session Management Cheat Sheet_.'),
  p('[5] Ley No. 787, Ley de Protección de Datos Personales. Asamblea Nacional de Nicaragua, 2012.'),
  p('[6] GitHub. _CodeQL_ 2.27.2, conjunto de consultas `security-extended` para JavaScript y TypeScript.'),
  p('[7] Serie AbasteceNi: D1 v2.1 (RO-04), D2 v1.1, D3 v1.1 (V-03, PA-05, PA-06, ADR-04, ADR-05), registro de decisiones (ADR-08, ADR-09), `docs/evidencia/discrepancias.md` (DIS-06, 22, 24, 25, 28, 33).'),

  h1('5. Anexos'),
  h2('Anexo A — Ejecuciones de CI con los trabajos de seguridad'),
  tabla(
    ['Ejecución', 'Rama', 'CodeQL (trabajo 9)', 'npm audit (trabajo 8)'],
    [
      ['39020586251', '`it-00/entorno`', 'En verde', 'En verde'],
      ['39023391840', '`it-01/linea-base`', 'En verde', 'En verde'],
      ['39033238576', '`it-02/afiliacion`', 'En verde', 'En verde'],
      ['39036501600', '`it-02/informes`', 'En verde', 'En verde'],
    ],
    [22, 28, 25, 25],
  ),
];

escribir(
  documento({
    titulo: 'Programación segura',
    numero: 3,
    portadaDatos: {
      titulo: 'INFORME TÉCNICO: PROGRAMACIÓN SEGURA',
      subtitulo: 'Controles de ISO/IEC 27002 en el código, análisis estático y pruebas de seguridad',
      normas: [
        'ISO/IEC 27001:2022 Anexo A e ISO/IEC 27002:2022 — controles de seguridad de la información',
        'OWASP ASVS 4.0.3 — lista de verificación técnica · Ley No. 787 de Nicaragua',
        'Serie AbasteceNi: D3 (V-03, PA-05, PA-06, ADR-04, ADR-05), ADR-08, D2 (SYS-FN-04 a 08, 35, 36; SYS-NFN-01 a 03)',
      ],
    },
    contenido,
  }),
  process.argv[2],
).then(() => console.log('Informe 3 generado.'));
