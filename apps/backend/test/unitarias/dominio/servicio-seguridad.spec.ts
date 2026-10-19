import {
  BLOQUEO_SEGUNDOS,
  CUENTA_BLOQUEADA,
  RECUPERACION_SOLICITADA,
  ServicioSeguridad,
  VIDA_ACCESO_SEGUNDOS,
  VIDA_RECUPERACION_SEGUNDOS,
  VIDA_RENOVACION_SEGUNDOS,
  type RecuperacionSolicitada,
} from '../../../src/dominio/m2-seguridad';
import { ErrorAccesoDenegado, ErrorAutenticacion, ErrorConflicto, ErrorValidacion, ErrorVencido } from '../../../src/dominio/puertos';
import { BitacoraMemoria } from '../../../src/infraestructura/auditoria/bitacora-memoria';
import { BandejaSalidaMemoria } from '../../../src/infraestructura/bandeja-salida/bandeja-salida-memoria';
import { UnidadTrabajoMemoria } from '../../../src/infraestructura/persistencia/unidad-trabajo-memoria';
import { DerivacionFalsa, FirmaFalsa, RepositorioSeguridadMemoria, SecretosSecuenciales } from '../../dobles/repositorios-memoria';
import { IdentificadoresSecuenciales, RelojFijo } from '../../dobles/sistema';

const ADMIN = { correo: 'admin@abasteceni.com.ni', contrasena: 'clave-de-administrador' };

function crearEscenario() {
  const reloj = new RelojFijo();
  const repositorio = new RepositorioSeguridadMemoria();
  const derivacion = new DerivacionFalsa();
  const unidadTrabajo = new UnidadTrabajoMemoria();
  const bandeja = new BandejaSalidaMemoria();
  const bitacora = new BitacoraMemoria();
  const seguridad = new ServicioSeguridad({
    repositorio,
    unidadTrabajo,
    eventos: bandeja,
    bitacora,
    derivacion,
    firma: new FirmaFalsa(),
    secretos: new SecretosSecuenciales(),
    reloj,
    identificadores: new IdentificadoresSecuenciales(),
  });
  const registrarCuenta = (cuentaId: string, correo: string) =>
    unidadTrabajo.ejecutar((tx) => seguridad.registrarCredencial({ cuentaId, correo, contrasena: 'una-clave-de-doce', rol: 'Proveedor' }, tx));
  return { seguridad, repositorio, reloj, derivacion, unidadTrabajo, registrarCuenta, bandeja, bitacora };
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

describe('CT-SEG-07 · bloqueo temporal tras 5 intentos fallidos consecutivos (SYS-FN-07, DIS-34)', () => {
  const MAL = { correo: ADMIN.correo, contrasena: 'no-es-la-clave' };

  it('el quinto intento fallido bloquea 15 minutos y publica CuentaBloqueada con el correo registrado', async () => {
    const { seguridad, bandeja, repositorio } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);

    for (let i = 0; i < 4; i++) await expect(seguridad.iniciarSesion(MAL)).rejects.toEqual(new ErrorAutenticacion('CREDENCIALES_INVALIDAS'));
    await expect(seguridad.iniciarSesion(MAL)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_BLOQUEADA'));

    const [credencial] = repositorio.credenciales.values();
    expect(credencial.bloqueadaHasta?.getTime()).toBe(new Date('2026-10-17T12:00:00.000Z').getTime() + BLOQUEO_SEGUNDOS * 1000);
    expect(bandeja.entradas.map((e) => e.evento)).toEqual([
      expect.objectContaining({ tipo: CUENTA_BLOQUEADA, datos: expect.objectContaining({ correo: ADMIN.correo }) }),
    ]);
  });

  it('durante el bloqueo no se evalúa la contraseña, ni siquiera la correcta', async () => {
    const { seguridad, derivacion } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    for (let i = 0; i < 5; i++) await seguridad.iniciarSesion(MAL).catch(() => undefined);
    const verificaciones = derivacion.verificaciones.length;

    await expect(seguridad.iniciarSesion(ADMIN)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_BLOQUEADA'));
    expect(derivacion.verificaciones).toHaveLength(verificaciones);
  });

  it('pasados los 15 minutos la contraseña correcta vuelve a dar acceso', async () => {
    const { seguridad, reloj } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    for (let i = 0; i < 5; i++) await seguridad.iniciarSesion(MAL).catch(() => undefined);

    reloj.avanzar(BLOQUEO_SEGUNDOS * 1000 - 1);
    await expect(seguridad.iniciarSesion(ADMIN)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_BLOQUEADA'));
    reloj.avanzar(1);
    expect((await seguridad.iniciarSesion(ADMIN)).rol).toBe('Administrador');
  });

  it('un inicio exitoso reinicia el contador: los fallos deben ser consecutivos', async () => {
    const { seguridad, bandeja } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);

    for (let i = 0; i < 4; i++) await seguridad.iniciarSesion(MAL).catch(() => undefined);
    await seguridad.iniciarSesion(ADMIN);
    for (let i = 0; i < 4; i++) await expect(seguridad.iniciarSesion(MAL)).rejects.toEqual(new ErrorAutenticacion('CREDENCIALES_INVALIDAS'));

    expect(bandeja.entradas).toHaveLength(0);
  });

  it('un correo inexistente no bloquea nada', async () => {
    const { seguridad, bandeja } = crearEscenario();
    for (let i = 0; i < 6; i++) {
      await expect(seguridad.iniciarSesion({ correo: 'nadie@empresa.ni', contrasena: 'x' })).rejects.toEqual(new ErrorAutenticacion('CREDENCIALES_INVALIDAS'));
    }
    expect(bandeja.entradas).toHaveLength(0);
  });
});

describe('CT-SEG-05 · recuperación de la cuenta con un enlace de 15 minutos al correo registrado (SYS-FN-05, DIS-36)', () => {
  const CONTEXTO = { usuarioId: null, ip: '203.0.113.10' };
  const NUEVA = 'una-clave-nueva-y-larga';
  const VENCIDO = new ErrorVencido('ENLACE_VENCIDO');

  // Secreto del último enlace publicado en la bandeja de salida.
  const ultimoSecreto = (bandeja: BandejaSalidaMemoria): string => {
    const eventos = bandeja.entradas.map((e) => e.evento).filter((e) => e.tipo === RECUPERACION_SOLICITADA);
    return (eventos.at(-1) as RecuperacionSolicitada).datos.secreto;
  };

  it('publica el enlace para el correo registrado y, usado antes de 15 minutos, cambia la contraseña', async () => {
    const { seguridad, bandeja, bitacora, reloj } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);

    await seguridad.solicitarRecuperacion(' ADMIN@abasteceni.com.ni');
    const [entrada] = bandeja.entradas;
    expect(entrada.evento).toMatchObject({
      tipo: RECUPERACION_SOLICITADA,
      datos: { correo: ADMIN.correo, expiraEn: new Date(reloj.ahora().getTime() + VIDA_RECUPERACION_SEGUNDOS * 1000).toISOString() },
    });
    expect(VIDA_RECUPERACION_SEGUNDOS).toBe(15 * 60);

    reloj.avanzar(14 * 60 * 1000);
    await seguridad.restablecerContrasena({ secreto: ultimoSecreto(bandeja), contrasena: NUEVA }, CONTEXTO);

    await expect(seguridad.iniciarSesion(ADMIN)).rejects.toEqual(new ErrorAutenticacion('CREDENCIALES_INVALIDAS'));
    expect((await seguridad.iniciarSesion({ correo: ADMIN.correo, contrasena: NUEVA })).rol).toBe('Administrador');
    expect(bitacora.asientos).toEqual([
      expect.objectContaining({ accion: 'CONTRASENA_RESTABLECIDA', recurso: expect.objectContaining({ tipo: 'Credencial' }), ip: CONTEXTO.ip }),
    ]);
  });

  it('a los 16 minutos el enlace venció y la contraseña no cambia', async () => {
    const { seguridad, bandeja, reloj } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    await seguridad.solicitarRecuperacion(ADMIN.correo);

    reloj.avanzar(16 * 60 * 1000);

    await expect(seguridad.restablecerContrasena({ secreto: ultimoSecreto(bandeja), contrasena: NUEVA }, CONTEXTO)).rejects.toEqual(VENCIDO);
    expect((await seguridad.iniciarSesion(ADMIN)).rol).toBe('Administrador');
  });

  it('el enlace es de un solo uso y una solicitud nueva anula la anterior', async () => {
    const { seguridad, bandeja } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    await seguridad.solicitarRecuperacion(ADMIN.correo);
    const primero = ultimoSecreto(bandeja);
    await seguridad.solicitarRecuperacion(ADMIN.correo);
    const segundo = ultimoSecreto(bandeja);

    await expect(seguridad.restablecerContrasena({ secreto: primero, contrasena: NUEVA }, CONTEXTO)).rejects.toEqual(VENCIDO);
    await seguridad.restablecerContrasena({ secreto: segundo, contrasena: NUEVA }, CONTEXTO);
    await expect(seguridad.restablecerContrasena({ secreto: segundo, contrasena: 'otra-clave-distinta' }, CONTEXTO)).rejects.toEqual(VENCIDO);
    await expect(seguridad.restablecerContrasena({ secreto: 'desconocido', contrasena: NUEVA }, CONTEXTO)).rejects.toEqual(VENCIDO);
  });

  it('el restablecimiento revoca todas las sesiones y levanta el bloqueo de SYS-FN-07', async () => {
    const { seguridad, bandeja, repositorio } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    const sesion = await seguridad.iniciarSesion(ADMIN);
    for (let i = 0; i < 5; i++) await seguridad.iniciarSesion({ correo: ADMIN.correo, contrasena: 'no-es-la-clave' }).catch(() => undefined);
    await expect(seguridad.iniciarSesion(ADMIN)).rejects.toEqual(new ErrorAccesoDenegado('CUENTA_BLOQUEADA'));

    await seguridad.solicitarRecuperacion(ADMIN.correo);
    await seguridad.restablecerContrasena({ secreto: ultimoSecreto(bandeja), contrasena: NUEVA }, CONTEXTO);

    await expect(seguridad.renovar(sesion.credencialRenovacion)).rejects.toEqual(new ErrorAutenticacion('RENOVACION_INVALIDA'));
    expect([...repositorio.credenciales.values()][0]).toMatchObject({ intentosFallidos: 0, bloqueadaHasta: null });
    expect((await seguridad.iniciarSesion({ correo: ADMIN.correo, contrasena: NUEVA })).rol).toBe('Administrador');
  });

  it('una contraseña fuera de 12 a 128 caracteres se rechaza sin gastar el enlace (DIS-22)', async () => {
    const { seguridad, bandeja } = crearEscenario();
    await seguridad.registrarAdministrador(ADMIN);
    await seguridad.solicitarRecuperacion(ADMIN.correo);
    const secreto = ultimoSecreto(bandeja);

    await expect(seguridad.restablecerContrasena({ secreto, contrasena: 'corta' }, CONTEXTO)).rejects.toEqual(
      new ErrorValidacion([{ campo: 'contrasena', motivo: 'longitud' }]),
    );
    await expect(seguridad.restablecerContrasena({ secreto, contrasena: '' }, CONTEXTO)).rejects.toEqual(
      new ErrorValidacion([{ campo: 'contrasena', motivo: 'obligatorio' }]),
    );
    await seguridad.restablecerContrasena({ secreto, contrasena: NUEVA }, CONTEXTO);
  });

  it('un correo inexistente, pendiente o rechazado no recibe enlace y la respuesta no lo revela', async () => {
    const { seguridad, bandeja, registrarCuenta, unidadTrabajo } = crearEscenario();
    await registrarCuenta('c-1', 'pendiente@empresa.ni');
    await registrarCuenta('c-2', 'rechazada@empresa.ni');
    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-2', 'rechazada', tx));

    for (const correo of ['nadie@empresa.ni', 'pendiente@empresa.ni', 'rechazada@empresa.ni']) {
      await expect(seguridad.solicitarRecuperacion(correo)).resolves.toBeUndefined();
    }
    expect(bandeja.entradas).toHaveLength(0);
    await expect(seguridad.solicitarRecuperacion('no-es-un-correo')).rejects.toEqual(new ErrorValidacion([{ campo: 'correo', motivo: 'formato' }]));
    await expect(seguridad.solicitarRecuperacion('')).rejects.toEqual(new ErrorValidacion([{ campo: 'correo', motivo: 'obligatorio' }]));
  });

  it('si la cuenta deja de estar habilitada, su enlace pendiente ya no sirve', async () => {
    const { seguridad, bandeja, registrarCuenta, unidadTrabajo } = crearEscenario();
    await registrarCuenta('c-1', 'proveedor@empresa.ni');
    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'habilitada', tx));
    await seguridad.solicitarRecuperacion('proveedor@empresa.ni');
    await unidadTrabajo.ejecutar((tx) => seguridad.cambiarHabilitacion('c-1', 'rechazada', tx));

    await expect(seguridad.restablecerContrasena({ secreto: ultimoSecreto(bandeja), contrasena: NUEVA }, CONTEXTO)).rejects.toEqual(VENCIDO);
  });
});
