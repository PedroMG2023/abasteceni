# CLAUDE.md — AbasteceNi

Este archivo gobierna tu trabajo en este repositorio. Léelo completo antes de cada tarea.

## 1. Qué es este repositorio

Construcción de la plataforma web B2B de emparejamiento comercial AbasteceNi, S.A. La serie documental D1–D5 que reside en `docs/serie/` es normativa: el código la realiza, no la reinterpreta.

| Documento | Qué fija | Identificadores que vas a encontrar |
|---|---|---|
| D1 Objeto de Estudio (v2.1) | Organización, procesos de negocio y restricciones organizacionales | O-NEG-nn, PE-/PM-/PS-nn, U-nn, RO-nn |
| D2 Requisitos (v1.1) | Qué debe hacer el sistema y cómo se acepta | SYS-FN-nn, SYS-NFN-nn, CT-xxx-nn |
| D3 Arquitectura (v1.1) | Capas, módulos, principios, decisiones y riesgos | PA-nn, ADR-nn, M1–M9, V-nn, R-nn, RNF-nn |
| D4 Metodología (v1.1) | Iteraciones, Definición de Terminado, prácticas, métricas | IT-nn, DM-nn, PR-nn, MT-nn |
| D5 Modelos UML (v1.1) | Clases, paquetes, componentes, despliegue, perfil | MA-nn, MD-nn, DML-nn |

Orden de autoridad ante un conflicto: D1 > D2 > D3 > D4 > D5 > este archivo > tu criterio. D1 es el documento base de la serie: todo requisito, decisión o práctica debe rastrearse hasta un objetivo, proceso o restricción suya (D1 §1.1). Si dos fuentes se contradicen, **detente y repórtalo**; nunca resuelvas en silencio.

Las inconsistencias ya conocidas entre documentos están registradas en el Anexo D de D1, D4 y D5 (INC-01 a INC-16). No las vuelvas a reportar como nuevas.

**Nunca inventes una regla de negocio.** Si para programar algo necesitas una regla que ningún documento enuncia (un estado, un plazo, un límite, un mensaje al usuario), detente, descríbela como «regla faltante» en `docs/evidencia/discrepancias.md` y pregunta. Es el mismo criterio que DML-08 aplica a los modelos.

## 2. Alcance vigente

Solo IT-00, IT-01 e IT-02 de D4 §2.13. No construyas M3–M8. No adelantes M6: DM-07 establece que no puede construirse antes que M3 y M4.

| Iteración | Objetivo (D4) | Criterio de salida (D4) |
|---|---|---|
| IT-00 | Habilitar el entorno de construcción: repositorio, integración continua con verificación de dependencias, esqueleto de las cuatro capas y contrato de interfaz inicial. | La batería de pruebas vacía se ejecuta automáticamente en cada cambio y la verificación de dependencias falla deliberadamente ante un acceso cruzado de prueba. |
| IT-01 | Línea base arquitectónica ejecutable: rebanada vertical que atraviese las cuatro capas y ejercite la bandeja de salida transaccional, el interruptor de circuito, la autenticación sin estado y la interfaz cliente desacoplada. | Un evento de dominio se persiste en la misma transacción que su cambio de estado, se publica de forma asíncrona y alcanza un adaptador de notificación; el circuito abre ante un fallo simulado del proveedor. |
| IT-02 | Afiliación y validación de cuentas comerciales de extremo a extremo, incluida la bitácora inmutable (M1 · M2 · M9 en su núcleo de auditoría). | Una cuenta se registra, carga su registro legal, es aprobada o rechazada por el rol administrativo y la decisión consta en la bitácora sin posibilidad de modificación. |

Orden de construcción dentro de IT-02, por prioridad MoSCoW (DM-07):

- Tramo A: SYS-FN-01, 02, 03, 04, 35 (núcleo de auditoría) y 36.
- Tramo B: SYS-FN-07 y 05.
- Tramo C: SYS-FN-08 y 06.

El vehículo funcional de la rebanada de IT-01 se fija en la instrucción de esa iteración. No lo elijas por tu cuenta.

### Fecha de corte: 20 de octubre de 2026

La fecha de corte original era el 17 de octubre de 2026; se prorrogó al 20 de octubre al moverse la presentación a esa noche (decisión del equipo del 19 de octubre). El estado del proyecto que se presenta y que sustentan los informes de §13 es el que esté integrado en `main` a la fecha de corte. Con el tiempo disponible, el orden de prioridad es estricto: IT-00 completa, después IT-01 y después el tramo A de IT-02. Los tramos B y C quedan para después del corte si no caben. Nunca sacrifiques una condición de la Definición de Terminado para llegar antes (RM-01 de D4: se reduce alcance, no calidad). Lo que no llegue se declara como pendiente en `docs/evidencia/iteraciones.md`.

## 3. Arquitectura obligatoria

Pila fijada por ADR-07 (`docs/decisiones/registro-decisiones.md`): TypeScript, NestJS, React con Vite, PostgreSQL. Monorepo con npm workspaces.

La «versión LTS vigente» de ADR-07 es Node.js 24: la versión 20 terminó su soporte en abril de 2026. Fíjala en `.nvmrc`, en `engines` de `package.json` y en la CI.

```
apps/backend/src/
  main.api.ts            servicio de aplicación (MD-03)
  main.trabajador.ts     trabajador asíncrono (MD-03): mismo artefacto, otro proceso
  composicion/           raíz de composición: único lugar que ve todas las capas
  aplicacion/            capa 2: controladores REST, guards, interceptores, filtros, DTO,
                         y el despachador de eventos del trabajador
  dominio/               capa 3: TypeScript puro
    puertos/             paquete de puertos (MD-02)
    m1-usuarios/  m2-seguridad/  m3-demandas/  m4-ofertas/  m5-busqueda/
    m6-cotizaciones/  m7-chat/  m8-reputacion/  m9-administracion/
                         cada módulo expone su interfaz pública en index.ts
  infraestructura/       capa 4: adaptadores (persistencia, bandeja de salida, sondeo,
                         notificación, auditoría, almacén de documentos)
apps/web/src/            capa 1
  paginas/  componentes/  hooks/  puertos/  infraestructura/  contexto/
packages/contrato/openapi.yaml   contrato OpenAPI 3.0, fuente de verdad (PA-07)
docs/serie/  docs/modelos/  docs/decisiones/  docs/evidencia/
```

### Reglas de dependencia (las verifica dependency-cruiser en la CI)

| Nombre de la regla | Qué prohíbe | Origen |
|---|---|---|
| `pa-01-dominio-puro` | Que `dominio/**` importe `aplicacion/**`, `infraestructura/**`, `composicion/**` o cualquier paquete npm (incluidos `@nestjs/*`, el ORM y el controlador de PostgreSQL). | PA-01, MD-02 |
| `pa-02-fronteras-modulo` | Que un archivo de un módulo `mN-*` importe cualquier cosa de otro módulo `mK-*` salvo `dominio/mK-*/index.ts`. Aplica en todas las capas, incluidas las definiciones de esquema de la persistencia. | PA-02, MT-03 |
| `v-01-capa-aplicacion` | Que `aplicacion/**` importe `infraestructura/**`, y que `infraestructura/**` importe `aplicacion/**`. Solo `composicion/` enlaza adaptadores con puertos. | D3 §2.9.1 (V-01) |
| `web-cliente-abstracto` | Que `paginas/**`, `componentes/**` o `hooks/**` importen `infraestructura/**`. Solo `contexto/` construye el cliente concreto. | PA-07, ADR-06 |

Las clases del dominio no llevan decoradores de NestJS. La raíz de composición las construye con fábricas e inyecta los puertos por símbolo.

### Decisiones que el código debe materializar

- **ADR-01.** Una única bandeja de salida (D5 AM-05: «existe y es única»), en el esquema transversal `plataforma`. El cambio de estado y el evento se escriben en la misma transacción.
- **ADR-02.** El interruptor de circuito vive en el trabajador, envolviendo los adaptadores de notificación. Nunca en la API.
- **ADR-04 y PA-04.** Autenticación sin estado: credencial de acceso firmada de vida corta y credencial de renovación, cuya huella se guarda en el esquema de M2 para permitir revocación. Nada de sesión en memoria del proceso.
- **ADR-05 y PA-06.** La bitácora reside en el esquema de M9. Las migraciones corren con el rol `abasteceni_propietario`. La aplicación se conecta con `abasteceni_app`, que tiene INSERT y SELECT sobre la bitácora, y UPDATE, DELETE y TRUNCATE revocados.
- **ADR-06.** La interfaz consume exclusivamente la API REST.
- **ADR-08.** Límite de 120 peticiones por minuto por IP (SYS-NFN-03) en dos niveles: el balanceador en producción (D3 V-04, MD-05) y un guard de la capa 2 (D3 V-01, AS-03) cuyo contador vive en PostgreSQL, en el esquema `plataforma`, y nunca en la memoria del proceso (PA-04).
- **MD-05.** El servicio de aplicación y el trabajador son dos procesos Node.js del mismo artefacto (`main.api.ts` y `main.trabajador.ts`). La versión de `docs/modelos/MD-05-despliegue.puml` es la vigente.
- **PA-07.** El contrato `openapi.yaml` se escribe antes que el código. Los tipos del cliente web se generan desde él, y las pruebas de integración validan las respuestas contra él.
- **D3 §2.9.2, nota sobre SYS-FN-03.** La transición de aprobación o rechazo pertenece a la máquina de estados de M1. El asiento correspondiente se escribe a través del puerto de bitácora de M9.
- **Consentimiento (SYS-FN-36).** Se registra como asiento de bitácora con marca temporal.

## 4. Graduación por R-04

PA-01 y las reglas de V-01 no admiten excepciones. R-04 solo gradúa la cantidad de indirección, nunca la dirección de las dependencias.

| Aspecto | M3, M4, M6, M8 (patrón completo) | M1, M2, M9 (patrón graduado) |
|---|---|---|
| Puertos de persistencia | Uno por agregado o necesidad | Uno por módulo |
| Casos de uso (en `dominio/mN-*`) | Una clase por operación | Un servicio por módulo |
| Mapeo entre dominio y persistencia | Modelos separados con mapeador | El repositorio reconstruye la entidad de dominio directamente desde la fila |
| Desarrollo guiado por pruebas (PR-06) | Obligatorio | No obligatorio; las pruebas siguen exigidas por la Definición de Terminado |
| Puertos transversales (notificación, bandeja, bitácora, almacén) | Siempre | Siempre |

## 5. Nombres (DML-06)

- El vocabulario del dominio va en español y los identificadores no llevan tildes.
- Los nombres de clases, atributos y estados se toman de `docs/modelos/MD-01*.puml`. Los estados de la cuenta son los que enuncia D2 («Pendiente de validación», «Activa»). Si necesitas un nombre que no está en el modelo, regístralo en discrepancias antes de inventarlo.
- Las carpetas de arquitectura van en español porque trazan a D3 y D5. Los sufijos del marco van en inglés: `*.controller.ts`, `*.module.ts`, `*.guard.ts`, `*.spec.ts`.
- La interfaz de usuario, los comentarios, la documentación y los commits van en español.

## 6. Pruebas

- **Unitarias del dominio:** se ejecutan sin base de datos, sin red y sin NestJS.
- **Suites de contrato por puerto:** una sola suite parametrizada se ejecuta contra cada implementación del puerto, la de memoria y la real. Es la evidencia del principio de sustitución (AS-08 a AS-11).
- **Integración con PostgreSQL real** mediante Testcontainers. Cubre persistencia, bandeja de salida y la prueba de que UPDATE y DELETE sobre la bitácora fallan con el rol de la aplicación.
- **Nombres de las pruebas:** si una prueba implementa un criterio de aceptación de D2, su `describe` empieza por el código CT (p. ej., `CT-REG-01 …`). Los requisitos sin CT (SYS-FN-35, SYS-FN-36) se nombran por su SYS-FN.
- **Cobertura:** umbral global ≥ 80 % en el backend, aplicado por la CI (SYS-NFN-15). Reporta aparte la cobertura de `dominio/`.
- **Frontend:** Vitest y Testing Library. El cliente API se sustituye por su implementación de prueba.
- **Pruebas de sistema:** Playwright (Apache-2.0) recorre de extremo a extremo los flujos construidos, contra la API y la interfaz levantadas con Docker Compose. Cada escenario cita el CT o el SYS-FN que verifica.
- **Pruebas de base de datos**, en una suite propia (`apps/backend/test/bd/`), porque se informan por separado. Como mínimo cubren:
  - las migraciones aplican desde cero;
  - existe un esquema por módulo y el esquema `plataforma`;
  - los privilegios de `abasteceni_app` son exactamente los declarados;
  - UPDATE, DELETE y TRUNCATE sobre la bitácora fallan;
  - el cambio de estado y su evento se confirman o se revierten juntos (ADR-01);
  - las restricciones de integridad (unicidad del RUC, NOT NULL de los campos obligatorios de SYS-FN-01);
  - el contador de ADR-08 es compartido entre conexiones.
- **Resultados:** cada ejecución deja su reporte en `docs/evidencia/pruebas/` (JUnit XML o HTML, y el resumen de cobertura). Ese directorio sí se versiona en los cierres de iteración, porque es la evidencia de los informes 4a y 4b.

## 7. Integración continua (GitHub Actions)

Trabajos que se ejecutan en cada cambio (DM-06, PR-08):

1. Instalación desde el archivo de bloqueo (`npm ci`).
2. Lint y verificación de tipos.
3. Pruebas del backend con umbral de cobertura, y pruebas del frontend.
4. dependency-cruiser con las reglas de §3. Cualquier violación detiene la integración (MT-03 > 0).
5. Prueba negativa: un fixture con un acceso cruzado deliberado de `m3` a una pieza interna de `m4` debe ser rechazado. Si deja de ser rechazado, la CI falla. Es el criterio de salida de IT-00.
6. Lint del contrato OpenAPI.
7. Verificación sintáctica de los 14 modelos de `docs/modelos/` (D5 Anexo A, AM-03), con PlantUML 1.2026.8 fijado como jar descargado de las versiones publicadas oficiales. El paquete `plantuml` de Debian (1.2020) no admite la sintaxis de MD-04 ni de MD-07.
8. `npm audit --audit-level=high`.
9. Análisis estático de seguridad con CodeQL (`javascript-typescript`, consultas `security-extended`). Es gratuito en un repositorio público. Sus alertas son la evidencia del control 8.29 de ISO/IEC 27002:2022.

El escaneo de secretos con protección de push de GitHub está activado en el repositorio. No lo desactives.

## 8. Configuración y cambios (D4 §2.16, PR-12, DM-05)

- Usa ramas de vida corta `it-0n/<tema>`, integradas en `main` en un plazo no mayor de dos días.
- Escribe commits convencionales en español, con referencias. Ejemplo: `feat(m1): registra cuenta en estado pendiente [SYS-FN-01] [AS-01]`.
- **Nunca hagas push directo a `main` ni fusiones por tu cuenta.** La revisión cruzada de DM-05 la hace la otra persona del equipo. Deja la rama lista con la descripción del cambio.
- Crea las etiquetas `it-00`, `it-01` e `it-02` solo cuando se te indique, tras la revisión.
- Un elemento está terminado (DM-04) solo si cumple las siete condiciones:
  1. Su criterio de aceptación de D2 se ejecutó con el método asignado y el resultado consta.
  2. La cobertura cumple el umbral de §6.
  3. La verificación de dependencias reporta cero accesos cruzados.
  4. El contrato está publicado y actualizado.
  5. La revisión cruzada consta como favorable.
  6. El elemento está integrado en `main` con toda la batería en verde.
  7. Toda decisión no trivial está registrada en `docs/decisiones/registro-decisiones.md` (PR-11).

## 9. Seguridad mínima

- Contraseñas con argon2id. Nunca aparecen en trazas ni en respuestas de la API (V-03).
- Los secretos solo van en variables de entorno. `.env.example` no lleva valores reales y `.env` está en `.gitignore`.
- Las consultas siempre son parametrizadas; nunca se construyen por concatenación.
- Los datos personales de V-03 (razón social, RUC, documento legal) no se escriben en trazas.
- Carga del registro legal (SYS-FN-02): el tipo se valida por el contenido del archivo y no solo por su extensión. Tope de 5 MB.
- Límite de 120 peticiones por minuto por IP con HTTP 429 (SYS-NFN-03), implementado como guard de la capa 2 con el contador en PostgreSQL, según ADR-08.
- Toda entrada se valida en la frontera (DTO con validación declarativa), y además en el dominio las invariantes de negocio (PA-05).
- Cabeceras de seguridad HTTP con `helmet` (MIT). CORS restringido al origen del cliente web.
- La vida de la credencial de acceso y la de la credencial de renovación no las fija ningún documento: son una regla faltante. Regístrala en discrepancias y pregunta antes de fijar un valor.

Cada práctica de esta sección materializa un control del Anexo A de ISO/IEC 27001:2022, desarrollado en ISO/IEC 27002:2022:

| Control | Práctica en este repositorio |
|---|---|
| 5.34 Privacidad y protección de datos personales | Consentimiento (SYS-FN-36), datos de V-03 fuera de las trazas, Ley No. 787 |
| 8.4 Acceso al código fuente | Ramas protegidas y revisión cruzada (DM-05) |
| 8.5 Autenticación segura | argon2id, bloqueo por intentos (SYS-FN-07), ADR-04 |
| 8.8 Gestión de vulnerabilidades técnicas | `npm audit` en la CI y archivo de bloqueo |
| 8.9 Gestión de la configuración | Secretos en el entorno, `.env.example` sin valores |
| 8.15 Registro de eventos | Bitácora inmutable (ADR-05, SYS-FN-35) |
| 8.24 Uso de criptografía | TLS 1.3 (SYS-NFN-02), cifrado en reposo (SYS-NFN-01) |
| 8.25 Ciclo de vida de desarrollo seguro | DM-04, DM-05 y DM-06 |
| 8.26 Requisitos de seguridad de la aplicación | SYS-FN-04 a 08 y SYS-NFN-01 a 03 |
| 8.27 Principios de arquitectura segura | PA-05 y PA-06 |
| 8.28 Codificación segura | Consultas parametrizadas, validación de entradas, tipos de archivo por contenido |
| 8.29 Pruebas de seguridad | Pruebas 401, 403 y 429 (AS-03), pruebas de la bitácora, CodeQL |
| 8.31 Separación de entornos | Base de datos de prueba en Testcontainers, separada de la de desarrollo |
| 8.32 Gestión de cambios | Ramas `it-0n/*`, commits convencionales, revisión cruzada |

## 10. Evidencia

- `docs/evidencia/matriz-AS.md` es el manifiesto. No cambies la tabla de diseño. Cuando completes un elemento AS-nn, llena su fila en la tabla de evidencia: estado, archivo y líneas, commit, prueba y resultado de CI. Si la realidad difiere del diseño, regístralo en `docs/evidencia/discrepancias.md`.
- Al cerrar cada iteración, agrega una entrada en `docs/evidencia/iteraciones.md` con:
  - fecha y commits;
  - valor de MT-03;
  - cobertura del backend, global y de `dominio/`;
  - versiones exactas de la pila según el archivo de bloqueo;
  - resultado de la CI;
  - pendientes.
- `npm run grafo` genera `docs/evidencia/dependencias.png` con dependency-cruiser y Graphviz (`dot -Tpng -Gdpi=150`). Es un producto derivado y no se versiona (mismo criterio que DML-03). Tampoco se versiona `docs/figuras/`.

## 11. Redacción y justificación

- Justifica siempre con documentos de la serie (PA, ADR, SYS-FN, DM…) o con normas. Las normas aplicables son:
  - SWEBOK v4, ISO/IEC 25010:2011, ISO/IEC/IEEE 12207:2017, 29148:2011, 42010:2022 e ISO/IEC 29110;
  - para la fase de desarrollo, ISO 9241-11:2018, 9241-110:2020 y 9241-210:2019 (usabilidad e interacción);
  - ISO/IEC 27001:2022 y 27002:2022 (seguridad), con OWASP ASVS como lista de verificación técnica;
  - ISO/IEC/IEEE 29119-1, -2 y -3 (pruebas), e ISO/IEC 25062:2006 (formato del informe de usabilidad).
- Nunca uses como justificación al docente, la asignatura ni «porque se pidió».
- No crees identificadores nuevos de familias existentes (ADR-nn, AS-nn, INC-nn…) por tu cuenta. Propónlos en discrepancias.

## 12. Ante la duda

Detente y pregunta. No amplíes el alcance, no elijas reglas de negocio y no cambies el diseño de la matriz AS. Lo que no esté claro va a `docs/evidencia/discrepancias.md` con la referencia exacta del documento y la sección.

## 13. Informes de la fase de desarrollo

Se entregan seis informes; el 4 se divide en dos. Los informes 1, 2, 3, 4a, 4b y 6 se redactan en este repositorio, porque citan archivo y línea, commit y resultado de la CI. Van en `docs/informes/` como `.docx`, con la estructura de la serie: portada, Introducción, Desarrollo, Conclusiones, Referencias y Anexos. El informe 5 (red) se elabora fuera del repositorio y se incorpora a `docs/red/`.

| N.º | Informe | Normas | Evidencia en el repositorio |
|---|---|---|---|
| 1 | SOLID aplicado al proyecto | SWEBOK v4 KA 03; ISO/IEC 25010 (mantenibilidad) | `docs/evidencia/matriz-AS.md` con la tabla de evidencia llena |
| 2 | ISO 9241: experiencia de usuario | ISO 9241-11, -110 y -210; WCAG 2.1 AA; ISO/IEC 25062 | Flujo de registro de IT-02; contraste de los principios de 9241-110 pantalla por pantalla; Lighthouse y axe sobre la vista inicial (SYS-NFN-08, 09, 10, 12) |
| 3 | Programación segura | ISO/IEC 27001:2022 Anexo A y 27002:2022; OWASP ASVS; Ley No. 787 | La tabla de controles de §9, los resultados de CodeQL y de `npm audit`, y las pruebas 401, 403 y 429 |
| 4a | Pruebas de sistema | ISO/IEC/IEEE 29119-3 | Pruebas de Playwright y de integración HTTP, con su reporte en `docs/evidencia/pruebas/` |
| 4b | Pruebas a la base de datos | ISO/IEC/IEEE 29119-3 | La suite `test/bd/` de §6 y el diagrama físico de los esquemas, generado desde las migraciones |
| 5 | Red física y despliegue en la nube | ISO/IEC 11801-1, TIA-568 y TIA-606; ISO/IEC 27033; ISO/IEC 27017 y 27018 | Fuera del repositorio; parte de MD-05 |
| 6 | Repositorio | ISO/IEC/IEEE 12207 §6.3.5 (gestión de la configuración); ISO/IEC 29110 | La estructura, las ramas, la CI, las convenciones de §8 y el historial de commits |

Cada informe distingue lo que está construido y verificado de lo que está diseñado pero pendiente, con el mismo criterio de los estados de la matriz AS. Nunca presentes como construido algo que no esté integrado en `main` con la CI en verde.
