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
