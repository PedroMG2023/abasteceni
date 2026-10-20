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
