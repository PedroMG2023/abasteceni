import { test } from '@playwright/test';
import { consultar, cuentaActiva, expect, iniciarSesion } from './soporte';

// Secreto del enlace, una vez que el trabajador publicó el aviso. El entorno de
// sistema usa el proveedor de correo simulado, así que se lee de la bandeja de
// salida, que solo ve el rol propietario. La expiración a los 16 minutos se
// verifica con reloj controlado en las pruebas unitarias y de integración.
async function secretoPublicado(correo: string): Promise<string> {
  let secreto = '';
  await expect
    .poll(async () => {
      const [fila] = await consultar<{ secreto: string; publicado: boolean }>(
        `SELECT datos->>'secreto' AS secreto, publicado_en IS NOT NULL AS publicado FROM plataforma.bandeja_salida
          WHERE tipo = 'RecuperacionSolicitada' AND datos->>'correo' = $1 ORDER BY secuencia DESC LIMIT 1`,
        [correo],
      );
      secreto = fila?.secreto ?? '';
      return fila?.publicado ?? false;
    }, { timeout: 30_000 })
    .toBe(true);
  return secreto;
}

test.describe('CT-SEG-05 · recuperación de la cuenta por enlace temporal (SYS-FN-05, DIS-36)', () => {
  test('solicita el enlace desde el inicio de sesión, restablece la contraseña e inicia sesión con la nueva', async ({ page }) => {
    const cuenta = await cuentaActiva(page, 'Proveedor');
    const nueva = 'una-clave-nueva-y-larga';

    await page.goto('/#/sesion');
    await page.getByRole('link', { name: '¿Olvidó su contraseña?' }).click();
    await expect(page.getByRole('heading', { name: 'Recuperar la contraseña' })).toBeVisible();
    await page.getByLabel('Correo electrónico', { exact: true }).fill(cuenta.correo);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Vence en 15 minutos.',
    );

    const secreto = await secretoPublicado(cuenta.correo);
    await page.goto(`/#/restablecer/${encodeURIComponent(secreto)}`);
    await page.getByLabel('Contraseña nueva', { exact: true }).fill(nueva);
    await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
    await expect(page.getByRole('status')).toHaveText('Su contraseña fue restablecida. Inicie sesión con la nueva contraseña.');

    await iniciarSesion(page, cuenta);
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    await iniciarSesion(page, { correo: cuenta.correo, contrasena: nueva });
    await expect(page.getByRole('heading', { name: 'Panel del Proveedor' })).toBeVisible();

    const asientos = await consultar<{ accion: string }>(
      `SELECT b.accion FROM m9_administracion.bitacora b
         JOIN m2_seguridad.credenciales c ON c.id::text = b.recurso_id
        WHERE c.correo = $1 AND b.accion = 'CONTRASENA_RESTABLECIDA'`,
      [cuenta.correo],
    );
    expect(asientos).toHaveLength(1);
  });

  test('el enlace ya usado se rechaza y la interfaz ofrece pedir uno nuevo', async ({ page }) => {
    const cuenta = await cuentaActiva(page);
    await page.goto('/#/recuperacion');
    await page.getByLabel('Correo electrónico', { exact: true }).fill(cuenta.correo);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    const secreto = await secretoPublicado(cuenta.correo);

    for (const contrasena of ['primera-clave-nueva', 'segunda-clave-nueva']) {
      await page.goto('/#/');
      await page.goto(`/#/restablecer/${encodeURIComponent(secreto)}`);
      await page.getByLabel('Contraseña nueva', { exact: true }).fill(contrasena);
      await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
    }

    await expect(page.getByRole('alert')).toHaveText('El enlace venció o ya fue usado. Solicite uno nuevo.');
    await page.getByRole('link', { name: 'Solicitar un enlace nuevo' }).click();
    await expect(page.getByRole('heading', { name: 'Recuperar la contraseña' })).toBeVisible();
  });
});
