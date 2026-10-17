import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSesion } from '../../src/hooks/useSesion';
import { ErrorApi } from '../../src/puertos/cliente-api';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

describe('Hook de sesión con el cliente de prueba (SYS-FN-04, ADR-04)', () => {
  it('recupera la sesión con la credencial de renovación al montarse', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.renovacion = { rol: 'Comprador', cuentaId: 'c-1' };
    const { result } = renderHook(() => useSesion(), { wrapper: envolverCon(cliente) });

    await waitFor(() => expect(result.current.identidad?.rol).toBe('Comprador'));
  });

  it('inicia sesión, expone el rol y la cierra', async () => {
    const cliente = new ClienteApiPrueba();
    const { result } = renderHook(() => useSesion(), { wrapper: envolverCon(cliente) });

    await act(() => result.current.iniciar({ correo: 'admin@abasteceni.com.ni', contrasena: 'clave' }));
    expect(result.current.identidad).toEqual({ rol: 'Administrador', cuentaId: null });

    await act(() => result.current.cerrar());
    expect(result.current.identidad).toBeNull();
    expect(cliente.llamadas.map((l) => l.operacion)).toEqual(['renovarSesion', 'iniciarSesion', 'cerrarSesion']);
  });

  it('muestra el mensaje de la API cuando la cuenta está pendiente (DIS-25) y uno genérico sin conexión', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.sesion = new ErrorApi(403, { codigo: 'CUENTA_PENDIENTE', mensaje: 'Su cuenta está pendiente de validación.' });
    const { result } = renderHook(() => useSesion(), { wrapper: envolverCon(cliente) });

    await act(() => result.current.iniciar({ correo: 'a@b.ni', contrasena: 'x' }));
    expect(result.current.aviso).toBe('Su cuenta está pendiente de validación.');

    cliente.sesion = new TypeError('Failed to fetch');
    await act(() => result.current.iniciar({ correo: 'a@b.ni', contrasena: 'x' }));
    expect(result.current.aviso).toBe('No se pudo contactar con el servicio. Intente de nuevo.');
  });
});
