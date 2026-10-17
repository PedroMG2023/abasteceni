// Verificación automática de dependencias (DM-06, PR-08). Cada violación cuenta
// para MT-03 y detiene la integración. Las reglas realizan CLAUDE.md §3.
// Las rutas se anclan en «apps/…» para que la prueba negativa pueda reutilizar
// esta misma configuración sobre los fixtures de herramientas/dependencias/.

const BACKEND = '(^|/)apps/backend/src/';
const WEB = '(^|/)apps/web/src/';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'pa-01-dominio-puro',
      comment:
        'PA-01, MD-02, AS-15: el dominio solo depende de sí mismo. Prohíbe importar aplicacion/, ' +
        'infraestructura/, composicion/, cualquier paquete npm y los módulos internos de Node.',
      severity: 'error',
      from: { path: `${BACKEND}dominio/` },
      to: { pathNot: `${BACKEND}dominio/` },
    },
    {
      name: 'pa-02-fronteras-modulo',
      comment:
        'PA-02, MT-03, AS-16: un archivo de un módulo mN-* solo puede importar de otro módulo mK-* ' +
        'su interfaz pública dominio/mK-*/index.ts. Aplica en todas las capas, incluidas las ' +
        'definiciones de esquema de la persistencia.',
      severity: 'error',
      from: { path: '(^|/)(m[1-9])-[^/]+/' },
      to: {
        path: '(^|/)m[1-9]-[^/]+/',
        pathNot: ['(^|/)$2-[^/]+/', `${BACKEND}dominio/m[1-9]-[^/]+/index\\.ts$`],
      },
    },
    {
      name: 'v-01-capa-aplicacion',
      comment:
        'D3 V-01: aplicacion/ no importa infraestructura/ ni infraestructura/ importa aplicacion/. ' +
        'Solo composicion/ enlaza adaptadores con puertos.',
      severity: 'error',
      from: { path: `${BACKEND}(aplicacion|infraestructura)/` },
      to: { path: `${BACKEND}(aplicacion|infraestructura)/`, pathNot: `${BACKEND}$2/` },
    },
    {
      name: 'web-cliente-abstracto',
      comment: 'PA-07, ADR-06, AS-18: páginas, componentes y hooks no importan infraestructura/. Solo contexto/ construye el cliente concreto.',
      severity: 'error',
      from: { path: `${WEB}(paginas|componentes|hooks)/` },
      to: { path: `${WEB}infraestructura/` },
    },
    {
      name: 'no-sin-resolver',
      comment: 'Resguardo: una importación que no se resuelve escaparía a las cuatro reglas anteriores.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['(^|/)node_modules/', '(^|/)dist/', '(^|/)coverage/'] },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['types', 'import', 'require', 'node', 'default'],
      mainFields: ['types', 'module', 'main'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js', '.mjs', '.cjs', '.json'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)' },
    },
  },
};
