// Prueba negativa de la verificación de dependencias (trabajo 5 de la CI).
// Criterio de salida de IT-00 (D4 §2.13): la verificación falla deliberadamente
// ante un acceso cruzado de prueba. Cada fixture contiene accesos prohibidos a
// propósito y debe ser rechazado exactamente por la regla esperada; el fixture
// «permitido» no debe producir ninguna violación. Si una regla deja de rechazar
// su fixture, este guion termina con error y la CI falla.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const configuracion = path.join(raiz, '.dependency-cruiser.cjs');
const depcruise = path.join(raiz, 'node_modules/.bin/depcruise');
const fixtures = path.join(raiz, 'herramientas/dependencias/fixtures');

const CASOS = [
  { fixture: 'pa-02-acceso-cruzado', esperadas: ['pa-02-fronteras-modulo'] },
  { fixture: 'pa-02-esquema-ajeno', esperadas: ['pa-02-fronteras-modulo'] },
  { fixture: 'pa-01-dominio-impuro', esperadas: ['pa-01-dominio-puro'] },
  { fixture: 'v-01-capa-cruzada', esperadas: ['v-01-capa-aplicacion'] },
  { fixture: 'web-cliente-concreto', esperadas: ['web-cliente-abstracto'] },
  { fixture: 'permitido', esperadas: [] },
];

const cruzar = (fixture, ...argumentos) =>
  spawnSync(depcruise, ['apps', '--config', configuracion, ...argumentos], {
    cwd: path.join(fixtures, fixture),
    encoding: 'utf8',
  });

let fallos = 0;
for (const { fixture, esperadas } of CASOS) {
  // El reportero JSON identifica la regla violada, pero siempre termina con 0.
  const resultado = cruzar(fixture, '--output-type', 'json');
  if (!resultado.stdout) {
    console.error(`✗ ${fixture}: dependency-cruiser no produjo salida.\n${resultado.stderr}`);
    fallos += 1;
    continue;
  }
  const { summary } = JSON.parse(resultado.stdout);
  const obtenidas = [...new Set(summary.violations.map((v) => v.rule.name))].sort();
  const coincide = JSON.stringify(obtenidas) === JSON.stringify([...esperadas].sort());
  // El reportero por defecto es el que usa el trabajo 4: debe detener la integración.
  const { status } = cruzar(fixture);
  const salidaCoherente = esperadas.length === 0 ? status === 0 : status !== 0;
  if (coincide && salidaCoherente) {
    const detalle = summary.violations.map((v) => `${v.from} → ${v.to}`).join('; ');
    console.log(`✓ ${fixture}: ${esperadas.length ? `rechazado por ${obtenidas.join(', ')} (${detalle})` : 'sin violaciones'}`);
  } else {
    console.error(
      `✗ ${fixture}: se esperaba [${esperadas.join(', ')}] y se obtuvo [${obtenidas.join(', ')}] con código de salida ${status}.`,
    );
    fallos += 1;
  }
}

if (fallos > 0) {
  console.error(`\nLa verificación de dependencias no rechaza ${fallos} caso(s) como debe.`);
  process.exit(1);
}
console.log(`\nLa verificación de dependencias rechaza los ${CASOS.length - 1} accesos prohibidos y admite los permitidos.`);
