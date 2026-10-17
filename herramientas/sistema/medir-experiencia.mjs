// Medición de la vista inicial con Lighthouse (informe 2; SYS-NFN-08 y 10).
// D2 SYS-NFN-08: carga < 2,5 s en 4G/LTE y < 5,0 s en 3G, en tres mediciones
// consecutivas. SYS-NFN-10: peso de la vista inicial ≤ 2,5 MB. Perfiles de
// red de Lighthouse: «4G lento» (RTT 150 ms, 1,6 Mb/s; más exigente que los
// 100 ms de SYS-NFN-08) y «3G regular» (RTT 300 ms, 700 kb/s), ambos con la CPU
// ralentizada ×4 como un teléfono de gama media (RO-06).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('e2e/package.json'));
const { chromium } = require('@playwright/test');
const URL = process.env.URL_SISTEMA ?? 'http://localhost:8080/';
const SALIDA = path.resolve('docs/evidencia/pruebas/experiencia');
const PERFILES = {
  '4G': { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, umbralMs: 2500 },
  '3G': { rttMs: 300, throughputKbps: 700, cpuSlowdownMultiplier: 4, umbralMs: 5000 },
};
mkdirSync(SALIDA, { recursive: true });

const filas = [];
for (const [perfil, red] of Object.entries(PERFILES)) {
  for (let n = 1; n <= 3; n++) {
    const archivo = path.join(SALIDA, `lighthouse-${perfil}-${n}.json`);
    execFileSync(
      'npx',
      [
        '--yes', 'lighthouse@13.5.0', URL, '--quiet', '--output=json', `--output-path=${archivo}`,
        '--only-categories=performance,accessibility,best-practices',
        '--form-factor=mobile', '--throttling-method=simulate',
        `--throttling.rttMs=${red.rttMs}`, `--throttling.throughputKbps=${red.throughputKbps}`,
        `--throttling.cpuSlowdownMultiplier=${red.cpuSlowdownMultiplier}`,
        '--chrome-flags=--headless=new --no-sandbox',
      ],
      { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: 'inherit' },
    );
    const r = JSON.parse(readFileSync(archivo, 'utf8'));
    const a = r.audits;
    filas.push({
      perfil,
      medicion: n,
      fcpMs: Math.round(a['first-contentful-paint'].numericValue),
      lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
      speedIndexMs: Math.round(a['speed-index'].numericValue),
      pesoBytes: a['total-byte-weight'].numericValue,
      rendimiento: Math.round(r.categories.performance.score * 100),
      accesibilidad: Math.round(r.categories.accessibility.score * 100),
      buenasPracticas: Math.round(r.categories['best-practices'].score * 100),
      cumpleCarga: a['largest-contentful-paint'].numericValue < red.umbralMs,
      cumplePeso: a['total-byte-weight'].numericValue <= 2.5 * 1024 * 1024,
    });
  }
}
writeFileSync(path.join(SALIDA, 'resumen.json'), JSON.stringify({ url: URL, lighthouse: '13.5.0', fecha: new Date().toISOString(), perfiles: PERFILES, mediciones: filas }, null, 2));
console.table(filas);
