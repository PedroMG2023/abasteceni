import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaRegistro } from '../../src/paginas/PaginaRegistro';

// AS-04: el componente se prueba con el hook del caso de uso simulado.
const simulado = vi.hoisted(() => ({ estado: {} as Record<string, unknown> }));
vi.mock('../../src/hooks/useRegistroCuenta', () => ({ useRegistroCuenta: () => simulado.estado }));

const VACIOS = { tipo: '', razonSocial: '', ruc: '', departamento: '', municipio: '', rubro: '', telefonoMovil: '', correo: '', contrasena: '' };

describe('AS-04 · página de registro con el hook simulado (SYS-FN-01)', () => {
  beforeEach(() => {
    simulado.estado = { valores: VACIOS, errores: {}, cambiar: vi.fn(), enviar: vi.fn(), estado: 'editando', aviso: null, cuenta: null };
  });

  it('presenta los nueve campos con su ayuda contextual (SYS-NFN-11)', () => {
    render(<PaginaRegistro />);

    for (const etiqueta of ['Tipo de cuenta', 'Razón social', 'RUC', 'Departamento', 'Municipio', 'Rubro comercial', 'Teléfono móvil', 'Correo electrónico', 'Contraseña']) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('RUC')).toHaveAccessibleDescription(/14 caracteres sin guiones/);
  });

  it('delega la escritura y el envío en el hook', async () => {
    render(<PaginaRegistro />);

    await userEvent.type(screen.getByLabelText('Rubro comercial'), 'F');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cuenta' }));

    expect(simulado.estado.cambiar).toHaveBeenCalledWith('rubro', 'F');
    expect(simulado.estado.enviar).toHaveBeenCalledTimes(1);
  });

  it('muestra los errores del hook y el aviso general', () => {
    simulado.estado = { ...simulado.estado, errores: { ruc: 'Indique el RUC.' }, aviso: 'Revise los datos marcados.' };
    render(<PaginaRegistro />);

    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(['Revise los datos marcados.', 'Indique el RUC.']);
  });

  it('confirma el registro con el estado de la cuenta', () => {
    simulado.estado = { ...simulado.estado, estado: 'registrada', cuenta: { id: 'x', estado: 'Pendiente de validación' } };
    render(<PaginaRegistro />);

    expect(screen.getByRole('status')).toHaveTextContent('Su cuenta quedó en estado «Pendiente de validación».');
  });
});
