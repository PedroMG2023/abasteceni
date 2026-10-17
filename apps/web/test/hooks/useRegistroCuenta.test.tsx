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

const PDF = new File(['%PDF-1.4'], 'registro.pdf', { type: 'application/pdf' });

function montar(cliente = new ClienteApiPrueba()) {
  const hook = renderHook(() => useRegistroCuenta(), { wrapper: envolverCon(cliente) });
  const llenar = (cambios: Partial<Record<keyof typeof VALIDOS, string>> = {}, adjuntos: { archivo?: File | null; consentimiento?: boolean } = {}) =>
    act(() => {
      for (const [campo, valor] of Object.entries({ ...VALIDOS, ...cambios })) hook.result.current.cambiar(campo as keyof typeof VALIDOS, valor);
      hook.result.current.elegirArchivo(adjuntos.archivo === undefined ? PDF : adjuntos.archivo);
      hook.result.current.aceptarConsentimiento(adjuntos.consentimiento ?? true);
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
    expect(result.current.aviso).toBe('Revise los datos marcados.');
    expect(result.current.rechazos).toBe(1);
  });

  it('CT-REG-01 · con todos los campos válidos envía la solicitud y queda «Pendiente de validación»', async () => {
    const { result, cliente, llenar } = montar();
    await llenar();

    await act(() => result.current.enviar());

    expect(cliente.llamadas).toEqual([{ operacion: 'registrarCuenta', datos: { ...VALIDOS, aceptaConsentimiento: true, registroLegal: PDF } }]);
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

describe('SYS-FN-02 y SYS-FN-36 · registro legal y consentimiento en el hook de registro', () => {
  it('exige el documento y la aceptación del consentimiento antes de enviar', async () => {
    const { result, cliente, llenar } = montar();
    await llenar({}, { archivo: null, consentimiento: false });

    await act(() => result.current.enviar());

    expect(cliente.llamadas).toEqual([]);
    expect(result.current.errores).toMatchObject({
      registroLegal: 'Adjunte el documento de registro legal (Cédula RUC o patente municipal).',
      aceptaConsentimiento: 'Debe aceptar la declaración de consentimiento para registrarse.',
    });
  });

  it('orienta sobre el formato y el tamaño del archivo (CT-REG-02)', async () => {
    const { result, llenar } = montar();
    await llenar({}, { archivo: new File(['x'], 'foto.png') });
    await act(() => result.current.enviar());
    expect(result.current.errores.registroLegal).toBe('Cargue el documento en formato PDF o JPG.');

    const grande = new File(['x'], 'registro.pdf');
    Object.defineProperty(grande, 'size', { value: 8 * 1024 * 1024 });
    await llenar({}, { archivo: grande });
    await act(() => result.current.enviar());
    expect(result.current.errores.registroLegal).toBe('El documento supera el tamaño máximo de 5 MB.');
  });

  it('muestra en el campo el rechazo del servidor por contenido o tamaño', async () => {
    const cliente = new ClienteApiPrueba();
    cliente.registro = new ErrorApi(413, { codigo: 'DOCUMENTO_DEMASIADO_GRANDE', mensaje: 'El documento supera el tamaño máximo de 5 MB.' });
    const { result, llenar } = montar(cliente);
    await llenar();
    await act(() => result.current.enviar());
    expect(result.current.errores.registroLegal).toBe('El documento supera el tamaño máximo de 5 MB.');

    cliente.registro = new ErrorApi(400, {
      codigo: 'SOLICITUD_INVALIDA',
      mensaje: 'Revise los datos marcados.',
      detalles: [{ campo: 'registroLegal', mensaje: 'Cargue el documento en formato PDF o JPG.' }],
    });
    await act(() => result.current.enviar());
    expect(result.current.errores.registroLegal).toBe('Cargue el documento en formato PDF o JPG.');
  });
});
