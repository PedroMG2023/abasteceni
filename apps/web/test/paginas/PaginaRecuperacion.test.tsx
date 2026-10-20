import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PaginaRecuperacion } from '../../src/paginas/PaginaRecuperacion';
import { PaginaRestablecimiento } from '../../src/paginas/PaginaRestablecimiento';
import { ErrorApi } from '../../src/puertos/cliente-api';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

const AVISO_SOLICITUD = 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Vence en 15 minutos.';

describe('CT-SEG-05 · solicitud del enlace de recuperación (SYS-FN-05, DIS-36)', () => {
  it('envía el correo y muestra el aviso neutral de la API', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PaginaRecuperacion />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'compras@farmacia.ni');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_SOLICITUD);
    expect(cliente.llamadas).toEqual([{ operacion: 'solicitarRecuperacion', datos: 'compras@farmacia.ni' }]);
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '#/sesion');
  });

  it('valida el correo en el navegador, lleva el foco al campo y no llama a la API', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PaginaRecuperacion />, { wrapper: envolverCon(cliente) });

    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Indique el correo electrónico.');
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
    expect(cliente.llamadas).toEqual([]);
  });

  it('muestra el error de campo que devuelve la API y el de conexión', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.recuperacion = new ErrorApi(400, {
      codigo: 'SOLICITUD_INVALIDA',
      mensaje: 'Revise los datos marcados.',
      detalles: [{ campo: 'correo', mensaje: 'Escriba un correo electrónico válido, por ejemplo nombre@empresa.com.' }],
    });
    render(<PaginaRecuperacion />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'a@b.ni');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escriba un correo electrónico válido');

    cliente.recuperacion = new TypeError('sin red');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText('No se pudo contactar con el servicio. Intente de nuevo.')).toBeInTheDocument();
  });
});

describe('CT-SEG-05 · restablecimiento con el secreto del enlace (SYS-FN-05, DIS-36)', () => {
  it('envía el secreto con la contraseña nueva y ofrece iniciar sesión', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PaginaRestablecimiento secreto="secreto-del-enlace" />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'una-clave-nueva-y-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la contraseña' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Su contraseña fue restablecida. Inicie sesión con la nueva contraseña.');
    expect(cliente.llamadas).toEqual([
      { operacion: 'restablecerContrasena', datos: { secreto: 'secreto-del-enlace', contrasena: 'una-clave-nueva-y-larga' } },
    ]);
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '#/sesion');
  });

  it('exige de 12 a 128 caracteres antes de enviar (DIS-22)', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PaginaRestablecimiento secreto="s" />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'corta');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña debe tener entre 12 y 128 caracteres.');
    expect(screen.getByLabelText('Contraseña nueva')).toHaveFocus();
    expect(cliente.llamadas).toEqual([]);
  });

  it('con el enlace vencido muestra el mensaje de la API y ofrece pedir uno nuevo', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.restablecimiento = new ErrorApi(410, { codigo: 'ENLACE_VENCIDO', mensaje: 'El enlace venció o ya fue usado. Solicite uno nuevo.' });
    render(<PaginaRestablecimiento secreto="vencido" />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'una-clave-nueva-y-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace venció o ya fue usado. Solicite uno nuevo.');
    expect(screen.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toHaveAttribute('href', '#/recuperacion');
  });
});
