import { CuentaComercial, EstadoCuenta, Ruc } from '../../../src/dominio/m1-usuarios';
import { solicitudValida } from '../datos';

describe('CT-REG-01 · invariantes de la cuenta comercial (SYS-FN-01, PA-05)', () => {
  it('una solicitud con todos los campos válidos no tiene infracciones y se registra «Pendiente de validación»', () => {
    const datos = solicitudValida();
    expect(CuentaComercial.validar(datos)).toEqual([]);

    const cuenta = CuentaComercial.registrar(datos, { id: 'c-1', ahora: new Date('2026-10-17T12:00:00Z') });

    expect(cuenta.estado).toBe(EstadoCuenta.PendienteDeValidacion);
    expect(cuenta.estado).toBe('Pendiente de validación');
    expect(cuenta.ruc.numero).toBe('J0310000000001');
    expect(cuenta.ubicacion).toEqual({ departamento: 'Chinandega', municipio: 'El Viejo' });
    expect(cuenta.registradaEn.toISOString()).toBe('2026-10-17T12:00:00.000Z');
  });

  it('rechaza el RUC vacío', () => {
    expect(CuentaComercial.validar(solicitudValida({ ruc: '   ' }))).toEqual([{ campo: 'ruc', motivo: 'obligatorio' }]);
  });

  it.each(['razonSocial', 'departamento', 'municipio', 'rubro', 'telefonoMovil', 'tipo'] as const)(
    'rechaza %s vacío como campo obligatorio',
    (campo) => {
      expect(CuentaComercial.validar(solicitudValida({ [campo]: '' }))).toEqual([{ campo, motivo: 'obligatorio' }]);
    },
  );

  it('informa todas las infracciones a la vez', () => {
    const detalles = CuentaComercial.validar({});
    expect(detalles.map((d) => d.campo)).toEqual(['tipo', 'razonSocial', 'departamento', 'municipio', 'rubro', 'ruc', 'telefonoMovil']);
  });

  it('rechaza un tipo de cuenta que no es Comprador, Proveedor ni Productor (DIS-17)', () => {
    expect(CuentaComercial.validar(solicitudValida({ tipo: 'Administrador' }))).toEqual([{ campo: 'tipo', motivo: 'valor' }]);
  });

  it('rechaza un teléfono que no está en formato E.164 (DIS-19)', () => {
    expect(CuentaComercial.validar(solicitudValida({ telefonoMovil: '88887777' }))).toEqual([{ campo: 'telefonoMovil', motivo: 'formato' }]);
  });

  it('rechaza textos que superan la longitud máxima del contrato', () => {
    expect(CuentaComercial.validar(solicitudValida({ razonSocial: 'x'.repeat(201) }))).toEqual([{ campo: 'razonSocial', motivo: 'longitud' }]);
  });

  it('normaliza el correo y recorta los espacios', () => {
    const cuenta = CuentaComercial.registrar(solicitudValida({ correo: ' Compras@Farmacia.NI ', razonSocial: '  Farmacia  ' }), {
      id: 'c-1',
      ahora: new Date(),
    });
    expect(cuenta.correo).toBe('compras@farmacia.ni');
    expect(cuenta.razonSocial).toBe('Farmacia');
  });
});

describe('Objeto valor RUC (MD-01; formato de DIS-21)', () => {
  it.each(['J0310000000001', '0012304560001A', ' j0310000000001 '])('acepta %s', (valor) => {
    expect(Ruc.esValido(valor)).toBe(true);
  });

  it.each(['J031000000000', '001-230456-0001A', '0012304560001', 'X0310000000001', 'J03100000000012'])('rechaza %s', (valor) => {
    expect(Ruc.esValido(valor)).toBe(false);
  });

  it('normaliza a mayúsculas y no admite construir un RUC inválido', () => {
    expect(Ruc.crear('0012304560001a').numero).toBe('0012304560001A');
    expect(() => Ruc.crear('123')).toThrow(RangeError);
  });
});
