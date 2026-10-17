# Registro de cierre de iteraciones

Registro de cada iteración cerrada (CLAUDE.md §10; D4 §2.13, §2.16 y §2.17). Cada entrada consigna la fecha y los commits, el valor de MT-03, la cobertura del backend (global y de `dominio/`), las versiones exactas de la pila según `package-lock.json`, el resultado de la CI y los pendientes.

Los reportes de cada cierre se toman del artefacto `reportes-pruebas` de la ejecución de CI correspondiente y se versionan en `docs/evidencia/pruebas/it-0n/`. Los reportes de las ejecuciones locales se escriben en `docs/evidencia/pruebas/{backend,bd,web,sistema}/` y no se versionan.

## IT-00 — Entorno de construcción

**Objetivo (D4 §2.13).** Habilitar el entorno de construcción: repositorio, integración continua con verificación de dependencias, esqueleto de las cuatro capas y contrato de interfaz inicial.

**Criterio de salida.** La batería de pruebas se ejecuta automáticamente en cada cambio, y la verificación de dependencias falla deliberadamente ante un acceso cruzado de prueba. **Cumplido**:

- el flujo `.github/workflows/ci.yml` se dispara con cada `push` a cualquier rama y con cada solicitud de integración hacia `main`;
- el trabajo 5 (`herramientas/dependencias/prueba-negativa.mjs`) exige que el fixture `pa-02-acceso-cruzado`, en el que m3 importa `m4-ofertas/inventario-interno.ts`, sea rechazado por `pa-02-fronteras-modulo`, y lo es;
- una prueba de mutación local, que neutralizó el origen de la regla, hizo fallar el trabajo 5 con código 1.

| Campo | Valor |
|---|---|
| Fecha | 2026-10-17 |
| Rama | `it-00/entorno` |
| Commits | `47c2317` build · `16a893e` contrato · `cceceb2` backend · `4347b19` web · `5d4a32b` ci · `7745854` discrepancias · cierre (este registro) |
| MT-03 | **0** violaciones (trabajo 4: 54 módulos, 50 dependencias analizadas) |
| Cobertura del backend, global (batería principal) | Sentencias 91,83 % · ramas 100 % · funciones 100 % · líneas 95,34 % |
| Cobertura de `dominio/` | No aplica: en IT-00 el dominio solo tiene los `index.ts` vacíos de los nueve módulos y del paquete de puertos. El umbral propio de `./src/dominio/` se activa en IT-01 (`apps/backend/jest.config.js`). |
| Cobertura del frontend | Sentencias 90,62 % · ramas 91,66 % · funciones 83,33 % · líneas 93,10 % |
| Pruebas | Backend: 3 (integración HTTP y de persistencia contra el contrato). Base de datos: 4 (`test/bd/`). Frontend: 6. Todas pasan. |
| CI | [Ejecución 39020586251](https://github.com/PedroMG2023/abasteceni/actions/runs/39020586251) sobre `7745854`: **9 de 9 trabajos en verde** |
| Auditoría (`npm audit`) | 0 críticas · 0 altas · 24 moderadas, todas en herramientas de desarrollo: esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99, servidor de desarrollo de esbuild, que el proyecto no usa) arrastrado por drizzle-kit, y sprintf-js ≤ 1.1.3 (GHSA-hp3w-g68c-fv3c) arrastrado por Jest. Ninguna afecta al núcleo de ADR-07. |

### Versiones exactas de la pila (`package-lock.json`)

| Componente | Versión | Componente | Versión |
|---|---|---|---|
| Node.js (`.nvmrc`, `engines`, CI) | 24 (local: 24.22.0; npm 11.19.1) | PostgreSQL (Compose y Testcontainers) | 18.6 (`postgres:18.6-alpine`) |
| TypeScript | 5.9.3 | NestJS (`common`, `core`, `platform-express`, `testing`) | 11.2.7 |
| React y React DOM | 19.3.1 | Vite | 8.3.4 |
| Drizzle ORM | 0.45.4 | drizzle-kit | 0.31.11 |
| pg | 8.23.1 | Jest | 30.5.2 |
| ts-jest | 29.4.15 | jest-junit | 17.0.0 |
| Vitest y @vitest/coverage-v8 | 5.0.5 | Testing Library (React) | 16.3.3 |
| @testcontainers/postgresql | 12.2.1 | supertest | 7.3.1 |
| dependency-cruiser | 18.6.0 | @redocly/cli | 2.64.1 |
| openapi-typescript | 7.13.0 | openapi-fetch | 0.17.0 |
| ESLint | 10.13.0 | typescript-eslint | 8.71.2 |
| ajv (validador del contrato en pruebas) | 8.20.0 | yaml | 2.9.1 |
| PlantUML (jar, SHA-256 verificado) | 1.2026.8 | Java en CI (Temurin) | 21 |

### Herramientas complementarias incorporadas (ADR-07, «Herramientas complementarias»)

- **Validador OpenAPI en pruebas.** Se realiza con `ajv` (MIT) y `yaml` (ISC) en `apps/backend/test/soporte/contrato.ts`, en lugar de una biblioteca específica. La función y la licencia libre se conservan.
- **Lint.** ESLint y typescript-eslint (MIT), con `eslint-plugin-react-hooks` (MIT). La regla `no-restricted-globals` prohíbe `fetch` en páginas, componentes y hooks (AS-18).
- **Reporte JUnit.** `jest-junit` (Apache-2.0), para la evidencia de los informes 4a y 4b.
- **Scripts de instalación de terceros.** Están denegados en `package.json` (`allowScripts`) para esbuild, @parcel/watcher, cpu-features, protobufjs, ssh2 y unrs-resolver. Todos funcionan con los binarios precompilados de sus dependencias opcionales (control 8.8 de ISO/IEC 27002:2022).

### Pendientes

- **Protección de `main`** (DIS-11): la debe activar el titular del repositorio. Al agente se le denegó el permiso.
- **Segunda persona del equipo**: invitarla como colaboradora en GitHub para la revisión cruzada de DM-05.
- **Revisión cruzada de esta rama** (DM-05) e integración en `main`: condiciones 5 y 6 de la Definición de Terminado.
- **Etiqueta `it-00`**: se crea solo tras la revisión.

## IT-01 — Línea base arquitectónica ejecutable

**Objetivo (D4 §2.13; DM-08).** Una rebanada vertical que atraviese las cuatro capas y ejercite la bandeja de salida transaccional, el interruptor de circuito, la autenticación sin estado y la interfaz cliente desacoplada.

**Vehículo funcional.** Lo fijó la instrucción de la iteración: el registro de una cuenta comercial (SYS-FN-01), con el inicio de sesión sin estado (`/api/v1/sesiones`) y la interfaz web.

**Criterio de salida.** Un evento de dominio se persiste en la misma transacción que su cambio de estado, se publica de forma asíncrona y alcanza un adaptador de notificación; el circuito abre ante un fallo simulado del proveedor. **Cumplido.** Lo verifica `apps/backend/test/integracion/linea-base.spec.ts` (`describe` «IT-01 · criterio de salida…»), en cuatro pasos y contra PostgreSQL real con la composición real del trabajador:

1. La cuenta y su evento `CuentaRegistrada` se confirman juntos. Si la transacción falla, no queda ninguno de los dos.
2. El sondeo publica el evento y el adaptador de WhatsApp (proveedor simulado) recibe la notificación con el texto de DIS-20.
3. Con el proveedor caído, el circuito abre: dos fallos de tres llamadas en la ventana. Las notificaciones restantes fallan rápido (`ErrorCircuitoAbierto`) y quedan pendientes en la bandeja.
4. Recuperado el proveedor, el circuito pasa a semiabierto, se cierra y entrega las notificaciones acumuladas.

En el sistema completo (Playwright sobre Docker Compose), el evento de un registro hecho desde la interfaz se publicó con un retardo de **0,98 s** (MT-04; umbral de alerta 30 s, umbral comprometido 60 s, R-02).

| Campo | Valor |
|---|---|
| Fecha | 2026-10-17 |
| Rama | `it-01/linea-base`, sacada de `it-00/entorno` |
| Commits | `1bc3e7c` contrato · `c620ab1` dominio · `aff76c7` infraestructura · `148f5ec` aplicación · `8334161` composición · `794fe51` adaptador de correo (AS-05) · `ca9d385` web · `27d1d63` pruebas de sistema · cierre (este registro) |
| MT-03 | **0** violaciones (trabajo 4) |
| MT-04 | 0,98 s en el entorno de sistema local y 0,51 s en la CI |
| Cobertura del backend, global | Sentencias 98,20 % · ramas 92,66 % · funciones 94,36 % · líneas 98,76 % |
| Cobertura de `dominio/` | Sentencias 99,51 % (205/206) · ramas 98,51 % (66/67) · funciones 97,01 % (65/67) · líneas 100 % (167/167). Desde esta iteración la CI exige también el 80 % sobre `./src/dominio/` |
| Cobertura del frontend | Sentencias 97,22 % · ramas 96,62 % · funciones 93,75 % · líneas 98,14 % |
| Pruebas | Backend (unitarias, contrato e integración): 110. Base de datos: 19. Frontend: 27. Sistema (Playwright): 8. Todas pasan |
| CI | [Ejecución 39023391840](https://github.com/PedroMG2023/abasteceni/actions/runs/39023391840) sobre `27d1d63`: **10 de 10 trabajos en verde** (incluido el 10, pruebas de sistema) |
| Auditoría (`npm audit`) | 0 críticas · 0 altas. Las moderadas son las mismas de IT-00, en herramientas de desarrollo |

### Versiones exactas añadidas en IT-01 (`package-lock.json` e imágenes)

| Componente | Versión | Uso |
|---|---|---|
| opossum | 10.0.0 | Interruptor de circuito en el trabajador (ADR-02) |
| argon2 | 0.45.1 | argon2id para contraseñas (V-03) |
| jsonwebtoken | 9.0.3 | Credencial de acceso HS256 (ADR-04) |
| helmet | 8.3.0 | Cabeceras de seguridad HTTP |
| class-validator y class-transformer | 0.15.1 y 0.5.1 | Validación declarativa en la frontera (PA-05) |
| ajv-formats | 3.0.1 | Formatos `uuid` y `date-time` en el validador del contrato |
| @playwright/test | 1.64.1 | Pruebas de sistema (Chromium sin interfaz 156) |
| Imagen del artefacto | `node:24-slim` | API y trabajador (MD-05) |
| Imagen web local | `nginx:1.29-alpine` | Activos y proxy de `/api` en el entorno de sistema |

### Parámetros técnicos (no son reglas de negocio)

- **Interruptor (ADR-02, `apps/backend/src/infraestructura/notificacion/interruptor.ts`):** tiempo máximo de 10 s; abre con ≥ 50 % de errores y un volumen mínimo de 3 llamadas en una ventana de 60 s; prueba la reapertura a los 30 s.
- **Reintentos de la bandeja:** espera exponencial de 1 s, 2 s, 4 s… acotada a 60 s, coherente con el umbral de R-02.
- **Sondeo:** cada 1 s, en lotes de 20 eventos (configurable por entorno).
- **Límite de peticiones:** 120 por minuto e IP (SYS-NFN-03), fijo y no configurable. El contador vive en `plataforma.contador_peticiones` y el trabajador purga cada minuto las ventanas vencidas.

### Alcance y notas

- **`GET /api/v1/cuentas` adelantado.** Es el listado para el panel del Administrador (SYS-FN-03, de IT-02) y se construyó en IT-01 porque la prueba 403 de AS-03 necesita un recurso restringido por rol.
- **Notificaciones simuladas.** Los adaptadores de WhatsApp y de correo usan proveedores simulados: el alcance vigente no integra WhatsApp Business API ni un servicio de correo real. La composición elige el canal con `CANAL_NOTIFICACION`.
- **Cookie de renovación.** Es `Secure` por defecto (`COOKIE_SEGURA`). Solo el entorno de sistema local, sin TLS, la desactiva.

### Pendientes

- Revisión cruzada (DM-05) de esta rama. Está sacada de `it-00/entorno`, que todavía no está en `main`.
- Aprobación de los textos de DIS-26 y de la precisión de rutas de DIS-27.
- Añadir el trabajo 10 a los checks obligatorios de la protección de `main`.
- Etiqueta `it-01`: tras la revisión.

