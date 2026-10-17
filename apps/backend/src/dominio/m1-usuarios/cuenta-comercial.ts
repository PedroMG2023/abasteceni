import { ErrorTransicion, ErrorValidacion, type DetalleValidacion } from '../puertos';
import { siguienteEstado, type Decision } from './maquina-estados';
import { comprobarRegistroLegal, type RegistroLegal } from './registro-legal';
import { Ruc } from './ruc';
import { EstadoCuenta, TIPOS_CUENTA, type TipoCuenta } from './tipos';
import { Ubicacion } from './ubicacion';

export interface DatosCuenta {
  readonly tipo: string;
  readonly razonSocial: string;
  readonly ruc: string;
  readonly departamento: string;
  readonly municipio: string;
  readonly rubro: string;
  readonly telefonoMovil: string;
  readonly correo: string;
}

// Lo que acompaña a los datos en la solicitud: consentimiento (SYS-FN-36) y
// documento de registro legal (SYS-FN-02).
export interface AdjuntosRegistro {
  readonly aceptaConsentimiento: boolean;
  readonly registroLegal: Uint8Array;
}

export interface PropiedadesCuenta {
  readonly id: string;
  readonly tipo: TipoCuenta;
  readonly razonSocial: string;
  readonly ruc: Ruc;
  readonly ubicacion: Ubicacion;
  readonly rubro: string;
  readonly telefonoMovil: string;
  readonly correo: string;
  readonly estado: EstadoCuenta;
  readonly registradaEn: Date;
  // Atributo consentimiento de MD-01: marca temporal de la aceptación.
  readonly consentimientoAceptadoEn: Date;
  readonly registroLegal: RegistroLegal;
}

// Teléfono móvil en formato UIT-T E.164 (DIS-19).
const PATRON_TELEFONO = /^\+[1-9]\d{7,14}$/;
const LONGITUD_MAXIMA = { razonSocial: 200, departamento: 100, municipio: 100, rubro: 100 } as const;

// Raíz del agregado de M1 (MD-01, «entidadRaiz»). razonSocial y ruc son datos
// personales (V-03, «datoPersonal»): no se escriben en trazas.
export class CuentaComercial {
  private constructor(private readonly p: PropiedadesCuenta) {}

  get id() { return this.p.id; }
  get tipo() { return this.p.tipo; }
  get razonSocial() { return this.p.razonSocial; }
  get ruc() { return this.p.ruc; }
  get ubicacion() { return this.p.ubicacion; }
  get rubro() { return this.p.rubro; }
  get telefonoMovil() { return this.p.telefonoMovil; }
  get correo() { return this.p.correo; }
  get estado() { return this.p.estado; }
  get registradaEn() { return this.p.registradaEn; }
  get consentimientoAceptadoEn() { return this.p.consentimientoAceptadoEn; }
  get registroLegal() { return this.p.registroLegal; }

  // Campos obligatorios de SYS-FN-01 más el tipo (DIS-17) y el teléfono (DIS-19);
  // el consentimiento (SYS-FN-36) y el registro legal (SYS-FN-02, DIS-29). El
  // correo lo comprueba M2. Devuelve todas las infracciones a la vez.
  static comprobarDatos(datos: Partial<DatosCuenta & AdjuntosRegistro>): DetalleValidacion[] {
    const detalles: DetalleValidacion[] = [];
    const texto = (campo: keyof DatosCuenta) => (typeof datos[campo] === 'string' ? (datos[campo] as string) : '').trim();

    if (!texto('tipo')) detalles.push({ campo: 'tipo', motivo: 'obligatorio' });
    else if (!(TIPOS_CUENTA as readonly string[]).includes(texto('tipo'))) detalles.push({ campo: 'tipo', motivo: 'valor' });

    for (const campo of ['razonSocial', 'departamento', 'municipio', 'rubro'] as const) {
      if (!texto(campo)) detalles.push({ campo, motivo: 'obligatorio' });
      else if (texto(campo).length > LONGITUD_MAXIMA[campo]) detalles.push({ campo, motivo: 'longitud' });
    }

    if (!texto('ruc')) detalles.push({ campo: 'ruc', motivo: 'obligatorio' });
    else if (!Ruc.esValido(texto('ruc'))) detalles.push({ campo: 'ruc', motivo: 'formato' });

    if (!texto('telefonoMovil')) detalles.push({ campo: 'telefonoMovil', motivo: 'obligatorio' });
    else if (!PATRON_TELEFONO.test(texto('telefonoMovil'))) detalles.push({ campo: 'telefonoMovil', motivo: 'formato' });

    detalles.push(...comprobarRegistroLegal(datos.registroLegal));
    if (datos.aceptaConsentimiento !== true) detalles.push({ campo: 'aceptaConsentimiento', motivo: 'obligatorio' });
    return detalles;
  }

  // Registro en estado «Pendiente de validación» (SYS-FN-01, CT-REG-01).
  // Precondición: comprobarDatos(datos) no devolvió infracciones.
  // El consentimiento queda aceptado en el mismo instante del registro.
  static registrar(datos: DatosCuenta, contexto: { id: string; ahora: Date; registroLegal: RegistroLegal }): CuentaComercial {
    return new CuentaComercial({
      id: contexto.id,
      tipo: datos.tipo.trim() as TipoCuenta,
      razonSocial: datos.razonSocial.trim(),
      ruc: Ruc.crear(datos.ruc),
      ubicacion: new Ubicacion(datos.departamento.trim(), datos.municipio.trim()),
      rubro: datos.rubro.trim(),
      telefonoMovil: datos.telefonoMovil.trim(),
      correo: datos.correo.trim().toLowerCase(),
      estado: EstadoCuenta.PendienteDeValidacion,
      registradaEn: contexto.ahora,
      consentimientoAceptadoEn: contexto.ahora,
      registroLegal: contexto.registroLegal,
    });
  }

  // Operación validar de MD-01 (SYS-FN-03): aplica la decisión del
  // Administrador según la máquina de estados (AS-01). El rechazo exige
  // justificación (DIS-23). Devuelve la cuenta en su nuevo estado.
  validar(decision: Decision, justificacion?: string): CuentaComercial {
    const estado = siguienteEstado(this.p.estado, decision);
    if (!estado) throw new ErrorTransicion();
    if (decision === 'rechazar' && !justificacion?.trim()) {
      throw new ErrorValidacion([{ campo: 'justificacion', motivo: 'obligatorio' }]);
    }
    return new CuentaComercial({ ...this.p, estado });
  }

  // El repositorio reconstruye la entidad desde la fila (R-04, patrón graduado).
  static reconstruir(propiedades: PropiedadesCuenta): CuentaComercial {
    return new CuentaComercial(propiedades);
  }
}
