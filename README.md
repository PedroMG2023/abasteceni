# AbasteceNi

Plataforma web B2B de emparejamiento comercial de AbasteceNi, S.A. El código realiza la serie documental D1–D5 de `docs/serie/`, que es normativa. Las reglas de trabajo están en `CLAUDE.md`.

## Estructura

| Ruta | Contenido | Origen |
|---|---|---|
| `apps/backend/src/` | Servicio de aplicación (`main.api.ts`) y trabajador asíncrono (`main.trabajador.ts`), dos procesos del mismo artefacto | MD-03, MD-05 |
| `apps/backend/src/composicion/` | Raíz de composición: único lugar que ve las cuatro capas | PA-01, AS-17 |
| `apps/backend/src/aplicacion/` | Capa 2: controladores, guards, filtros, despachador de eventos | D3 V-01 |
| `apps/backend/src/dominio/` | Capa 3: TypeScript puro, nueve módulos y paquete de puertos | PA-01, MD-02 |
| `apps/backend/src/infraestructura/` | Capa 4: adaptadores y un esquema de PostgreSQL por módulo | PA-02, ADR-01, ADR-05 |
| `apps/backend/migraciones/` | Migraciones SQL; se aplican con `abasteceni_propietario` | ADR-05 |
| `apps/web/src/` | Capa 1: interfaz responsiva desacoplada | ADR-06 |
| `packages/contrato/openapi.yaml` | Contrato OpenAPI 3.0, fuente de verdad, y tipos generados | PA-07 |
| `herramientas/` | Verificación de modelos, prueba negativa de dependencias, aprovisionamiento de la base local | DM-06, AM-03 |
| `docs/` | Serie D1–D5, modelos, decisiones, evidencia, informes | — |

## Órdenes

```bash
nvm use                 # Node.js 24
npm ci                  # instalación desde el archivo de bloqueo
npm run lint && npm run tipos
npm test                # backend (con umbral de cobertura) y frontend; requiere Docker
npm run test:bd         # suite de base de datos (Testcontainers)
npm run dependencias    # reglas de dependencia (MT-03)
npm run dependencias:negativa
npm run contrato:lint
npm run modelos         # verificación de los 14 modelos de D5 con PlantUML 1.2026.8
npm run grafo           # docs/evidencia/dependencias.png (no se versiona)
```

Base local: copie `.env.example` como `.env`, asigne las claves y ejecute `docker compose up -d`. Luego compile con `npm run build -w @abasteceni/backend` y ejecute `URL_BD_PROPIETARIO=… npm run migrar -w @abasteceni/backend`.

## Cambios

Use ramas de vida corta `it-0n/<tema>` y commits convencionales en español con referencias. Toda integración en `main` pasa por revisión cruzada (DM-05) y CI en verde (DM-06).
