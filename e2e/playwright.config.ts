import { defineConfig, devices } from '@playwright/test';

// Pruebas de sistema (CLAUDE.md §6; informe 4a, ISO/IEC/IEEE 29119-3) contra la
// API y la interfaz levantadas con docker-compose.sistema.yml.
export default defineConfig({
  testDir: './pruebas',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['junit', { outputFile: '../docs/evidencia/pruebas/sistema/junit.xml' }],
    ['html', { outputFolder: '../docs/evidencia/pruebas/sistema/html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.URL_SISTEMA ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    locale: 'es-NI',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
