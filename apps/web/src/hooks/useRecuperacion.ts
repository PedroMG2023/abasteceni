import { useCallback, useState } from 'react';
import { useClienteApi } from '../contexto/cliente-api';
import { ErrorApi } from '../puertos/cliente-api';

const MENSAJE_SIN_CONEXION = 'No se pudo contactar con el servicio. Intente de nuevo.';

export interface AvisoRecuperacion {
  readonly tipo: 'exito' | 'error';
  readonly texto: string;
  // Código de la API, para ofrecer el paso siguiente (p. ej., ENLACE_VENCIDO).
  readonly codigo?: string;
  // Error de validación de un campo, si la API lo señaló.
  readonly campo?: { readonly nombre: string; readonly mensaje: string };
}

// Caso de uso «recuperar la contraseña» en la capa 1 (SYS-FN-05; DIS-36): los
// textos de éxito y de error son los que devuelve la API.
export function useRecuperacion() {
  const cliente = useClienteApi();
  const [aviso, setAviso] = useState<AvisoRecuperacion | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = useCallback(async (operacion: () => Promise<string>) => {
    setAviso(null);
    setOcupado(true);
    try {
      setAviso({ tipo: 'exito', texto: await operacion() });
      return true;
    } catch (error) {
      if (!(error instanceof ErrorApi)) setAviso({ tipo: 'error', texto: MENSAJE_SIN_CONEXION });
      else {
        const [detalle] = error.cuerpo.detalles ?? [];
        setAviso({
          tipo: 'error',
          texto: error.cuerpo.mensaje,
          codigo: error.cuerpo.codigo,
          campo: detalle ? { nombre: detalle.campo, mensaje: detalle.mensaje } : undefined,
        });
      }
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);

  const solicitar = useCallback((correo: string) => ejecutar(() => cliente.solicitarRecuperacion(correo)), [cliente, ejecutar]);
  const restablecer = useCallback(
    (secreto: string, contrasena: string) => ejecutar(() => cliente.restablecerContrasena({ secreto, contrasena })),
    [cliente, ejecutar],
  );

  return { aviso, ocupado, solicitar, restablecer };
}
