// Suite de pruebas de base de datos (CLAUDE.md §6, informe 4b). Se ejecuta y
// se informa por separado de la batería principal.
const path = require('node:path');

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'bd',
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: { ignoreCodes: [151002] } }] },
  testMatch: ['<rootDir>/test/bd/**/*.spec.ts'],
  testTimeout: 120000,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: path.join(__dirname, '../../docs/evidencia/pruebas/bd'), outputName: 'junit.xml', addFileAttribute: 'true' }],
  ],
};
