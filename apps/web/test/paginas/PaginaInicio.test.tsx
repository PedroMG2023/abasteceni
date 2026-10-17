import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaginaInicio } from '../../src/paginas/PaginaInicio';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('PaginaInicio', () => {
  it('muestra el nombre de la plataforma y el estado del servicio', async () => {
    const Envoltura = envolverCon(new ClienteApiPrueba());
    render(<PaginaInicio />, { wrapper: Envoltura });

    expect(screen.getByRole('heading', { level: 1, name: 'AbasteceNi' })).toBeInTheDocument();
    expect(await screen.findByText('Estado del servicio: operativo')).toBeInTheDocument();
  });
});
