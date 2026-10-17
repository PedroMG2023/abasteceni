# Artefacto único de AbasteceNi (MD-05, D3 V-04): el servicio de aplicación y el
# trabajador son dos procesos de la misma imagen. La interfaz se entrega aparte
# como activos estáticos (ADR-06); en local la sirve nginx en lugar de la red de
# distribución de contenido.
FROM node:24-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/contrato/package.json packages/contrato/
COPY e2e/package.json e2e/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/contrato packages/contrato
COPY apps/backend apps/backend
COPY apps/web apps/web
RUN npm run build -w @abasteceni/backend && npm run build -w @abasteceni/web
RUN npm prune --omit=dev

FROM node:24-slim AS artefacto
ENV NODE_ENV=production
WORKDIR /app
COPY --from=construccion /app/node_modules ./node_modules
COPY --from=construccion /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=construccion /app/apps/backend/dist ./apps/backend/dist
COPY --from=construccion /app/apps/backend/migraciones ./apps/backend/migraciones
WORKDIR /app/apps/backend
USER node
CMD ["node", "dist/src/main.api.js"]

FROM nginx:1.29-alpine AS web
COPY herramientas/sistema/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/apps/web/dist /usr/share/nginx/html
