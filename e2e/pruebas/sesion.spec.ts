import { ADMINISTRADOR, consultar, cuentaActiva, cuentaNueva, expect, iniciarSesion, llenarRegistro, registrar, test } from './soporte';

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

test.describe('CT-SEG-07 · bloqueo temporal tras 5 intentos fallidos (SYS-FN-07, DIS-34)', () => {
  test('el quinto intento fallido bloquea la cuenta y el trabajador avisa al correo registrado', async ({ page }) => {
    const cuenta = cuentaNueva('Proveedor');
    await registrar(page, cuenta);

    for (let i = 1; i <= 4; i++) {
      await iniciarSesion(page, { correo: cuenta.correo, contrasena: `clave-equivocada-${i}` });
      await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    }
    await iniciarSesion(page, { correo: cuenta.correo, contrasena: 'clave-equivocada-5' });
    await expect(page.getByRole('alert')).toHaveText('Su cuenta está bloqueada temporalmente por intentos fallidos. Intente de nuevo en 15 minutos.');

    await expect
      .poll(async () => {
        const [fila] = await consultar<{ publicado: boolean }>(
          `SELECT publicado_en IS NOT NULL AS publicado FROM plataforma.bandeja_salida
            WHERE tipo = 'CuentaBloqueada' AND datos->>'correo' = $1`,
          [cuenta.correo],
        );
        return fila?.publicado ?? false;
      }, { timeout: 30_000 })
      .toBe(true);
  });
});

test.describe('CT-SEG-08 · máximo dos dispositivos por cuenta comercial (SYS-FN-08, DIS-37)', () => {
  test('al iniciar sesión en tres dispositivos, la primera sesión queda invalidada y las otras dos siguen activas', async ({ page, browser }, informacion) => {
    const cuenta = await cuentaActiva(page, 'Productor');
    // Cada contexto de navegador es un dispositivo, con su propia cookie de renovación.
    const dispositivos = [];
    for (let i = 0; i < 3; i++) {
      const contexto = await browser.newContext({ baseURL: informacion.project.use.baseURL, locale: 'es-NI' });
      const pagina = await contexto.newPage();
      await iniciarSesion(pagina, cuenta);
      await expect(pagina.getByRole('heading', { name: 'Panel del Productor' })).toBeVisible();
      dispositivos.push({ contexto, pagina });
    }
    const [primero, ...demas] = dispositivos;

    await primero.pagina.reload();
    await expect(primero.pagina.getByRole('alert')).toHaveText('Su sesión se cerró porque la cuenta inició sesión en otro dispositivo.');
    await expect(primero.pagina.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    for (const { pagina } of demas) {
      await pagina.reload();
      await expect(pagina.getByRole('heading', { name: 'Panel del Productor' })).toBeVisible();
    }
    for (const { contexto } of dispositivos) await contexto.close();
  });
});
