import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRegistroCuenta } from '../../src/hooks/useRegistroCuenta';
import { ErrorApi } from '../../src/puertos/cliente-api';
import { ClienteApiPrueba } from '../dobles/cliente-api-prueba';
import { envolverCon } from '../dobles/envoltura';

const VALIDOS = {
  tipo: 'Comprador',
  razonSocial: 'Farmacia San Benito',
  ruc: 'J0310000000001',
  departamento: 'Chinandega',
  municipio: 'El Viejo',
  rubro: 'Farmacia',
  telefonoMovil: '+50588887777',
  correo: 'compras@farmacia.ni',
  contrasena: 'una-clave-de-doce',
} as const;

function montar(cliente = new ClienteApiPrueba()) {
  const hook = renderHook(() => useRegistroCuenta(), { wrapper: envolverCon(cliente) });
  const llenar = (cambios: Partial<Record<keyof typeof VALIDOS, string>> = {}) =>
    act(() => {
      for (const [campo, valor] of Object.entries({ ...VALIDOS, ...cambios })) hook.result.current.cambiar(campo as keyof typeof VALIDOS, valor);
    });
  return { ...hook, cliente, llenar };
}

describe('AS-04 · hook del caso de uso «registrar cuenta» con el cliente de prueba (SYS-FN-01)', () => {
  it('CT-REG-01 · con el RUC vacío no envía y muestra el mensaje de error del campo', async () => {
    const { result, cliente, llenar } = montar();
    await llenar({ ruc: '' });

    await act(() => result.current.enviar());

    expect(cliente.llamadas).toEqual([]);
    expect(result.current.errores.ruc).toBe('Indique el RUC.');
    expect(result.current.estado).toBe('editando');
  });

  it('CT-REG-01 · con todos los campos válidos envía la solicitud y queda «Pendiente de validación»', async () => {
    const { result, cliente, llenar } = montar();
    await llenar();

    await act(() => result.current.enviar());

    expect(cliente.llamadas).toEqual([{ operacion: 'registrarCuenta', datos: VALIDOS }]);
    expect(result.current.estado).toBe('registrada');
    expect(result.current.cuenta?.estado).toBe('Pendiente de validación');
  });

  it('valida el formato antes de enviar (DIS-19, DIS-21, DIS-22)', async () => {
    const { result, llenar } = montar();
    await llenar({ ruc: '001-230456-0001A', telefonoMovil: '88887777', contrasena: 'corta' });

    await act(() => result.current.enviar());

    expect(result.current.errores).toMatchObject({
      ruc: 'El RUC debe tener 14 caracteres: «J» y 13 dígitos, o 13 dígitos y una letra, sin guiones.',
      telefonoMovil: 'Escriba el teléfono móvil con el código de país, por ejemplo +50588887777.',
      contrasena: 'La contraseña debe tener entre 12 y 128 caracteres.',
    });
  });

  it('muestra los errores por campo y el mensaje general que devuelve la API', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.registro = new ErrorApi(409, { codigo: 'RUC_REGISTRADO', mensaje: 'Ya existe una cuenta registrada con ese RUC.' });
    const { result, llenar } = montar(cliente);
    await llenar();
    await act(() => result.current.enviar());
    expect(result.current.aviso).toBe('Ya existe una cuenta registrada con ese RUC.');

    cliente.registro = new ErrorApi(400, { codigo: 'SOLICITUD_INVALIDA', mensaje: 'Revise los datos marcados.', detalles: [{ campo: 'rubro', mensaje: 'Indique el rubro comercial.' }] });
    await act(() => result.current.enviar());
    expect(result.current.errores.rubro).toBe('Indique el rubro comercial.');
  });

  it('avisa si no hay conexión con el servicio', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.registro = new TypeError('Failed to fetch');
    const { result, llenar } = montar(cliente);
    await llenar();

    await act(() => result.current.enviar());

    expect(result.current.aviso).toBe('No se pudo enviar la solicitud. Revise su conexión e intente de nuevo.');
  });
});
