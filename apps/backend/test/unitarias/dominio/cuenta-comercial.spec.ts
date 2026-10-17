import {
  comprobarRegistroLegal,
  CuentaComercial,
  EstadoCuenta,
  Ruc,
  siguienteEstado,
  TAMANO_MAXIMO_REGISTRO_LEGAL,
  tipoPorContenido,
} from '../../../src/dominio/m1-usuarios';
import { ErrorTransicion, ErrorValidacion } from '../../../src/dominio/puertos';
import { JPEG_MINIMO, REGISTRO_LEGAL, solicitudValida } from '../datos';

describe('CT-REG-01 · invariantes de la cuenta comercial (SYS-FN-01, PA-05)', () => {
  it('una solicitud con todos los campos válidos no tiene infracciones y se registra «Pendiente de validación»', () => {
    const datos = solicitudValida();
    expect(CuentaComercial.comprobarDatos(datos)).toEqual([]);

    const cuenta = CuentaComercial.registrar(datos, { id: 'c-1', ahora: new Date('2026-10-17T12:00:00Z'), registroLegal: REGISTRO_LEGAL });

    expect(cuenta.estado).toBe(EstadoCuenta.PendienteDeValidacion);
    expect(cuenta.estado).toBe('Pendiente de validación');
    expect(cuenta.ruc.numero).toBe('J0310000000001');
    expect(cuenta.ubicacion).toEqual({ departamento: 'Chinandega', municipio: 'El Viejo' });
    expect(cuenta.registradaEn.toISOString()).toBe('2026-10-17T12:00:00.000Z');
  });

  it('rechaza el RUC vacío', () => {
    expect(CuentaComercial.comprobarDatos(solicitudValida({ ruc: '   ' }))).toEqual([{ campo: 'ruc', motivo: 'obligatorio' }]);
  });

  it.each(['razonSocial', 'departamento', 'municipio', 'rubro', 'telefonoMovil', 'tipo'] as const)(
    'rechaza %s vacío como campo obligatorio',
    (campo) => {
      expect(CuentaComercial.comprobarDatos(solicitudValida({ [campo]: '' }))).toEqual([{ campo, motivo: 'obligatorio' }]);
    },
  );

  it('informa todas las infracciones a la vez', () => {
    const detalles = CuentaComercial.comprobarDatos({});
    expect(detalles.map((d) => d.campo)).toEqual([
      'tipo',
      'razonSocial',
      'departamento',
      'municipio',
      'rubro',
      'ruc',
      'telefonoMovil',
      'registroLegal',
      'aceptaConsentimiento',
    ]);
  });

  it('rechaza un tipo de cuenta que no es Comprador, Proveedor ni Productor (DIS-17)', () => {
    expect(CuentaComercial.comprobarDatos(solicitudValida({ tipo: 'Administrador' }))).toEqual([{ campo: 'tipo', motivo: 'valor' }]);
  });

  it('rechaza un teléfono que no está en formato E.164 (DIS-19)', () => {
    expect(CuentaComercial.comprobarDatos(solicitudValida({ telefonoMovil: '88887777' }))).toEqual([{ campo: 'telefonoMovil', motivo: 'formato' }]);
  });

  it('rechaza textos que superan la longitud máxima del contrato', () => {
    expect(CuentaComercial.comprobarDatos(solicitudValida({ razonSocial: 'x'.repeat(201) }))).toEqual([{ campo: 'razonSocial', motivo: 'longitud' }]);
  });

  it('normaliza el correo y recorta los espacios', () => {
    const cuenta = CuentaComercial.registrar(solicitudValida({ correo: ' Compras@Farmacia.NI ', razonSocial: '  Farmacia  ' }), {
      id: 'c-1',
      ahora: new Date(),
      registroLegal: REGISTRO_LEGAL,
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

describe('CT-REG-02 · registro legal en PDF o JPG de hasta 5 MB, tipo comprobado por contenido (SYS-FN-02, DIS-29)', () => {
  it('acepta un PDF de 4 MB y un JPG', () => {
    const pdf4mb = new Uint8Array(4 * 1024 * 1024);
    pdf4mb.set(new TextEncoder().encode('%PDF-1.7'));
    expect(comprobarRegistroLegal(pdf4mb)).toEqual([]);
    expect(tipoPorContenido(pdf4mb)).toBe('application/pdf');
    expect(tipoPorContenido(JPEG_MINIMO)).toBe('image/jpeg');
  });

  it('rechaza un archivo de 8 MB, uno vacío y uno cuyo contenido no es PDF ni JPG', () => {
    const grande = new Uint8Array(8 * 1024 * 1024);
    grande.set(new TextEncoder().encode('%PDF-1.7'));
    expect(comprobarRegistroLegal(grande)).toEqual([{ campo: 'registroLegal', motivo: 'longitud' }]);
    expect(comprobarRegistroLegal(new Uint8Array())).toEqual([{ campo: 'registroLegal', motivo: 'obligatorio' }]);
    const disfrazado = new TextEncoder().encode('MZ ejecutable con extensión .pdf');
    expect(comprobarRegistroLegal(disfrazado)).toEqual([{ campo: 'registroLegal', motivo: 'formato' }]);
    expect(TAMANO_MAXIMO_REGISTRO_LEGAL).toBe(5 * 1024 * 1024);
  });
});

describe('SYS-FN-36 · consentimiento obligatorio para registrarse', () => {
  it('sin aceptación expresa no se admite el registro', () => {
    expect(CuentaComercial.comprobarDatos(solicitudValida({ aceptaConsentimiento: false }))).toEqual([{ campo: 'aceptaConsentimiento', motivo: 'obligatorio' }]);
  });

  it('la cuenta conserva la marca temporal de la aceptación (atributo consentimiento de MD-01)', () => {
    const ahora = new Date('2026-10-17T12:00:00Z');
    const cuenta = CuentaComercial.registrar(solicitudValida(), { id: 'c-1', ahora, registroLegal: REGISTRO_LEGAL });
    expect(cuenta.consentimientoAceptadoEn).toEqual(ahora);
    expect(cuenta.registroLegal).toEqual(REGISTRO_LEGAL);
  });
});

describe('AS-01 · máquina de estados de la cuenta comercial (SYS-FN-03, DIS-23)', () => {
  const pendiente = () => CuentaComercial.registrar(solicitudValida(), { id: 'c-1', ahora: new Date(), registroLegal: REGISTRO_LEGAL });

  it('una cuenta pendiente se aprueba a «Activa» o se rechaza a «Rechazada» con justificación', () => {
    expect(pendiente().validar('aprobar').estado).toBe('Activa');
    expect(pendiente().validar('rechazar', 'Documento ilegible').estado).toBe('Rechazada');
  });

  it('el rechazo sin justificación se rechaza', () => {
    expect(() => pendiente().validar('rechazar', '  ')).toThrow(new ErrorValidacion([{ campo: 'justificacion', motivo: 'obligatorio' }]));
  });

  it.each([
    ['Activa', 'aprobar'],
    ['Activa', 'rechazar'],
    ['Rechazada', 'aprobar'],
    ['Rechazada', 'rechazar'],
  ] as const)('una transición no prevista desde «%s» con «%s» es rechazada', (estado, decision) => {
    const cuenta = estado === 'Activa' ? pendiente().validar('aprobar') : pendiente().validar('rechazar', 'motivo');
    expect(() => cuenta.validar(decision, 'motivo')).toThrow(ErrorTransicion);
    expect(siguienteEstado(estado, decision)).toBeNull();
  });

  it('la validación no altera la cuenta original', () => {
    const original = pendiente();
    original.validar('aprobar');
    expect(original.estado).toBe('Pendiente de validación');
  });
});
