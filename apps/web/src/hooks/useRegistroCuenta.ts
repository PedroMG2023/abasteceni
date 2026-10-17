import { useCallback, useState } from 'react';
import { CAMPOS_REGISTRO, type CampoRegistro } from '../componentes/campos-registro';
import { MENSAJES_ADJUNTOS, TAMANO_MAXIMO_REGISTRO_LEGAL } from '../componentes/consentimiento';
import { useClienteApi } from '../contexto/cliente-api';
import { ErrorApi, type CuentaRegistrada, type SolicitudRegistroCuenta } from '../puertos/cliente-api';
import { useFormulario, type Errores } from './useFormulario';

export type EstadoEnvio = 'editando' | 'enviando' | 'registrada';
type CampoAdjunto = 'registroLegal' | 'aceptaConsentimiento';

const MENSAJE_SIN_CONEXION = 'No se pudo enviar la solicitud. Revise su conexión e intente de nuevo.';

function comprobarArchivo(archivo: File | null): string | undefined {
  if (!archivo) return MENSAJES_ADJUNTOS.registroLegalObligatorio;
  if (archivo.size > TAMANO_MAXIMO_REGISTRO_LEGAL) return MENSAJES_ADJUNTOS.registroLegalTamano;
  if (!/\.(pdf|jpe?g)$/i.test(archivo.name)) return MENSAJES_ADJUNTOS.registroLegalFormato;
  return undefined;
}

// Caso de uso «registrar cuenta comercial» en la capa 1 (SYS-FN-01, 02 y 36;
// AS-04): estado y envío, sin presentación ni transporte.
export function useRegistroCuenta() {
  const cliente = useClienteApi();
  const formulario = useFormulario(CAMPOS_REGISTRO);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [consentimiento, setConsentimiento] = useState(false);
  const [erroresAdjuntos, setErroresAdjuntos] = useState<Errores<CampoAdjunto>>({});
  const [estado, setEstado] = useState<EstadoEnvio>('editando');
  const [aviso, setAviso] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<CuentaRegistrada | null>(null);
  const { valores, validarTodo, asignarErrores } = formulario;

  const elegirArchivo = useCallback((elegido: File | null) => {
    setArchivo(elegido);
    setErroresAdjuntos((actuales) => ({ ...actuales, registroLegal: undefined }));
  }, []);

  const aceptarConsentimiento = useCallback((aceptado: boolean) => {
    setConsentimiento(aceptado);
    setErroresAdjuntos((actuales) => ({ ...actuales, aceptaConsentimiento: undefined }));
  }, []);

  const enviar = useCallback(async () => {
    setAviso(null);
    const camposValidos = validarTodo();
    const adjuntos: Errores<CampoAdjunto> = {
      registroLegal: comprobarArchivo(archivo),
      aceptaConsentimiento: consentimiento ? undefined : MENSAJES_ADJUNTOS.consentimiento,
    };
    setErroresAdjuntos(adjuntos);
    if (!camposValidos || adjuntos.registroLegal || adjuntos.aceptaConsentimiento) return;
    setEstado('enviando');
    try {
      const solicitud = { ...valores, aceptaConsentimiento: true, registroLegal: archivo } as SolicitudRegistroCuenta;
      setCuenta(await cliente.registrarCuenta(solicitud));
      setEstado('registrada');
    } catch (error) {
      setEstado('editando');
      if (error instanceof ErrorApi) {
        const porCampo: Errores<CampoRegistro> = {};
        const porAdjunto: Errores<CampoAdjunto> = {};
        for (const detalle of error.cuerpo.detalles ?? []) {
          if (detalle.campo === 'registroLegal' || detalle.campo === 'aceptaConsentimiento') porAdjunto[detalle.campo] = detalle.mensaje;
          else porCampo[detalle.campo as CampoRegistro] = detalle.mensaje;
        }
        if (error.cuerpo.codigo === 'DOCUMENTO_DEMASIADO_GRANDE') porAdjunto.registroLegal = error.cuerpo.mensaje;
        asignarErrores(porCampo);
        setErroresAdjuntos(porAdjunto);
        setAviso(error.cuerpo.mensaje);
      } else {
        setAviso(MENSAJE_SIN_CONEXION);
      }
    }
  }, [cliente, valores, validarTodo, asignarErrores, archivo, consentimiento]);

  return {
    valores: formulario.valores,
    errores: { ...formulario.errores, ...erroresAdjuntos },
    cambiar: formulario.cambiar,
    elegirArchivo,
    consentimiento,
    aceptarConsentimiento,
    enviar,
    estado,
    aviso,
    cuenta,
  };
}
