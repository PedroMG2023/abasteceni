import { CUENTA_APROBADA, CUENTA_RECHAZADA, CUENTA_REGISTRADA, EstadoCuenta, ServicioUsuarios, VERSION_CONSENTIMIENTO } from '../../../src/dominio/m1-usuarios';
import { ServicioSeguridad } from '../../../src/dominio/m2-seguridad';
import { ErrorConflicto, ErrorNoEncontrado, ErrorTransicion, ErrorValidacion } from '../../../src/dominio/puertos';
import { AlmacenDocumentosMemoria } from '../../../src/infraestructura/almacen-documentos/almacen-memoria';
import { BitacoraMemoria } from '../../../src/infraestructura/auditoria/bitacora-memoria';
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
import { CONTEXTO_ADMINISTRADOR, CONTEXTO_ANONIMO, PDF_MINIMO, solicitudValida } from '../datos';

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
  const bitacora = new BitacoraMemoria();
  const almacen = new AlmacenDocumentosMemoria();
  const usuarios = new ServicioUsuarios({ repositorio, unidadTrabajo, eventos: bandeja, bitacora, almacen, credenciales: seguridad, reloj, identificadores });
  return { usuarios, repositorio, repositorioSeguridad, bandeja, bitacora, almacen, reloj };
}

describe('CT-REG-01 · registro de una cuenta comercial en el servicio de M1 (SYS-FN-01, ADR-01)', () => {
  it('registra la cuenta «Pendiente de validación», su credencial pendiente y el evento CuentaRegistrada juntos', async () => {
    const { usuarios, repositorio, repositorioSeguridad, bandeja } = crearEscenario();

    const resultado = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    expect(resultado.estado).toBe(EstadoCuenta.PendienteDeValidacion);
    expect(repositorio.cuentas.get(resultado.id)?.razonSocial).toBe('Farmacia San Benito');
    const [credencial] = repositorioSeguridad.credenciales.values();
    expect(credencial).toMatchObject({ cuentaId: resultado.id, rol: 'Comprador', habilitacion: 'pendiente' });
    expect(bandeja.entradas).toHaveLength(1);
    expect(bandeja.entradas[0].evento).toMatchObject({
      tipo: CUENTA_REGISTRADA,
      datos: { cuentaId: resultado.id, tipo: 'Comprador', telefonoMovil: '+50588887777', correo: 'compras@farmaciasanbenito.com.ni' },
    });
  });

  it('con el RUC vacío rechaza el envío sin escribir nada', async () => {
    const { usuarios, repositorio, bandeja, almacen } = crearEscenario();

    const error = await usuarios.registrar(solicitudValida({ ruc: '' }), CONTEXTO_ANONIMO).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([{ campo: 'ruc', motivo: 'obligatorio' }]);
    expect(repositorio.cuentas.size).toBe(0);
    expect(bandeja.entradas).toHaveLength(0);
    expect(almacen.documentos.size).toBe(0);
  });

  it('reúne en un solo error las infracciones de la cuenta y de la credencial (DIS-16, DIS-22)', async () => {
    const { usuarios } = crearEscenario();

    const error = (await usuarios
      .registrar(solicitudValida({ ruc: '', correo: 'sin-arroba', contrasena: 'corta', aceptaConsentimiento: false }), CONTEXTO_ANONIMO)
      .catch((e) => e)) as ErrorValidacion;

    expect(error.detalles).toEqual([
      { campo: 'ruc', motivo: 'obligatorio' },
      { campo: 'aceptaConsentimiento', motivo: 'obligatorio' },
      { campo: 'correo', motivo: 'formato' },
      { campo: 'contrasena', motivo: 'longitud' },
    ]);
  });

  it('rechaza un RUC ya registrado y elimina el documento ya guardado', async () => {
    const { usuarios, almacen } = crearEscenario();
    await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    await expect(usuarios.registrar(solicitudValida({ correo: 'otro@farmacia.ni' }), CONTEXTO_ANONIMO)).rejects.toEqual(
      new ErrorConflicto('RUC_REGISTRADO'),
    );
    expect(almacen.documentos.size).toBe(1);
  });

  it('si la credencial falla dentro de la transacción no queda la cuenta, ni el evento, ni asientos, ni el documento (ADR-01)', async () => {
    const { usuarios, repositorio, bandeja, bitacora, almacen } = crearEscenario();
    await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    await expect(usuarios.registrar(solicitudValida({ ruc: 'J0310000000002' }), CONTEXTO_ANONIMO)).rejects.toEqual(
      new ErrorConflicto('CORREO_REGISTRADO'),
    );

    expect(repositorio.cuentas.size).toBe(1);
    expect(bandeja.entradas).toHaveLength(1);
    expect(bitacora.asientos).toHaveLength(3);
    expect(almacen.documentos.size).toBe(1);
  });

  it('lista las cuentas filtradas por estado', async () => {
    const { usuarios } = crearEscenario();
    await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    expect(await usuarios.listar({ estado: EstadoCuenta.PendienteDeValidacion })).toHaveLength(1);
    expect(await usuarios.listar({ estado: EstadoCuenta.Activa })).toHaveLength(0);
    expect(await usuarios.listar()).toHaveLength(1);
  });
});

describe('SYS-FN-35 y SYS-FN-36 · asientos de bitácora del registro', () => {
  it('registra la creación, el consentimiento con su marca temporal y la carga del documento, con usuario e IP', async () => {
    const { usuarios, bitacora, repositorioSeguridad, reloj } = crearEscenario();

    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    const [credencial] = repositorioSeguridad.credenciales.values();
    expect(bitacora.asientos.map((a) => a.accion)).toEqual(['CUENTA_REGISTRADA', 'CONSENTIMIENTO_ACEPTADO', 'REGISTRO_LEGAL_CARGADO']);
    for (const asiento of bitacora.asientos) {
      expect(asiento).toMatchObject({ usuarioId: credencial.id, ip: '203.0.113.10', recurso: { tipo: 'CuentaComercial', id }, registradoEn: reloj.ahora() });
    }
    expect(bitacora.asientos[1].detalle).toEqual({ version: VERSION_CONSENTIMIENTO, aceptadoEn: reloj.ahora().toISOString() });
    expect(bitacora.asientos[2].detalle).toEqual({ tipo: 'application/pdf', bytes: PDF_MINIMO.length });
  });

  it('el documento se guarda con el tipo determinado por su contenido y se recupera para el Administrador', async () => {
    const { usuarios } = crearEscenario();
    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    const documento = await usuarios.obtenerRegistroLegal(id);

    expect(documento).toEqual({ contenido: PDF_MINIMO, tipo: 'application/pdf' });
    await expect(usuarios.obtenerRegistroLegal('inexistente')).rejects.toEqual(new ErrorNoEncontrado('CUENTA_NO_ENCONTRADA'));
  });
});

describe('CT-ADM-03 · aprobación y rechazo por el Administrador con asiento en la bitácora (SYS-FN-03)', () => {
  it('aprobar pasa la cuenta a «Activa», habilita la credencial, asienta el resultado y publica CuentaAprobada', async () => {
    const { usuarios, repositorioSeguridad, bitacora, bandeja } = crearEscenario();
    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    const cuenta = await usuarios.validarCuenta({ cuentaId: id, decision: 'aprobar' }, CONTEXTO_ADMINISTRADOR);

    expect(cuenta.estado).toBe('Activa');
    expect([...repositorioSeguridad.credenciales.values()][0].habilitacion).toBe('habilitada');
    expect(bitacora.asientos.at(-1)).toMatchObject({
      accion: 'CUENTA_APROBADA',
      usuarioId: CONTEXTO_ADMINISTRADOR.usuarioId,
      ip: CONTEXTO_ADMINISTRADOR.ip,
      detalle: { resultado: 'Activa' },
    });
    expect(bandeja.entradas.at(-1)?.evento.tipo).toBe(CUENTA_APROBADA);
  });

  it('rechazar registra el motivo en la bitácora y publica CuentaRechazada con la justificación', async () => {
    const { usuarios, repositorioSeguridad, bitacora, bandeja } = crearEscenario();
    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    await usuarios.validarCuenta({ cuentaId: id, decision: 'rechazar', justificacion: ' Documento ilegible ' }, CONTEXTO_ADMINISTRADOR);

    expect([...repositorioSeguridad.credenciales.values()][0].habilitacion).toBe('rechazada');
    expect(bitacora.asientos.at(-1)).toMatchObject({ accion: 'CUENTA_RECHAZADA', detalle: { resultado: 'Rechazada', justificacion: 'Documento ilegible' } });
    expect(bandeja.entradas.at(-1)?.evento).toMatchObject({ tipo: CUENTA_RECHAZADA, datos: { justificacion: 'Documento ilegible' } });
  });

  it('una segunda decisión sobre la misma cuenta es una transición no permitida y no deja rastro', async () => {
    const { usuarios, bitacora } = crearEscenario();
    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);
    await usuarios.validarCuenta({ cuentaId: id, decision: 'aprobar' }, CONTEXTO_ADMINISTRADOR);
    const asientos = bitacora.asientos.length;

    await expect(usuarios.validarCuenta({ cuentaId: id, decision: 'rechazar', justificacion: 'x' }, CONTEXTO_ADMINISTRADOR)).rejects.toBeInstanceOf(
      ErrorTransicion,
    );
    expect(bitacora.asientos).toHaveLength(asientos);
  });

  it('rechazar sin justificación o validar una cuenta inexistente no cambia nada', async () => {
    const { usuarios, repositorio } = crearEscenario();
    const { id } = await usuarios.registrar(solicitudValida(), CONTEXTO_ANONIMO);

    await expect(usuarios.validarCuenta({ cuentaId: id, decision: 'rechazar' }, CONTEXTO_ADMINISTRADOR)).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(usuarios.validarCuenta({ cuentaId: 'x', decision: 'aprobar' }, CONTEXTO_ADMINISTRADOR)).rejects.toEqual(
      new ErrorNoEncontrado('CUENTA_NO_ENCONTRADA'),
    );
    expect(repositorio.cuentas.get(id)?.estado).toBe('Pendiente de validación');
  });
});
