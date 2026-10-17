import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PaginaInicioSesion } from '../../src/paginas/PaginaInicioSesion';
import { ErrorApi } from '../../src/puertos/cliente-api';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('Página de inicio de sesión con el cliente de prueba (SYS-FN-04)', () => {
  it('inicia sesión, muestra el rol asignado y permite cerrarla', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PaginaInicioSesion />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'admin@abasteceni.com.ni');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-de-administrador');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Rol: Administrador');
    expect(cliente.llamadas[1]).toEqual({ operacion: 'iniciarSesion', datos: { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' } });

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('muestra el motivo del rechazo', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.sesion = new ErrorApi(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.' });
    render(<PaginaInicioSesion />, { wrapper: envolverCon(cliente) });

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'a@b.ni');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });
});
