import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Capa 1 (D3 V-01): interfaz responsiva desacoplada que consume la API REST (ADR-06).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/configuracion.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../docs/evidencia/pruebas/web/junit.xml' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      reporter: ['text', 'text-summary', 'json-summary'],
    },
  },
});
