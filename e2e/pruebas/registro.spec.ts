import { test } from '@playwright/test';
import { consultar, cuentaNueva, expect, llenarRegistro } from './soporte';

test.describe('CT-REG-01 · registro de una cuenta comercial de extremo a extremo (SYS-FN-01)', () => {
  test('con todos los campos válidos la cuenta queda «Pendiente de validación»', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta);
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();

    await expect(page.getByRole('status')).toHaveText('Su cuenta quedó en estado «Pendiente de validación». Le avisaremos cuando sea validada.');
    const [fila] = await consultar('SELECT estado FROM m1_usuarios.cuentas_comerciales WHERE ruc = $1', [cuenta.ruc]);
    expect(fila).toEqual({ estado: 'Pendiente de validación' });
  });

  test('con el RUC vacío rechaza el envío y muestra el mensaje de error del campo', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, { ...cuenta, ruc: '' });
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();

    await expect(page.getByLabel('RUC', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Indique el RUC.')).toBeVisible();
    expect(await consultar('SELECT 1 FROM m1_usuarios.cuentas_comerciales WHERE correo = $1', [cuenta.correo])).toEqual([]);
  });

  test('un RUC ya registrado muestra el aviso devuelto por la API', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta);
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    await llenarRegistro(page, { ...cuenta, correo: `otra.${cuenta.correo}` });
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();

    await expect(page.getByRole('alert').first()).toHaveText('Ya existe una cuenta registrada con ese RUC.');
  });

  test('SYS-NFN-09 · el formulario se opera a 320 px sin desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/#/registro');

    const anchos = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    expect(anchos.documento).toBeLessThanOrEqual(anchos.ventana);
    // Todos los controles caben a lo ancho; el desplazamiento vertical es admisible.
    for (const control of await page.locator('input, select, button').all()) {
      const caja = await control.boundingBox();
      expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(320);
    }
  });
});

test.describe('IT-01 · el evento CuentaRegistrada se publica de forma asíncrona (ADR-01, R-02)', () => {
  test('el trabajador publica el evento del registro dentro del umbral de 60 s', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta);
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    await expect
      .poll(
        async () => {
          const [fila] = await consultar<{ publicado: boolean }>(
            `SELECT publicado_en IS NOT NULL AS publicado FROM plataforma.bandeja_salida WHERE datos->>'correo' = $1`,
            [cuenta.correo],
          );
          return fila?.publicado ?? false;
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    const [retardo] = await consultar<{ segundos: number }>(
      `SELECT extract(epoch FROM publicado_en - ocurrido_en)::float AS segundos FROM plataforma.bandeja_salida WHERE datos->>'correo' = $1`,
      [cuenta.correo],
    );
    // MT-04: retardo entre la persistencia y la publicación del evento.
    console.log(`MT-04 · retardo de publicación: ${retardo.segundos.toFixed(3)} s`);
    expect(retardo.segundos).toBeLessThan(60);
  });
});
