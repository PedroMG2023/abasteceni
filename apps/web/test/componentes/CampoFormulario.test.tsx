import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CampoFormulario } from '../../src/componentes/CampoFormulario';
import { longitud, obligatorio, patron, validar } from '../../src/componentes/validadores';

describe('AS-07 · campo de formulario con ayuda contextual y validadores por composición', () => {
  it('asocia la etiqueta, la ayuda y el error al control (WCAG 2.1, ISO 9241-110)', () => {
    render(
      <CampoFormulario
        definicion={{ nombre: 'ruc', etiqueta: 'RUC', ayuda: '14 caracteres sin guiones.' }}
        valor="123"
        error="El RUC debe tener 14 caracteres."
        alCambiar={() => undefined}
      />,
    );

    const control = screen.getByLabelText('RUC');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription('14 caracteres sin guiones. El RUC debe tener 14 caracteres.');
    expect(screen.getByRole('alert')).toHaveTextContent('El RUC debe tener 14 caracteres.');
  });

  it('sin error no marca el control como inválido', () => {
    render(<CampoFormulario definicion={{ nombre: 'rubro', etiqueta: 'Rubro' }} valor="" alCambiar={() => undefined} />);
    expect(screen.getByLabelText('Rubro')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('con opciones muestra una lista y notifica la elección', async () => {
    const alCambiar = vi.fn();
    render(<CampoFormulario definicion={{ nombre: 'tipo', etiqueta: 'Tipo', opciones: ['Comprador', 'Proveedor'] }} valor="" alCambiar={alCambiar} />);

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Proveedor');

    expect(alCambiar).toHaveBeenCalledWith('Proveedor');
  });

  it('los validadores se componen y devuelven el primer mensaje que aplica', () => {
    const reglas = [obligatorio('Obligatorio.'), patron(/^\d+$/, 'Solo dígitos.'), longitud(2, 3, 'Entre 2 y 3.')];
    expect(validar('', reglas)).toBe('Obligatorio.');
    expect(validar('a1', reglas)).toBe('Solo dígitos.');
    expect(validar('1234', reglas)).toBe('Entre 2 y 3.');
    expect(validar('12', reglas)).toBeNull();
  });
});
