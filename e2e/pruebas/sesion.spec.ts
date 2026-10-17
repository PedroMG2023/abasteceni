import { test } from '@playwright/test';
import { ADMINISTRADOR, cuentaNueva, expect, iniciarSesion, llenarRegistro } from './soporte';

test.describe('CT-SEG-04 · inicio de sesión sin estado de extremo a extremo (SYS-FN-04, ADR-04)', () => {
  test('el Administrador inicia sesión, ve su rol, conserva la sesión al recargar y la cierra', async ({ page, context }) => {
    await iniciarSesion(page, ADMINISTRADOR);
    await expect(page.getByRole('status')).toHaveText('Rol: Administrador');

    const cookie = (await context.cookies()).find((c) => c.name === 'abasteceni_renovacion');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/v1/sesiones' });

    // La credencial de acceso solo vivía en memoria: la sesión se recupera con la cookie de renovación.
    await page.reload();
    await expect(page.getByRole('status')).toHaveText('Rol: Administrador');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('una cuenta «Pendiente de validación» no inicia sesión (DIS-25)', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta);
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    await iniciarSesion(page, cuenta);

    await expect(page.getByRole('alert')).toHaveText('Su cuenta está pendiente de validación.');
  });

  test('una contraseña incorrecta recibe el mensaje genérico', async ({ page }) => {
    await iniciarSesion(page, { correo: ADMINISTRADOR.correo, contrasena: 'no-es-la-clave-correcta' });
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  });
});
