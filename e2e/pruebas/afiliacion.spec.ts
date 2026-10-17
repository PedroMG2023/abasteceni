import { test, type Page } from '@playwright/test';
import { ADMINISTRADOR, consultar, cuentaNueva, expect, iniciarSesion, llenarRegistro, registrar, URL_BD_APP } from './soporte';

async function cerrarSesion(pagina: Page) {
  await pagina.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(pagina.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
}

async function decidir(pagina: Page, razonSocial: string, decision: 'Aprobar' | 'Rechazar', motivo?: string) {
  await iniciarSesion(pagina, ADMINISTRADOR);
  await expect(pagina.getByRole('heading', { name: 'Panel del Administrador de la plataforma' })).toBeVisible();
  const solicitud = pagina.getByRole('listitem').filter({ has: pagina.getByRole('heading', { name: razonSocial }) });
  await solicitud.getByRole('button', { name: decision }).click();
  if (decision === 'Rechazar') {
    await solicitud.getByLabel('Motivo del rechazo').fill(motivo ?? '');
    await solicitud.getByRole('button', { name: 'Confirmar rechazo' }).click();
  }
  await expect(pagina.getByRole('status').filter({ hasText: `Cuenta ${decision === 'Aprobar' ? 'aprobada' : 'rechazada'}: ${razonSocial}.` })).toBeVisible();
  await cerrarSesion(pagina);
}

const bitacora = (ruc: string) =>
  consultar<{ accion: string; detalle: Record<string, unknown> }>(
    `SELECT b.accion, b.detalle FROM m9_administracion.bitacora b
       JOIN m1_usuarios.cuentas_comerciales c ON c.id::text = b.recurso_id
      WHERE c.ruc = $1 ORDER BY b.registrado_en`,
    [ruc],
  );

test.describe('CT-REG-02 · carga del registro legal desde la interfaz (SYS-FN-02)', () => {
  test('rechaza un archivo de 8 MB y uno que no es PDF ni JPG, con mensajes explicativos', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta, { documento: { name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(8 * 1024 * 1024, 0x25) } });
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByText('El documento supera el tamaño máximo de 5 MB.')).toBeVisible();

    // Extensión .pdf con contenido que no es PDF: lo detecta el servidor por el contenido.
    await llenarRegistro(page, cuenta, { documento: { name: 'falso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ no es un PDF') } });
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByText('Cargue el documento en formato PDF o JPG.')).toBeVisible();
    expect(await consultar('SELECT 1 FROM m1_usuarios.cuentas_comerciales WHERE ruc = $1', [cuenta.ruc])).toEqual([]);
  });
});

test.describe('SYS-FN-36 · consentimiento en el registro', () => {
  test('sin aceptar la declaración no se registra; al aceptarla, consta en la bitácora', async ({ page }) => {
    const cuenta = cuentaNueva();
    await llenarRegistro(page, cuenta, { consentimiento: false });
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByText('Debe aceptar la declaración de consentimiento para registrarse.')).toBeVisible();

    await page.getByRole('checkbox', { name: /Ley No\. 787/ }).check();
    await page.getByRole('button', { name: 'Registrar cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible();
    expect((await bitacora(cuenta.ruc)).map((a) => a.accion)).toContain('CONSENTIMIENTO_ACEPTADO');
  });
});

test.describe('CT-ADM-03 e IT-02 · afiliación de extremo a extremo (PM-01; SYS-FN-03, SYS-FN-35)', () => {
  test('la cuenta se registra con su documento, el Administrador la aprueba y la cuenta inicia sesión en su panel', async ({ page }) => {
    const cuenta = cuentaNueva('Comprador');
    await registrar(page, cuenta);

    await decidir(page, cuenta.razonSocial, 'Aprobar');

    expect((await bitacora(cuenta.ruc)).map((a) => a.accion)).toEqual(
      expect.arrayContaining(['CUENTA_REGISTRADA', 'CONSENTIMIENTO_ACEPTADO', 'REGISTRO_LEGAL_CARGADO', 'CUENTA_APROBADA']),
    );
    await iniciarSesion(page, cuenta);
    await expect(page.getByRole('heading', { name: 'Panel del Comprador' })).toBeVisible();
  });

  test('el rechazo registra el motivo, la decisión no puede modificarse y la cuenta no inicia sesión', async ({ page }) => {
    const cuenta = cuentaNueva('Proveedor');
    await registrar(page, cuenta);

    await decidir(page, cuenta.razonSocial, 'Rechazar', 'El documento no corresponde al RUC indicado');

    const rechazo = (await bitacora(cuenta.ruc)).find((a) => a.accion === 'CUENTA_RECHAZADA');
    expect(rechazo?.detalle).toEqual({ resultado: 'Rechazada', justificacion: 'El documento no corresponde al RUC indicado' });
    await expect(
      consultar(`UPDATE m9_administracion.bitacora SET detalle = '{}' WHERE accion = 'CUENTA_RECHAZADA'`, [], URL_BD_APP),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(consultar(`DELETE FROM m9_administracion.bitacora WHERE accion = 'CUENTA_RECHAZADA'`, [], URL_BD_APP)).rejects.toMatchObject({
      code: '42501',
    });

    await iniciarSesion(page, cuenta);
    await expect(page.getByRole('alert')).toHaveText('Su solicitud de cuenta fue rechazada.');
  });
});

test.describe('CT-SEG-04 · el panel mostrado corresponde al rol asignado (SYS-FN-04)', () => {
  test('Productor y Proveedor aprobados ven el panel de su rol; el Administrador, el suyo', async ({ page }) => {
    for (const tipo of ['Productor', 'Proveedor'] as const) {
      const cuenta = cuentaNueva(tipo);
      await registrar(page, cuenta);
      await decidir(page, cuenta.razonSocial, 'Aprobar');
      await iniciarSesion(page, cuenta);
      await expect(page.getByRole('heading', { name: `Panel del ${tipo}` })).toBeVisible();
      await expect(page.getByText('Las funciones de este panel se habilitan en próximas iteraciones.')).toBeVisible();
      await cerrarSesion(page);
    }
    await iniciarSesion(page, ADMINISTRADOR);
    await expect(page.getByRole('heading', { name: 'Panel del Administrador de la plataforma' })).toBeVisible();
  });
});
