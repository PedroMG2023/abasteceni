// Pruebas del backend (CLAUDE.md §6): unitarias del dominio, suites de
// contrato por puerto e integración HTTP. La suite de base de datos tiene su
// propia configuración (jest.bd.config.js) porque se informa por separado.
const path = require('node:path');

// TS151002 avisa del modo «nodenext» sin isolatedModules; el paquete es CommonJS
// y ts-jest usa el programa completo para emitir los metadatos de decoradores.
const transform = { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: { ignoreCodes: [151002] } }] };
const proyecto = (displayName, testMatch) => ({
  displayName,
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform,
  testMatch,
  testTimeout: 60000,
});

const umbral = { statements: 80, branches: 80, functions: 80, lines: 80 };

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    proyecto('unitarias', ['<rootDir>/test/unitarias/**/*.spec.ts']),
    proyecto('contrato', ['<rootDir>/test/contrato/**/*.spec.ts']),
    proyecto('integracion', ['<rootDir>/test/integracion/**/*.spec.ts']),
  ],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/main.*.ts', '!<rootDir>/src/**/*.spec.ts'],
  coverageDirectory: path.join(__dirname, 'coverage'),
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  // SYS-NFN-15 y condición 2 de DM-04: umbral global y del núcleo de dominio.
  coverageThreshold: { global: umbral, './src/dominio/': umbral },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: path.join(__dirname, '../../docs/evidencia/pruebas/backend'), outputName: 'junit.xml', addFileAttribute: 'true' }],
  ],
};
