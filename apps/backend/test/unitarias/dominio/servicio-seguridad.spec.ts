import { ServicioSeguridad, VIDA_ACCESO_SEGUNDOS, VIDA_RENOVACION_SEGUNDOS } from '../../../src/dominio/m2-seguridad';
import { ErrorAccesoDenegado, ErrorAutenticacion, ErrorConflicto, ErrorValidacion } from '../../../src/dominio/puertos';
import { UnidadTrabajoMemoria } from '../../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import { DerivacionFalsa, FirmaFalsa, RepositorioSeguridadMemoria, SecretosSecuenciales } from '../../dobles/repositorios-memoria';
import { IdentificadoresSecuenciales, RelojFijo } from '../../dobles/sistema';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };

function crearEscenario() {
  const reloj = new RelojFijo();
  const repositorio = new RepositorioSeguridadMemoria();
  const derivacion = new DerivacionFalsa();
  const unidadTrabajo = new UnidadTrabajoMemoria();
  const seguridad = new ServicioSeguridad({
    repositorio,
    unidadTrabajo,
    derivacion,
    firma: new FirmaFalsa(),
    secretos: new SecretosSecuenciales(),
    reloj,
    identificadores: new IdentificadoresSecuenciales(),
  });
  const registrarCuenta = (cuentaId: string, correo: string) =>
    unidadTrabajo.ejecutar((tx) => seguridad.registrarCredencial({ cuentaId, correo, contrasena: 'una-clave-de-doce', rol: 'Proveedor' }, tx));
  return { seguridad, repositorio, reloj, derivacion, unidadTrabajo, registrarCuenta };
}

describe('CT-SEG-04 · inicio de sesión con correo y contraseña y asignación del rol (SYS-FN-04, ADR-04)', () => {
  it('el Administrador sembrado inicia sesión y recibe su rol y credenciales de la vida aprobada (DIS-06, DIS-24)', async () => {
    const { seguridad } = crearEscenario();
    expect(await seguridad.registrarAdministrador(ADMIN)).toBe('creado');
    expect(await seguridad.registrarAdministrador(ADMIN)).toBe('existente');

    const sesion = await seguridad.iniciarSesion({ correo: 'ADMIN@abasteceni.com.ni ', contrasena: ADMIN.contrasena });

    expect(sesion.rol).toBe('Administrador');
    expect(sesion.expiraEnSegundos).toBe(VIDA_ACCESO_SEGUNDOS);
    expect(VIDA_ACCESO_SEGUNDOS).toBe(15 * 60);
    expect(sesion.renovacionExpiraEnSegundos).toBe(VIDA_RENOVACION_SEGUNDOS);
    expect(VIDA_RENOVACION_SEGUNDOS).toBe(7 * 24 * 3600);
    expect(seguridad.verificarAcceso(sesion.credencialAcceso)).toMatchObject({ rol: 'Administrador', cuentaId: null });
  });

  it('una cuenta «Pendiente de validación» no inicia sesión (DIS-25)', async () => {
    const { seguridad, registrarCuenta } = crearEscenario();
    await registrarCuenta('c-1', 'proveedor@empresa.ni');

    await expect(seguridad.iniciarSesion({ correo: 'proveedor@empresa.ni', contrasena: 'una-clave-de-doce' })).rejects.toEqual(
      new ErrorAccesoDenegado('CUENTA_PENDIENTE'),
    );
  });

  it('una cuenta rechazada no inicia sesión y una habilitada sí, con el rol de su tipo (DIS-25)', async () => {
    const { seguridad, registrarCuenta, unidadTrabajo } = crearEscenario();
    await registrarCuenta('c-1', 'proveedor@empresa.ni');
    const datos = { correo: 'proveedor@empresa.ni', contrasena: 'una-clave-de-doce' };

    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'rechazada', tx));
    await expect(seguridad.iniciarSesion(datos)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_RECHAZADA'));

    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'habilitada', tx));
    expect((await seguridad.iniciarSesion(datos)).rol).toBe('Proveedor');
  });

  it('rechaza una contraseña incorrecta y un correo inexistente con el mismo error, verificando siempre una huella', async () => {
    const { seguridad, derivacion } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);

    await expect(seguridad.iniciarSesion({ correo: ADMIN.correo, contrasena: 'otra-clave-cualquiera' })).rejects.toEqual(
      new ErrorAutenticacion('CREDENCIALES_INVALIDAS'),
    );
    await expect(seguridad.iniciarSesion({ correo: 'nadie@empresa.ni', contrasena: 'otra-clave-cualquiera' })).rejects.toEqual(
      new ErrorAutenticacion('CREDENCIALES_INVALIDAS'),
    );
    expect(derivacion.verificaciones).toHaveLength(2);
  });

  it('no admite dos credenciales con el mismo correo ni contraseñas fuera de 12 a 128 caracteres (DIS-22)', async () => {
    const { seguridad, registrarCuenta, unidadTrabajo } = crearEscenario();
    await registrarCuenta('c-1', 'proveedor@empresa.ni');

    await expect(registrarCuenta('c-2', 'PROVEEDOR@empresa.ni')).rejects.toEqual(new ErrorConflicto('CORREO_REGISTRADO'));
    await expect(
      unidadTrabajo.ejecutar((tx) =>
        seguridad.registrarCredencial({ cuentaId: 'c-3', correo: 'c3@empresa.ni', contrasena: 'x'.repeat(129), rol: 'Productor' }, tx),
      ),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(seguridad.validarDatosCredencial({ correo: 'a@b.ni', contrasena: 'x'.repeat(12) })).toEqual([]);
    expect(seguridad.validarDatosCredencial({ correo: 'a@b.ni', contrasena: 'x'.repeat(11) })).toEqual([{ campo: 'contrasena', motivo: 'longitud' }]);
    expect(seguridad.validarDatosCredencial({})).toEqual([
      { campo: 'correo', motivo: 'obligatorio' },
      { campo: 'contrasena', motivo: 'obligatorio' },
    ]);
  });
});

describe('ADR-04 · renovación con rotación, revocación y verificación sin estado', () => {
  it('renovar emite credenciales nuevas y revoca la credencial de renovación usada', async () => {
    const { seguridad, repositorio } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    const inicial = await seguridad.iniciarSesion(ADMIN);

    const renovada = await seguridad.renovar(inicial.credencialRenovacion);

    expect(renovada.credencialRenovacion).not.toBe(inicial.credencialRenovacion);
    expect([...repositorio.sesiones.values()].filter((s) => s.revocadaEn)).toHaveLength(1);
    await expect(seguridad.renovar(inicial.credencialRenovacion)).rejects.toEqual(new ErrorAutenticacion('RENOVACION_INVALIDA'));
    expect((await seguridad.renovar(renovada.credencialRenovacion)).rol).toBe('Administrador');
  });

  it('una credencial de renovación vencida o desconocida no renueva', async () => {
    const { seguridad, reloj } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    const sesion = await seguridad.iniciarSesion(ADMIN);

    await expect(seguridad.renovar('desconocida')).rejects.toEqual(new ErrorAutenticacion('RENOVACION_INVALIDA'));
    reloj.avanzar(VIDA_RENOVACION_SEGUNDOS * 1000 + 1);
    await expect(seguridad.renovar(sesion.credencialRenovacion)).rejects.toEqual(new ErrorAutenticacion('RENOVACION_INVALIDA'));
  });

  it('cerrar la sesión revoca su credencial de renovación', async () => {
    const { seguridad } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    const sesion = await seguridad.iniciarSesion(ADMIN);

    await seguridad.cerrarSesion(seguridad.verificarAcceso(sesion.credencialAcceso).sesionId);

    await expect(seguridad.renovar(sesion.credencialRenovacion)).rejects.toEqual(new ErrorAutenticacion('RENOVACION_INVALIDA'));
  });

  it('una cuenta deshabilitada después de iniciar sesión ya no renueva', async () => {
    const { seguridad, registrarCuenta, unidadTrabajo } = crearEscenario();
    await registrarCuenta('c-1', 'proveedor@empresa.ni');
    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'habilitada', tx));
    const sesion = await seguridad.iniciarSesion({ correo: 'proveedor@empresa.ni', contrasena: 'una-clave-de-doce' });

    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'rechazada', tx));

    await expect(seguridad.renovar(sesion.credencialRenovacion)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_RECHAZADA'));
  });

  it('una credencial de acceso que no verifica produce ACCESO_INVALIDO', () => {
    const { seguridad } = crearEscenario();
    expect(() => seguridad.verificarAcceso('falsificada')).toThrow(new ErrorAutenticacion('ACCESO_INVALIDO'));
  });
});
