import { ADMINISTRADOR, cuentaNueva, expect, iniciarSesion, llenarRegistro, test } from './soporte';

// Capturas del flujo de afiliación en un teléfono de gama media (RO-06) para el
// contraste con ISO 9241-110 del informe 2. Se guardan como evidencia derivada.
const DIRECTORIO = '../docs/evidencia/pruebas/experiencia/capturas';
test.use({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });

test('capturas del flujo de registro, validación y paneles (informe 2)', async ({ page }) => {
  const foto = (nombre: string, completa = true) => page.screenshot({ path: `${DIRECTORIO}/${nombre}.png`, fullPage: completa });

  await page.goto('/#/');
  await expect(page.getByText('Estado del servicio: operativo')).toBeVisible();
  await foto('01-inicio');

  await page.goto('/#/registro');
  await foto('02-registro-vacio');
  await page.getByRole('button', { name: 'Registrar cuenta' }).click();
  await expect(page.getByText('Indique el RUC.')).toBeVisible();
  await foto('03-registro-errores');

  const cuenta = cuentaNueva('Comprador');
  await llenarRegistro(page, { ...cuenta, ruc: '001-230456-0001A' });
  await page.getByRole('button', { name: 'Registrar cuenta' }).click();
  await foto('04-registro-ruc-con-guiones');
  await page.getByLabel('RUC', { exact: true }).fill(cuenta.ruc);
  await page.getByRole('button', { name: 'Registrar cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible();
  await foto('05-registro-confirmado');

  await iniciarSesion(page, cuenta);
  await expect(page.getByRole('alert')).toBeVisible();
  await foto('06-sesion-cuenta-pendiente');

  await iniciarSesion(page, ADMINISTRADOR);
  const solicitud = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: cuenta.razonSocial }) });
  await expect(solicitud).toBeVisible();
  await solicitud.getByRole('button', { name: 'Rechazar' }).click();
  await foto('07-panel-administrador-rechazo');
  await solicitud.getByRole('button', { name: 'Aprobar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Cuenta aprobada' })).toBeVisible();
  await foto('08-panel-administrador-aprobada', false);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await iniciarSesion(page, cuenta);
  await expect(page.getByRole('heading', { name: 'Panel del Comprador' })).toBeVisible();
  await foto('09-panel-comprador');
});

test('capturas de la recuperación de la contraseña (informe 2; SYS-FN-05, DIS-39)', async ({ page }) => {
  const foto = (nombre: string) => page.screenshot({ path: `${DIRECTORIO}/${nombre}.png`, fullPage: true });

  // El aviso es el mismo exista o no el correo (DIS-36), así que basta un correo cualquiera.
  await page.goto('/#/sesion');
  await page.getByRole('link', { name: '¿Olvidó su contraseña?' }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('compras@farmacia-ejemplo.ni');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await foto('10-recuperacion-aviso');

  await page.goto('/#/restablecer/enlace-de-ejemplo');
  await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
  await expect(page.getByText('Indique la contraseña.')).toBeVisible();
  await foto('11-restablecimiento-errores');

  await page.getByLabel('Contraseña nueva', { exact: true }).fill('una-clave-nueva-y-larga');
  await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
  await expect(page.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toBeVisible();
  await foto('12-restablecimiento-enlace-vencido');
});
