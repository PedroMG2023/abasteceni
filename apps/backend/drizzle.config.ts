import { defineConfig } from 'drizzle-kit';

// Generación de migraciones SQL desde las definiciones de esquema de cada
// módulo (PA-02). Las migraciones se aplican con el rol propietario (ADR-05).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infraestructura/persistencia/**/esquema.ts',
  out: './migraciones',
  migrations: {
    schema: 'plataforma',
    table: 'migraciones',
  },
});
