import { useEffect, useState } from 'react';
import { useClienteApi } from '../contexto/cliente-api';

export type EstadoServicio = 'consultando' | 'operativo' | 'sin-respuesta';

// Consulta la sonda de vitalidad del servicio de aplicación a través del
// puerto ClienteApi. Expone solo el estado que la vista consume.
export function useSalud(): EstadoServicio {
  const cliente = useClienteApi();
  const [estado, setEstado] = useState<EstadoServicio>('consultando');

  useEffect(() => {
    let vigente = true;
    cliente
      .consultarSalud()
      .then((salud) => vigente && setEstado(salud.estado))
      .catch(() => vigente && setEstado('sin-respuesta'));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  return estado;
}
