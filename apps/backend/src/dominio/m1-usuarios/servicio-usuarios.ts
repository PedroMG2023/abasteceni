import type { RegistroCredenciales } from '../m2-seguridad';
import {
  ErrorConflicto,
  ErrorValidacion,
  type PuertoIdentificadores,
  type PuertoPublicacionEventos,
  type PuertoReloj,
  type PuertoUnidadTrabajo,
} from '../puertos';
import { CuentaComercial, type DatosCuenta } from './cuenta-comercial';
import { CUENTA_REGISTRADA, type CuentaRegistrada } from './eventos';
import type { PuertoRepositorioUsuarios } from './repositorio';
import type { EstadoCuenta } from './tipos';

export interface SolicitudRegistro extends DatosCuenta {
  readonly contrasena: string;
}

export interface DependenciasUsuarios {
  repositorio: PuertoRepositorioUsuarios;
  unidadTrabajo: PuertoUnidadTrabajo;
  eventos: PuertoPublicacionEventos;
  credenciales: RegistroCredenciales;
  reloj: PuertoReloj;
  identificadores: PuertoIdentificadores;
}

// Servicio del módulo M1 (R-04: un servicio por módulo). Orquesta el
// repositorio, la credencial de M2 y la bandeja de salida; las reglas de la
// cuenta viven en CuentaComercial (AS-01).
export class ServicioUsuarios {
  constructor(private readonly d: DependenciasUsuarios) {}

  // SYS-FN-01, CT-REG-01. La cuenta, su credencial y el evento CuentaRegistrada
  // se confirman o se revierten juntos (ADR-01).
  async registrar(solicitud: Partial<SolicitudRegistro>): Promise<{ id: string; estado: EstadoCuenta }> {
    const detalles = [
      ...CuentaComercial.validar(solicitud),
      ...this.d.credenciales.validarDatosCredencial(solicitud),
    ];
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const datos = solicitud as SolicitudRegistro;

    const ahora = this.d.reloj.ahora();
    const cuenta = CuentaComercial.registrar(datos, { id: this.d.identificadores.generar(), ahora });
    const evento: CuentaRegistrada = {
      id: this.d.identificadores.generar(),
      tipo: CUENTA_REGISTRADA,
      ocurridoEn: ahora,
      datos: { cuentaId: cuenta.id, tipo: cuenta.tipo, telefonoMovil: cuenta.telefonoMovil, correo: cuenta.correo },
    };

    await this.d.unidadTrabajo.ejecutar(async (tx) => {
      if (await this.d.repositorio.existeRuc(cuenta.ruc.numero, tx)) throw new ErrorConflicto('RUC_REGISTRADO');
      await this.d.credenciales.registrarCredencial(
        { cuentaId: cuenta.id, correo: datos.correo, contrasena: datos.contrasena, rol: cuenta.tipo },
        tx,
      );
      await this.d.repositorio.guardar(cuenta, tx);
      await this.d.eventos.publicar(evento, tx);
    });
    return { id: cuenta.id, estado: cuenta.estado };
  }

  listar(filtro: { estado?: EstadoCuenta } = {}): Promise<CuentaComercial[]> {
    return this.d.repositorio.listar(filtro);
  }
}
