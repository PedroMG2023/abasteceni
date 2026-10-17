import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PanelAdministrador } from '../../src/paginas/PanelAdministrador';
import { PanelCuenta } from '../../src/paginas/PanelCuenta';
import { ErrorApi } from '../../src/puertos/cliente-api';
import { ClienteApiPrueba, CUENTA_PENDIENTE } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('CT-ADM-03 · panel del Administrador con el cliente de prueba (SYS-FN-03; DIS-31)', () => {
  it('lista las solicitudes pendientes y aprueba una', async () => {
    const cliente = new ClienteApiPrueba();
    render(<PanelAdministrador />, { wrapper: envolverCon(cliente) });

    expect(await screen.findByRole('heading', { name: 'Farmacia San Benito' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta aprobada: Farmacia San Benito.');
    expect(cliente.llamadas).toContainEqual({ operacion: 'validarCuenta', datos: { id: CUENTA_PENDIENTE.id, decision: 'aprobar' } });
    expect(screen.queryByRole('heading', { name: 'Farmacia San Benito' })).toBeNull();
    expect(screen.getByText('No hay solicitudes pendientes de validación.')).toBeInTheDocument();
  });

  it('rechaza con el motivo escrito y muestra el error de la API si falta', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.validacion = new ErrorApi(400, {
      codigo: 'SOLICITUD_INVALIDA',
      mensaje: 'Revise los datos marcados.',
      detalles: [{ campo: 'justificacion', mensaje: 'Indique el motivo del rechazo.' }],
    });
    render(<PanelAdministrador />, { wrapper: envolverCon(cliente) });

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Indique el motivo del rechazo.');

    cliente.validacion = null;
    await userEvent.type(screen.getByLabelText('Motivo del rechazo'), 'Documento ilegible');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta rechazada: Farmacia San Benito.');
    expect(cliente.llamadas).toContainEqual({
      operacion: 'validarCuenta',
      datos: { id: CUENTA_PENDIENTE.id, decision: 'rechazar', justificacion: 'Documento ilegible' },
    });
  });

  it('abre el documento de registro legal de la cuenta', async () => {
    const cliente = new ClienteApiPrueba();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    URL.createObjectURL = vi.fn(() => 'blob:documento');
    render(<PanelAdministrador />, { wrapper: envolverCon(cliente) });

    await userEvent.click(await screen.findByRole('button', { name: 'Ver documento' }));

    expect(abrir).toHaveBeenCalledWith('blob:documento', '_blank', 'noopener');
    cliente.documento = new Error('sin acceso');
    await userEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo abrir el documento de registro legal.');
  });

  it('informa si no puede cargar las solicitudes', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.cuentas = new TypeError('Failed to fetch');
    render(<PanelAdministrador />, { wrapper: envolverCon(cliente) });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo contactar con el servicio. Intente de nuevo.');
  });
});

describe('CT-SEG-04 · panel de las cuentas comerciales (DIS-31)', () => {
  it.each(['Comprador', 'Proveedor', 'Productor'] as const)('el panel del %s lleva su rol', (rol) => {
    render(<PanelCuenta rol={rol} />);
    expect(screen.getByRole('heading', { name: `Panel del ${rol}` })).toBeInTheDocument();
    expect(screen.getByText('Las funciones de este panel se habilitan en próximas iteraciones.')).toBeInTheDocument();
  });
});
