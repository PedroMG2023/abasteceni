import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { mensajeCampo } from '../../../src/aplicacion/transversal/mensajes';
import { RegistroPeticionesInterceptor } from '../../../src/aplicacion/transversal/registro-peticiones.interceptor';
import { crearTuberiaValidacion } from '../../../src/aplicacion/transversal/validacion';
import { ErrorValidacion } from '../../../src/dominio/puertos';
import { causaFallo } from '../../../src/infraestructura/bandeja-salida/bandeja-salida';
import { comoTransaccionMemoria } from '../../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import type { Transaccion } from '../../../src/dominio/puertos';

describe('Catálogo de mensajes de la API (DIS-26)', () => {
  it('construye mensajes específicos para los campos conocidos', () => {
    expect(mensajeCampo({ campo: 'ruc', motivo: 'obligatorio' })).toBe('Indique el RUC.');
    expect(mensajeCampo({ campo: 'telefonoMovil', motivo: 'formato' })).toBe('Escriba el teléfono móvil con el código de país, por ejemplo +50588887777.');
    expect(mensajeCampo({ campo: 'contrasena', motivo: 'longitud' })).toBe('La contraseña debe tener entre 12 y 128 caracteres.');
    expect(mensajeCampo({ campo: 'tipo', motivo: 'valor' })).toBe('Elija Comprador, Proveedor o Productor.');
  });

  it('tiene mensajes de respaldo para cualquier campo y motivo', () => {
    expect(mensajeCampo({ campo: 'otro', motivo: 'obligatorio' })).toBe('Indique el campo otro.');
    expect(mensajeCampo({ campo: 'rubro', motivo: 'formato' })).toBe('Revise el formato de el rubro comercial.');
    expect(mensajeCampo({ campo: 'rubro', motivo: 'longitud' })).toBe('Acorte el rubro comercial: supera la longitud permitida.');
    expect(mensajeCampo({ campo: 'rubro', motivo: 'valor' })).toBe('El valor de el rubro comercial no es válido.');
  });
});

describe('Validación declarativa en la frontera (PA-05)', () => {
  it('traduce los errores de class-validator a infracciones del dominio', () => {
    const fabrica = (crearTuberiaValidacion() as unknown as { exceptionFactory: (e: unknown[]) => ErrorValidacion }).exceptionFactory;
    const error = fabrica([
      { property: 'ruc', constraints: { isNotEmpty: 'x' } },
      { property: 'rubro', constraints: { maxLength: 'x' } },
      { property: 'raro', constraints: { restriccionDesconocida: 'x' } },
      { property: 'sinRestricciones' },
    ]);
    expect(error.detalles).toEqual([
      { campo: 'ruc', motivo: 'obligatorio' },
      { campo: 'rubro', motivo: 'longitud' },
      { campo: 'raro', motivo: 'valor' },
      { campo: 'sinRestricciones', motivo: 'valor' },
    ]);
  });
});

describe('Traza de peticiones sin datos personales (V-03)', () => {
  it('registra método, ruta declarada, estado y duración, y no la URL concreta', async () => {
    const interceptor = new RegistroPeticionesInterceptor();
    const registros: string[] = [];
    (interceptor as unknown as { registro: { log: (m: string) => void } }).registro = { log: (m) => registros.push(m) };
    const contexto = (ruta?: string) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/api/v1/cuentas?ruc=J0310000000001', route: ruta ? { path: ruta } : undefined }),
          getResponse: () => ({ statusCode: 200 }),
        }),
      }) as unknown as ExecutionContext;
    const siguiente: CallHandler = { handle: () => of('cuerpo') };

    await lastValueFrom(interceptor.intercept(contexto('/api/v1/cuentas'), siguiente));
    await lastValueFrom(interceptor.intercept(contexto(), siguiente));

    expect(registros[0]).toMatch(/^GET \/api\/v1\/cuentas 200 \d+ ms$/);
    expect(registros[1]).toMatch(/^GET desconocida 200/);
    expect(registros.join()).not.toContain('J0310000000001');
  });
});

describe('Piezas de soporte de la bandeja', () => {
  it('la causa del fallo se reduce al tipo de error', () => {
    expect(causaFallo(new TypeError('dato personal'))).toBe('TypeError');
    expect(causaFallo('texto')).toBe('Error');
  });

  it('una transacción ajena no se acepta como transacción en memoria', () => {
    expect(() => comoTransaccionMemoria({} as Transaccion)).toThrow(TypeError);
  });
});
