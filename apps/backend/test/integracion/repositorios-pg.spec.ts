import { CuentaComercial, EstadoCuenta, Ruc, Ubicacion } from '../../src/dominio/m1-usuarios';
import { ErrorConflicto } from '../../src/dominio/puertos';
import { crearBaseDatos, errorPostgres } from '../../src/infraestructura/persistencia/base-datos';
import { RepositorioUsuariosPg } from '../../src/infraestructura/persistencia/m1-usuarios/repositorio-usuarios-pg';
import { RepositorioSeguridadPg } from '../../src/infraestructura/persistencia/m2-seguridad/repositorio-seguridad-pg';
import { UnidadTrabajoPg } from '../../src/infraestructura/persistencia/unidad-trabajo-pg';
import { iniciarBaseDatosPrueba, type BaseDatosPrueba } from '../soporte/base-datos';
import { REGISTRO_LEGAL, solicitudValida } from '../unitarias/datos';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('Repositorios de M1 y M2 sobre PostgreSQL (R-04, patrón graduado)', () => {
  let bd: BaseDatosPrueba;
  let conexion: ReturnType<typeof crearBaseDatos>;
  let unidad: UnidadTrabajoPg;

  beforeAll(async () => {
    bd = await iniciarBaseDatosPrueba();
    conexion = crearBaseDatos(bd.urlApp);
    unidad = new UnidadTrabajoPg(conexion.db);
  }, 120000);

  afterAll(async () => {
    await conexion.pool.end();
    await bd.detener();
  });

  it('reconstruye la cuenta comercial desde la fila', async () => {
    const repositorio = new RepositorioUsuariosPg(conexion.db);
    const original = CuentaComercial.registrar(solicitudValida(), { id: ID(1), ahora: new Date('2026-10-17T12:00:00.000Z'), registroLegal: REGISTRO_LEGAL });
    await unidad.ejecutar((tx) => repositorio.guardar(original, tx));

    const [leida] = await repositorio.listar({ estado: EstadoCuenta.PendienteDeValidacion });

    expect(leida).toEqual(original);
  });

  it('traduce la violación de unicidad del RUC en ErrorConflicto aunque se salte la comprobación previa', async () => {
    const repositorio = new RepositorioUsuariosPg(conexion.db);
    const repetida = CuentaComercial.registrar(solicitudValida(), { id: ID(2), ahora: new Date(), registroLegal: REGISTRO_LEGAL });

    await expect(unidad.ejecutar((tx) => repositorio.guardar(repetida, tx))).rejects.toEqual(new ErrorConflicto('RUC_REGISTRADO'));
  });

  it('traduce la violación de unicidad del correo en ErrorConflicto y propaga los demás errores', async () => {
    const repositorio = new RepositorioSeguridadPg(conexion.db);
    const credencial = { id: ID(3), cuentaId: null, correo: 'x@y.ni', hashContrasena: 'h', rol: 'Comprador' as const, habilitacion: 'pendiente' as const, creadaEn: new Date(), intentosFallidos: 0, bloqueadaHasta: null };
    await unidad.ejecutar((tx) => repositorio.guardarCredencial(credencial, tx));

    await expect(unidad.ejecutar((tx) => repositorio.guardarCredencial({ ...credencial, id: ID(4) }, tx))).rejects.toEqual(
      new ErrorConflicto('CORREO_REGISTRADO'),
    );
    await expect(unidad.ejecutar((tx) => repositorio.guardarCredencial({ ...credencial, id: ID(5), correo: 'z@y.ni', rol: 'Invitado' as never }, tx))).rejects.not.toBeInstanceOf(
      ErrorConflicto,
    );
  });

  it('una violación distinta de la unicidad del RUC no se disfraza de conflicto', async () => {
    const repositorio = new RepositorioUsuariosPg(conexion.db);
    const invalida = CuentaComercial.reconstruir({
      id: ID(6),
      tipo: 'Comprador',
      razonSocial: 'Farmacia',
      ruc: Ruc.crear('J0310000000077'),
      ubicacion: new Ubicacion('Chinandega', 'El Viejo'),
      rubro: 'Farmacia',
      telefonoMovil: '+50588887777',
      correo: 'f@farmacia.ni',
      estado: 'Borrada' as EstadoCuenta,
      registradaEn: new Date(),
      consentimientoAceptadoEn: new Date(),
      registroLegal: REGISTRO_LEGAL,
    });

    const error = await unidad.ejecutar((tx) => repositorio.guardar(invalida, tx)).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ErrorConflicto);
    expect(errorPostgres(error)).toEqual({ codigo: '23514', restriccion: 'cuentas_comerciales_estado' });
  });

  it('errorPostgres lee el código de un error directo o envuelto', () => {
    expect(errorPostgres({ code: '23505', constraint: 'c' })).toEqual({ codigo: '23505', restriccion: 'c' });
    expect(errorPostgres({ cause: { code: '42501' } })).toEqual({ codigo: '42501', restriccion: undefined });
    expect(errorPostgres(undefined)).toEqual({ codigo: undefined, restriccion: undefined });
  });
});
