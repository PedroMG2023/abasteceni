import { CUENTA_REGISTRADA, EstadoCuenta, ServicioUsuarios } from '../../../src/dominio/m1-usuarios';
import { ServicioSeguridad } from '../../../src/dominio/m2-seguridad';
import { ErrorConflicto, ErrorValidacion } from '../../../src/dominio/puertos';
import { BandejaSalidaMemoria } from '../../../src/infraestructura/bandeja-salida/bandeja-salida-memoria';
import { UnidadTrabajoMemoria } from '../../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import {
  DerivacionFalsa,
  FirmaFalsa,
  RepositorioSeguridadMemoria,
  RepositorioUsuariosMemoria,
  SecretosSecuenciales,
} from '../../dobles/repositorios-memoria';
import { IdentificadoresSecuenciales, RelojFijo } from '../../dobles/sistema';
import { solicitudValida } from '../datos';

function crearEscenario() {
  const reloj = new RelojFijo();
  const identificadores = new IdentificadoresSecuenciales();
  const unidadTrabajo = new UnidadTrabajoMemoria();
  const repositorioSeguridad = new RepositorioSeguridadMemoria();
  const seguridad = new ServicioSeguridad({
    repositorio: repositorioSeguridad,
    unidadTrabajo,
    derivacion: new DerivacionFalsa(),
    firma: new FirmaFalsa(),
    secretos: new SecretosSecuenciales(),
    reloj,
    identificadores,
  });
  const repositorio = new RepositorioUsuariosMemoria();
  const bandeja = new BandejaSalidaMemoria();
  const usuarios = new ServicioUsuarios({ repositorio, unidadTrabajo, eventos: bandeja, credenciales: seguridad, reloj, identificadores });
  return { usuarios, repositorio, repositorioSeguridad, bandeja };
}

describe('CT-REG-01 · registro de una cuenta comercial en el servicio de M1 (SYS-FN-01, ADR-01)', () => {
  it('registra la cuenta «Pendiente de validación», su credencial pendiente y el evento CuentaRegistrada juntos', async () => {
    const { usuarios, repositorio, repositorioSeguridad, bandeja } = crearEscenario();

    const resultado = await usuarios.registrar(solicitudValida());

    expect(resultado.estado).toBe(EstadoCuenta.PendienteDeValidacion);
    expect(repositorio.cuentas.get(resultado.id)?.razonSocial).toBe('Farmacia San Benito');
    const [credencial] = repositorioSeguridad.credenciales.values();
    expect(credencial).toMatchObject({ cuentaId: resultado.id, rol: 'Comprador', habilitacion: 'pendiente' });
    expect(credencial.hashContrasena).not.toContain('una-clave-de-doce'.toUpperCase());
    expect(bandeja.entradas).toHaveLength(1);
    expect(bandeja.entradas[0].evento).toMatchObject({
      tipo: CUENTA_REGISTRADA,
      datos: { cuentaId: resultado.id, tipo: 'Comprador', telefonoMovil: '+50588887777', correo: 'compras@farmaciasanbenito.com.ni' },
    });
  });

  it('con el RUC vacío rechaza el envío sin escribir nada', async () => {
    const { usuarios, repositorio, bandeja } = crearEscenario();

    const error = await usuarios.registrar(solicitudValida({ ruc: '' })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([{ campo: 'ruc', motivo: 'obligatorio' }]);
    expect(repositorio.cuentas.size).toBe(0);
    expect(bandeja.entradas).toHaveLength(0);
  });

  it('reúne en un solo error las infracciones de la cuenta y de la credencial (DIS-16, DIS-22)', async () => {
    const { usuarios } = crearEscenario();

    const error = (await usuarios.registrar(solicitudValida({ ruc: '', correo: 'sin-arroba', contrasena: 'corta' })).catch((e) => e)) as ErrorValidacion;

    expect(error.detalles).toEqual([
      { campo: 'ruc', motivo: 'obligatorio' },
      { campo: 'correo', motivo: 'formato' },
      { campo: 'contrasena', motivo: 'longitud' },
    ]);
  });

  it('rechaza un RUC ya registrado', async () => {
    const { usuarios } = crearEscenario();
    await usuarios.registrar(solicitudValida());

    await expect(usuarios.registrar(solicitudValida({ correo: 'otro@farmacia.ni' }))).rejects.toEqual(new ErrorConflicto('RUC_REGISTRADO'));
  });

  it('si la credencial falla dentro de la transacción no queda la cuenta ni el evento (ADR-01)', async () => {
    const { usuarios, repositorio, bandeja } = crearEscenario();
    await usuarios.registrar(solicitudValida());

    await expect(usuarios.registrar(solicitudValida({ ruc: 'J0310000000002' }))).rejects.toEqual(new ErrorConflicto('CORREO_REGISTRADO'));

    expect(repositorio.cuentas.size).toBe(1);
    expect(bandeja.entradas).toHaveLength(1);
  });

  it('lista las cuentas filtradas por estado', async () => {
    const { usuarios } = crearEscenario();
    await usuarios.registrar(solicitudValida());

    expect(await usuarios.listar({ estado: EstadoCuenta.PendienteDeValidacion })).toHaveLength(1);
    expect(await usuarios.listar({ estado: EstadoCuenta.Activa })).toHaveLength(0);
    expect(await usuarios.listar()).toHaveLength(1);
  });
});
