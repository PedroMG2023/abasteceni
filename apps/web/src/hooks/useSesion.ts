import { useCallback, useEffect, useState } from 'react';
import { useClienteApi } from '../contexto/cliente-api';
import { ErrorApi, type Identidad, type SolicitudInicioSesion } from '../puertos/cliente-api';

const MENSAJE_SIN_CONEXION = 'No se pudo contactar con el servicio. Intente de nuevo.';

// Caso de uso «iniciar y cerrar sesión» en la capa 1 (SYS-FN-04; ADR-04). Al
// montarse intenta recuperar la sesión con la credencial de renovación.
export function useSesion() {
  const cliente = useClienteApi();
  const [identidad, setIdentidad] = useState<Identidad | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    cliente
      .renovarSesion()
      .then((recuperada) => vigente && setIdentidad(recuperada))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const iniciar = useCallback(
    async (datos: SolicitudInicioSesion) => {
      setAviso(null);
      setOcupado(true);
      try {
        setIdentidad(await cliente.iniciarSesion(datos));
      } catch (error) {
        setAviso(error instanceof ErrorApi ? error.cuerpo.mensaje : MENSAJE_SIN_CONEXION);
      } finally {
        setOcupado(false);
      }
    },
    [cliente],
  );

  const cerrar = useCallback(async () => {
    await cliente.cerrarSesion().catch(() => undefined);
    setIdentidad(null);
  }, [cliente]);

  return { identidad, aviso, ocupado, iniciar, cerrar };
}
