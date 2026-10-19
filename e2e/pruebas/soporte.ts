import { expect, type Page } from '@playwright/test';
import { Client } from 'pg';

// Datos del entorno de sistema: los mismos que recibe docker-compose.sistema.yml.
export const ADMINISTRADOR = {
  correo: process.env.CORREO_ADMINISTRADOR ?? '',
  contrasena: process.env.CONTRASENA_ADMINISTRADOR ?? '',
};

const URL_BD = `postgresql://abasteceni_propietario:${process.env.CLAVE_PROPIETARIO_BD ?? ''}@127.0.0.1:55432/abasteceni`;
// Conexión con el rol de la aplicación, para comprobar la inmutabilidad de la bitácora (ADR-05).
export const URL_BD_APP = `postgresql://abasteceni_app:${process.env.CLAVE_APP_BD ?? ''}@127.0.0.1:55432/abasteceni`;

// RUC y correo únicos por ejecución para que las pruebas puedan repetirse.
let contador = 0;
export function cuentaNueva(tipo: 'Comprador' | 'Proveedor' | 'Productor' = 'Comprador') {
  contador += 1;
  const n = `${String(Date.now()).slice(-10)}${String(contador).padStart(3, '0')}`;
  return {
    tipo,
    razonSocial: `Comercio ${n}`,
    ruc: `J${n}`,
    departamento: 'Chinandega',
    municipio: 'El Viejo',
    rubro: 'Farmacia',
    telefonoMovil: '+50588887777',
    correo: `farmacia${n}@sistema.ni`,
    contrasena: 'una-clave-de-doce',
  };
}

// Documento de registro legal mínimo reconocible por su contenido (SYS-FN-02).
export const PDF_REGISTRO = { name: 'cedula-ruc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') };

export async function llenarRegistro(
  pagina: Page,
  cuenta: ReturnType<typeof cuentaNueva>,
  adjuntos: { documento?: typeof PDF_REGISTRO | null; consentimiento?: boolean } = {},
) {
  // Pasar por el inicio garantiza un formulario nuevo aunque ya se estuviera en #/registro.
  await pagina.goto('/#/');
  await pagina.goto('/#/registro');
  await pagina.getByLabel('Tipo de cuenta', { exact: true }).selectOption(cuenta.tipo);
  await pagina.getByLabel('Razón social', { exact: true }).fill(cuenta.razonSocial);
  await pagina.getByLabel('RUC', { exact: true }).fill(cuenta.ruc);
  await pagina.getByLabel('Departamento', { exact: true }).fill(cuenta.departamento);
  await pagina.getByLabel('Municipio', { exact: true }).fill(cuenta.municipio);
  await pagina.getByLabel('Rubro comercial', { exact: true }).fill(cuenta.rubro);
  await pagina.getByLabel('Teléfono móvil', { exact: true }).fill(cuenta.telefonoMovil);
  await pagina.getByLabel('Correo electrónico', { exact: true }).fill(cuenta.correo);
  await pagina.getByLabel('Contraseña', { exact: true }).fill(cuenta.contrasena);
  const documento = adjuntos.documento === undefined ? PDF_REGISTRO : adjuntos.documento;
  if (documento) await pagina.getByLabel('Registro legal (Cédula RUC o patente municipal)', { exact: true }).setInputFiles(documento);
  if (adjuntos.consentimiento ?? true) await pagina.getByRole('checkbox', { name: /Ley No\. 787/ }).check();
}

export async function registrar(pagina: Page, cuenta: ReturnType<typeof cuentaNueva>) {
  await llenarRegistro(pagina, cuenta);
  await pagina.getByRole('button', { name: 'Registrar cuenta' }).click();
  await expect(pagina.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible();
}

export async function iniciarSesion(pagina: Page, datos: { correo: string; contrasena: string }) {
  await pagina.goto('/#/sesion');
  await pagina.getByLabel('Correo electrónico', { exact: true }).fill(datos.correo);
  await pagina.getByLabel('Contraseña', { exact: true }).fill(datos.contrasena);
  await pagina.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export async function cerrarSesion(pagina: Page) {
  await pagina.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(pagina.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
}

// Decisión del Administrador desde su panel (SYS-FN-03).
export async function decidir(pagina: Page, razonSocial: string, decision: 'Aprobar' | 'Rechazar', motivo?: string) {
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

// Cuenta comercial registrada y aprobada, lista para iniciar sesión.
export async function cuentaActiva(pagina: Page, tipo: 'Comprador' | 'Proveedor' | 'Productor' = 'Comprador') {
  const cuenta = cuentaNueva(tipo);
  await registrar(pagina, cuenta);
  await decidir(pagina, cuenta.razonSocial, 'Aprobar');
  return cuenta;
}

export async function consultar<T extends Record<string, unknown>>(texto: string, valores: unknown[] = [], url = URL_BD): Promise<T[]> {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

export { expect };
