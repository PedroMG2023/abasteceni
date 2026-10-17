import { useCallback, useState } from 'react';
import { CAMPOS_REGISTRO, type CampoRegistro } from '../componentes/campos-registro';
import { useClienteApi } from '../contexto/cliente-api';
import { ErrorApi, type CuentaRegistrada, type SolicitudRegistroCuenta } from '../puertos/cliente-api';
import { useFormulario, type Errores } from './useFormulario';

export type EstadoEnvio = 'editando' | 'enviando' | 'registrada';

const MENSAJE_SIN_CONEXION = 'No se pudo enviar la solicitud. Revise su conexión e intente de nuevo.';

// Caso de uso «registrar cuenta comercial» en la capa 1 (SYS-FN-01; AS-04):
// estado y envío, sin presentación ni transporte.
export function useRegistroCuenta() {
  const cliente = useClienteApi();
  const formulario = useFormulario(CAMPOS_REGISTRO);
  const [estado, setEstado] = useState<EstadoEnvio>('editando');
  const [aviso, setAviso] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<CuentaRegistrada | null>(null);
  const { valores, validarTodo, asignarErrores } = formulario;

  const enviar = useCallback(async () => {
    setAviso(null);
    if (!validarTodo()) return;
    setEstado('enviando');
    try {
      setCuenta(await cliente.registrarCuenta(valores as SolicitudRegistroCuenta));
      setEstado('registrada');
    } catch (error) {
      setEstado('editando');
      if (error instanceof ErrorApi) {
        const porCampo: Errores<CampoRegistro> = {};
        for (const detalle of error.cuerpo.detalles ?? []) porCampo[detalle.campo as CampoRegistro] = detalle.mensaje;
        asignarErrores(porCampo);
        setAviso(error.cuerpo.mensaje);
      } else {
        setAviso(MENSAJE_SIN_CONEXION);
      }
    }
  }, [cliente, valores, validarTodo, asignarErrores]);

  return {
    valores: formulario.valores,
    errores: formulario.errores,
    cambiar: formulario.cambiar,
    enviar,
    estado,
    aviso,
    cuenta,
  };
}
