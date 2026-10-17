import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSalud } from '../../src/hooks/useSalud';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('useSalud con la implementación de prueba del puerto ClienteApi (AS-11)', () => {
  it('pasa de consultando a operativo cuando la API responde', async () => {
    const cliente = new ClienteApiPrueba();
    const { result } = renderHook(() => useSalud(), { wrapper: envolverCon(cliente) });

    expect(result.current).toBe('consultando');
    await waitFor(() => expect(result.current).toBe('operativo'));
    expect(cliente.llamadas.map((l) => l.operacion)).toEqual(['consultarSalud']);
  });

  it('informa sin respuesta cuando la API falla', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.salud = new Error('caída simulada');
    const { result } = renderHook(() => useSalud(), { wrapper: envolverCon(cliente) });

    await waitFor(() => expect(result.current).toBe('sin-respuesta'));
  });

  it('exige un proveedor del puerto', () => {
    expect(() => renderHook(() => useSalud())).toThrow(/requiere un ContextoClienteApi/);
  });
});
