import { expect, type Page } from '@playwright/test';
import { Client } from 'pg';

// Datos del entorno de sistema: los mismos que recibe docker-compose.sistema.yml.
export const ADMINISTRADOR = {
  correo: process.env.CORREO_ADMINISTRADOR ?? '',
  contrasena: process.env.CONTRASENA_ADMINISTRADOR ?? '',
};

const URL_BD = `postgresql://abasteceni_propietario:${process.env.CLAVE_PROPIETARIO_BD ?? ''}@127.0.0.1:55432/abasteceni`;

// RUC y correo únicos por ejecución para que las pruebas puedan repetirse.
export function cuentaNueva() {
  const n = String(Date.now()).slice(-12).padStart(13, '0');
  return {
    tipo: 'Comprador',
    razonSocial: 'Farmacia del Escenario A',
    ruc: `J${n}`,
    departamento: 'Chinandega',
    municipio: 'El Viejo',
    rubro: 'Farmacia',
    telefonoMovil: '+50588887777',
    correo: `farmacia${n}@sistema.ni`,
    contrasena: 'una-clave-de-doce',
  };
}

export async function llenarRegistro(pagina: Page, cuenta: ReturnType<typeof cuentaNueva>) {
  // Pasar por el inicio garantiza un formulario nuevo aunque ya se estuviera en #/registro.
  await pagina.goto('/#/');
  await pagina.goto('/#/registro');
  await pagina.getByLabel('Tipo de cuenta').selectOption(cuenta.tipo);
  await pagina.getByLabel('Razón social').fill(cuenta.razonSocial);
  await pagina.getByLabel('RUC').fill(cuenta.ruc);
  await pagina.getByLabel('Departamento').fill(cuenta.departamento);
  await pagina.getByLabel('Municipio').fill(cuenta.municipio);
  await pagina.getByLabel('Rubro comercial').fill(cuenta.rubro);
  await pagina.getByLabel('Teléfono móvil').fill(cuenta.telefonoMovil);
  await pagina.getByLabel('Correo electrónico').fill(cuenta.correo);
  await pagina.getByLabel('Contraseña').fill(cuenta.contrasena);
}

export async function iniciarSesion(pagina: Page, datos: { correo: string; contrasena: string }) {
  await pagina.goto('/#/sesion');
  await pagina.getByLabel('Correo electrónico').fill(datos.correo);
  await pagina.getByLabel('Contraseña').fill(datos.contrasena);
  await pagina.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export async function consultar<T extends Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: URL_BD });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

export { expect };
