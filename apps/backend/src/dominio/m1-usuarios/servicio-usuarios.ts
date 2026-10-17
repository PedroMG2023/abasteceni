import type { RegistroCredenciales } from '../m2-seguridad';
import { ACCIONES_BITACORA } from '../m9-administracion';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorValidacion,
  type AsientoBitacora,
  type ContextoSolicitud,
  type DocumentoAlmacenado,
  type PuertoAlmacenDocumentos,
  type PuertoBitacora,
  type PuertoIdentificadores,
  type PuertoPublicacionEventos,
  type PuertoReloj,
  type PuertoUnidadTrabajo,
} from '../puertos';
import { VERSION_CONSENTIMIENTO } from './consentimiento';
import { CuentaComercial, type AdjuntosRegistro, type DatosCuenta } from './cuenta-comercial';
import { CUENTA_APROBADA, CUENTA_RECHAZADA, CUENTA_REGISTRADA, type CuentaAprobada, type CuentaRechazada, type CuentaRegistrada } from './eventos';
import type { Decision } from './maquina-estados';
import { tipoPorContenido, type TipoRegistroLegal } from './registro-legal';
import type { PuertoRepositorioUsuarios } from './repositorio';
import { EstadoCuenta } from './tipos';

export interface SolicitudRegistro extends DatosCuenta, AdjuntosRegistro {
  readonly contrasena: string;
}

export interface SolicitudValidacion {
  readonly cuentaId: string;
  readonly decision: Decision;
  readonly justificacion?: string;
}

export interface DependenciasUsuarios {
  repositorio: PuertoRepositorioUsuarios;
  unidadTrabajo: PuertoUnidadTrabajo;
  eventos: PuertoPublicacionEventos;
  bitacora: PuertoBitacora;
  almacen: PuertoAlmacenDocumentos;
  credenciales: RegistroCredenciales;
  reloj: PuertoReloj;
  identificadores: PuertoIdentificadores;
}

const RECURSO_CUENTA = 'CuentaComercial';

// Servicio del módulo M1 (R-04: un servicio por módulo). Orquesta el
// repositorio, la credencial de M2, la bitácora de M9 y la bandeja de salida;
// las reglas de la cuenta viven en CuentaComercial y su máquina de estados (AS-01).
export class ServicioUsuarios {
  constructor(private readonly d: DependenciasUsuarios) {}

  // SYS-FN-01, 02 y 36 (CT-REG-01, CT-REG-02). El documento se guarda en el
  // almacén y, en una transacción, la cuenta, su credencial, los asientos de
  // bitácora (registro, consentimiento y documento) y el evento CuentaRegistrada
  // (ADR-01, SYS-FN-35). Si la transacción se revierte, el documento se elimina.
  async registrar(solicitud: Partial<SolicitudRegistro>, contexto: ContextoSolicitud): Promise<{ id: string; estado: EstadoCuenta }> {
    const detalles = [...CuentaComercial.comprobarDatos(solicitud), ...this.d.credenciales.validarDatosCredencial(solicitud)];
    if (detalles.length > 0) throw new ErrorValidacion(detalles);
    const datos = solicitud as SolicitudRegistro;

    const ahora = this.d.reloj.ahora();
    const tipo = tipoPorContenido(datos.registroLegal) as TipoRegistroLegal;
    const registroLegal = { clave: this.d.identificadores.generar(), tipo };
    const cuenta = CuentaComercial.registrar(datos, { id: this.d.identificadores.generar(), ahora, registroLegal });
    const evento: CuentaRegistrada = {
      id: this.d.identificadores.generar(),
      tipo: CUENTA_REGISTRADA,
      ocurridoEn: ahora,
      datos: { cuentaId: cuenta.id, tipo: cuenta.tipo, telefonoMovil: cuenta.telefonoMovil, correo: cuenta.correo },
    };

    await this.d.almacen.guardar(registroLegal.clave, { contenido: datos.registroLegal, tipo });
    try {
      await this.d.unidadTrabajo.ejecutar(async (tx) => {
        if (await this.d.repositorio.existeRuc(cuenta.ruc.numero, tx)) throw new ErrorConflicto('RUC_REGISTRADO');
        const usuarioId = await this.d.credenciales.registrarCredencial(
          { cuentaId: cuenta.id, correo: datos.correo, contrasena: datos.contrasena, rol: cuenta.tipo },
          tx,
        );
        await this.d.repositorio.guardar(cuenta, tx);
        const actor = { ...contexto, usuarioId };
        await this.d.bitacora.registrar(this.asiento(ACCIONES_BITACORA.cuentaRegistrada, cuenta.id, actor, {}), tx);
        await this.d.bitacora.registrar(
          this.asiento(ACCIONES_BITACORA.consentimientoAceptado, cuenta.id, actor, {
            version: VERSION_CONSENTIMIENTO,
            aceptadoEn: cuenta.consentimientoAceptadoEn.toISOString(),
          }),
          tx,
        );
        await this.d.bitacora.registrar(
          this.asiento(ACCIONES_BITACORA.registroLegalCargado, cuenta.id, actor, { tipo, bytes: datos.registroLegal.length }),
          tx,
        );
        await this.d.eventos.publicar(evento, tx);
      });
    } catch (error) {
      await this.d.almacen.eliminar(registroLegal.clave);
      throw error;
    }
    return { id: cuenta.id, estado: cuenta.estado };
  }

  // Documento de registro legal para la revisión del Administrador (PM-01,
  // actividad 4; V-03: acceso restringido al propietario y al Administrador).
  async obtenerRegistroLegal(cuentaId: string): Promise<DocumentoAlmacenado> {
    const cuenta = await this.d.repositorio.buscarPorId(cuentaId);
    const documento = cuenta && (await this.d.almacen.obtener(cuenta.registroLegal.clave));
    if (!documento) throw new ErrorNoEncontrado('CUENTA_NO_ENCONTRADA');
    return documento;
  }

  // SYS-FN-03, CT-ADM-03. La transición pertenece a M1 (D3 §2.9.2) y el asiento
  // con el resultado y la justificación se escribe por el puerto de bitácora de
  // M9, en la misma transacción que el cambio de estado y la habilitación de la
  // credencial (DIS-25).
  async validarCuenta(solicitud: SolicitudValidacion, contexto: ContextoSolicitud): Promise<CuentaComercial> {
    const justificacion = solicitud.justificacion?.trim() || undefined;
    return this.d.unidadTrabajo.ejecutar(async (tx) => {
      const cuenta = await this.d.repositorio.buscarPorId(solicitud.cuentaId, tx);
      if (!cuenta) throw new ErrorNoEncontrado('CUENTA_NO_ENCONTRADA');
      const validada = cuenta.validar(solicitud.decision, justificacion);
      const aprobada = validada.estado === EstadoCuenta.Activa;

      await this.d.repositorio.guardar(validada, tx);
      await this.d.credenciales.cambiarHabilitacion(validada.id, aprobada ? 'habilitada' : 'rechazada', tx);
      await this.d.bitacora.registrar(
        this.asiento(
          aprobada ? ACCIONES_BITACORA.cuentaAprobada : ACCIONES_BITACORA.cuentaRechazada,
          validada.id,
          contexto,
          justificacion ? { resultado: validada.estado, justificacion } : { resultado: validada.estado },
        ),
        tx,
      );
      const contacto = { cuentaId: validada.id, telefonoMovil: validada.telefonoMovil, correo: validada.correo };
      const evento: CuentaAprobada | CuentaRechazada = aprobada
        ? { id: this.d.identificadores.generar(), tipo: CUENTA_APROBADA, ocurridoEn: this.d.reloj.ahora(), datos: contacto }
        : { id: this.d.identificadores.generar(), tipo: CUENTA_RECHAZADA, ocurridoEn: this.d.reloj.ahora(), datos: { ...contacto, justificacion: justificacion! } };
      await this.d.eventos.publicar(evento, tx);
      return validada;
    });
  }

  listar(filtro: { estado?: EstadoCuenta } = {}): Promise<CuentaComercial[]> {
    return this.d.repositorio.listar(filtro);
  }

  private asiento(accion: string, cuentaId: string, contexto: ContextoSolicitud, detalle: Record<string, unknown>): AsientoBitacora {
    return {
      id: this.d.identificadores.generar(),
      usuarioId: contexto.usuarioId,
      accion,
      recurso: { tipo: RECURSO_CUENTA, id: cuentaId },
      detalle,
      ip: contexto.ip,
      registradoEn: this.d.reloj.ahora(),
    };
  }
}
