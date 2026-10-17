import { useCallback, useEffect, useState } from 'react';
import { useClienteApi } from '../contexto/cliente-api';
import { ErrorApi, type ResumenCuenta } from '../puertos/cliente-api';

const MENSAJE_SIN_CONEXION = 'No se pudo contactar con el servicio. Intente de nuevo.';

// Caso de uso «validar cuentas comerciales» del Administrador de la plataforma
// (SYS-FN-03; D1 PM-01, actividades 4 y 5).
export function useValidacionCuentas() {
  const cliente = useClienteApi();
  const [pendientes, setPendientes] = useState<ResumenCuenta[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    cliente
      .listarCuentas('Pendiente de validación')
      .then((cuentas) => vigente && setPendientes(cuentas))
      .catch((error: unknown) => vigente && setAviso(error instanceof ErrorApi ? error.cuerpo.mensaje : MENSAJE_SIN_CONEXION))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const decidir = useCallback(
    async (id: string, decision: 'aprobar' | 'rechazar', justificacion?: string) => {
      setAviso(null);
      try {
        const cuenta = await cliente.validarCuenta(id, decision === 'rechazar' ? { decision, justificacion } : { decision });
        setPendientes((actuales) => actuales.filter((c) => c.id !== id));
        setAviso(cuenta.estado === 'Activa' ? `Cuenta aprobada: ${cuenta.razonSocial}.` : `Cuenta rechazada: ${cuenta.razonSocial}.`);
        return true;
      } catch (error) {
        setAviso(error instanceof ErrorApi ? (error.cuerpo.detalles?.[0]?.mensaje ?? error.cuerpo.mensaje) : MENSAJE_SIN_CONEXION);
        return false;
      }
    },
    [cliente],
  );

  const verDocumento = useCallback(
    async (id: string) => {
      try {
        const documento = await cliente.obtenerRegistroLegal(id);
        window.open(URL.createObjectURL(documento), '_blank', 'noopener');
      } catch {
        setAviso('No se pudo abrir el documento de registro legal.');
      }
    },
    [cliente],
  );

  return { pendientes, cargando, aviso, aprobar: (id: string) => decidir(id, 'aprobar'), rechazar: (id: string, motivo: string) => decidir(id, 'rechazar', motivo), verDocumento };
}
