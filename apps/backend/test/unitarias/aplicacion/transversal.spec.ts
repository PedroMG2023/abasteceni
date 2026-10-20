import { EventEmitter } from 'node:events';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
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
  // Respuesta mínima: un emisor con el estado, que el servidor HTTP termina con «finish».
  const escenario = () => {
    const interceptor = new RegistroPeticionesInterceptor();
    const registros: string[] = [];
    (interceptor as unknown as { registro: { log: (m: string) => void } }).registro = { log: (m) => registros.push(m) };
    const respuesta = Object.assign(new EventEmitter(), { statusCode: 200 });
    const contexto = (ruta?: string) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/api/v1/cuentas?ruc=J0310000000001', route: ruta ? { path: ruta } : undefined }),
          getResponse: () => respuesta,
        }),
      }) as unknown as ExecutionContext;
    return { interceptor, registros, respuesta, contexto };
  };

  it('registra método, ruta declarada, estado y duración, y no la URL concreta', async () => {
    const { interceptor, registros, respuesta, contexto } = escenario();
    const siguiente: CallHandler = { handle: () => of('cuerpo') };

    await lastValueFrom(interceptor.intercept(contexto('/api/v1/cuentas'), siguiente));
    respuesta.emit('finish');
    await lastValueFrom(interceptor.intercept(contexto(), siguiente));
    respuesta.emit('finish');

    expect(registros[0]).toMatch(/^GET \/api\/v1\/cuentas 200 \d+ ms$/);
    expect(registros[1]).toMatch(/^GET desconocida 200/);
    expect(registros.join()).not.toContain('J0310000000001');
  });

  it('en una petición fallida registra el estado que fija el filtro de errores, no el previo', async () => {
    const { interceptor, registros, respuesta, contexto } = escenario();
    const siguiente: CallHandler = { handle: () => throwError(() => new Error('enlace vencido')) };

    await expect(lastValueFrom(interceptor.intercept(contexto('/api/v1/sesiones/recuperacion/restablecimiento'), siguiente))).rejects.toThrow();
    expect(registros).toEqual([]);
    respuesta.statusCode = 410;
    respuesta.emit('finish');

    expect(registros).toEqual([expect.stringMatching(/^GET \/api\/v1\/sesiones\/recuperacion\/restablecimiento 410 \d+ ms$/)]);
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
