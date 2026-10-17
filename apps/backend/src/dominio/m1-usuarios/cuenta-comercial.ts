import type { DetalleValidacion } from '../puertos';
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

  // Campos obligatorios de SYS-FN-01 más el tipo (DIS-17), el teléfono (DIS-19)
  // y el correo (DIS-16). Devuelve todas las infracciones a la vez.
  static validar(datos: Partial<DatosCuenta>): DetalleValidacion[] {
    const detalles: DetalleValidacion[] = [];
    const texto = (campo: keyof DatosCuenta) => (datos[campo] ?? '').trim();

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

    return detalles;
  }

  // Registro en estado «Pendiente de validación» (SYS-FN-01, CT-REG-01).
  // Precondición: validar(datos) no devolvió infracciones.
  static registrar(datos: DatosCuenta, contexto: { id: string; ahora: Date }): CuentaComercial {
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
    });
  }

  // El repositorio reconstruye la entidad desde la fila (R-04, patrón graduado).
  static reconstruir(propiedades: PropiedadesCuenta): CuentaComercial {
    return new CuentaComercial(propiedades);
  }
}
