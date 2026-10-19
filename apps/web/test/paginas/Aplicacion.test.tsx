import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Aplicacion } from '../../src/paginas/Aplicacion';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('Navegación de la interfaz', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('muestra la página que indica el fragmento de la dirección', async () => {
    render(<Aplicacion />, { wrapper: envolverCon(new ClienteApiPrueba()) });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AbasteceNi');

    await act(async () => {
      window.location.hash = '#/registro';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Registrar una cuenta comercial');

    await act(async () => {
      window.location.hash = '#/sesion';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Iniciar sesión');
  });

  it('SYS-FN-05 · lleva a la recuperación y abre el restablecimiento con el secreto del enlace', async () => {
    const cliente = new ClienteApiPrueba();
    render(<Aplicacion />, { wrapper: envolverCon(cliente) });

    await act(async () => {
      window.location.hash = '#/recuperacion';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Recuperar la contraseña');

    await act(async () => {
      window.location.hash = '#/restablecer/secreto%2Fdel-enlace';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Restablecer la contraseña');
  });
});
