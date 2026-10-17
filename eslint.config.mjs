// Lint del monorepo (trabajo 2 de la CI, CLAUDE.md §7).
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/contrato/generado/**',
      'herramientas/dependencias/fixtures/**',
      'apps/backend/migraciones/**',
      'herramientas/informes/node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/backend/**/*.{ts,js}', 'herramientas/**/*.{js,mjs}', '*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/backend/**/*.js', 'herramientas/informes/*.js', '*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // AS-18: hooks, componentes y páginas no llaman a fetch; usan el puerto ClienteApi.
    files: ['apps/web/src/{paginas,componentes,hooks}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use el puerto ClienteApi (AS-18, ADR-06).' }],
    },
  },
);
