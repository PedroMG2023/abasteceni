import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaRegistro } from '../../src/paginas/PaginaRegistro';

// AS-04: el componente se prueba con el hook del caso de uso simulado.
const simulado = vi.hoisted(() => ({ estado: {} as Record<string, unknown> }));
vi.mock('../../src/hooks/useRegistroCuenta', () => ({ useRegistroCuenta: () => simulado.estado }));

const VACIOS = { tipo: '', razonSocial: '', ruc: '', departamento: '', municipio: '', rubro: '', telefonoMovil: '', correo: '', contrasena: '' };

beforeEach(() => {
  simulado.estado = {
    valores: VACIOS,
    errores: {},
    cambiar: vi.fn(),
    elegirArchivo: vi.fn(),
    consentimiento: false,
    aceptarConsentimiento: vi.fn(),
    enviar: vi.fn(),
    estado: 'editando',
    aviso: null,
    cuenta: null,
  };
});

describe('AS-04 · página de registro con el hook simulado (SYS-FN-01)', () => {

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

describe('Registro legal y consentimiento en la página de registro (SYS-FN-02, SYS-FN-36)', () => {
  it('presenta la carga del documento con su ayuda y la declaración de consentimiento de DIS-28', async () => {
    render(<PaginaRegistro />);

    const archivo = screen.getByLabelText('Registro legal (Cédula RUC o patente municipal)');
    expect(archivo).toHaveAccessibleDescription('PDF o JPG, máximo 5 MB.');
    const pdf = new File(['%PDF'], 'r.pdf', { type: 'application/pdf' });
    await userEvent.upload(archivo, pdf);
    expect(simulado.estado.elegirArchivo).toHaveBeenCalledWith(pdf);

    const casilla = screen.getByRole('checkbox', { name: /Ley No\. 787/ });
    expect(casilla).toHaveAccessibleName(expect.stringContaining('Microsoft Azure fuera de Nicaragua'));
    await userEvent.click(casilla);
    expect(simulado.estado.aceptarConsentimiento).toHaveBeenCalledWith(true);
  });
});
