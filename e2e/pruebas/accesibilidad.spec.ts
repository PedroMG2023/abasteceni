import AxeBuilder from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';
import { ADMINISTRADOR, expect, iniciarSesion } from './soporte';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function analizar(pagina: Page, vista: string) {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze();
  const resumen = resultado.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s)`);
  console.log(`axe · ${vista}: ${resultado.violations.length} infracciones, ${resultado.passes.length} reglas superadas${resumen.length ? ` — ${resumen.join('; ')}` : ''}`);
  return resultado.violations;
}

// WCAG 2.1 AA con axe-core sobre cada vista (informe 2; SYS-NFN-12 y criterios 2.1.1 y 2.1.2).
test.describe('WCAG 2.1 AA · análisis automático con axe-core de cada vista', () => {
  for (const [vista, ruta] of [
    ['inicio', '/#/'],
    ['registro', '/#/registro'],
    ['inicio de sesión', '/#/sesion'],
  ] as const) {
    test(`la vista de ${vista} no tiene infracciones WCAG 2.1 A ni AA`, async ({ page }) => {
      await page.goto(ruta);
      await page.getByRole('heading', { level: 1 }).waitFor();
      expect(await analizar(page, vista)).toEqual([]);
    });
  }

  test('el panel del Administrador no tiene infracciones WCAG 2.1 A ni AA', async ({ page }) => {
    await iniciarSesion(page, ADMINISTRADOR);
    await expect(page.getByRole('heading', { name: 'Panel del Administrador de la plataforma' })).toBeVisible();
    expect(await analizar(page, 'panel del Administrador')).toEqual([]);
  });

  test('el formulario de registro muestra sus errores sin infracciones', async ({ page }) => {
    await page.goto('/#/registro');
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByText('Indique el RUC.')).toBeVisible();
    expect(await analizar(page, 'registro con errores')).toEqual([]);
  });
});

test.describe('SYS-NFN-12 · operación completa por teclado (WCAG 2.1.1 y 2.1.2)', () => {
  test('el registro se recorre con Tab hasta el botón de envío sin trampas de foco', async ({ page }) => {
    await page.goto('/#/registro');
    const visitados: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      visitados.push(await page.evaluate(() => {
        const e = document.activeElement as HTMLInputElement | null;
        return e ? `${e.tagName.toLowerCase()}:${e.getAttribute('name') ?? e.textContent?.trim() ?? ''}` : 'ninguno';
      }));
      if (visitados.at(-1) === 'button:Registrar cuenta') break;
    }
    expect(visitados).toEqual(
      expect.arrayContaining(['select:tipo', 'input:ruc', 'input:registroLegal', 'input:aceptaConsentimiento', 'button:Registrar cuenta']),
    );
    // Sin trampa de foco: Shift+Tab devuelve el foco a la casilla de consentimiento.
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('name'))).toBe('aceptaConsentimiento');
  });

  test('el inicio de sesión se completa solo con teclado', async ({ page }) => {
    await page.goto('/#/sesion');
    await page.getByLabel('Correo electrónico', { exact: true }).focus();
    await page.keyboard.type(ADMINISTRADOR.correo);
    await page.keyboard.press('Tab');
    await page.keyboard.type(ADMINISTRADOR.contrasena);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Panel del Administrador de la plataforma' })).toBeVisible();
  });
});
