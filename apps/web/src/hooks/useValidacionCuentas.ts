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

  const cargar = useCallback(async () => {
    try {
      setPendientes(await cliente.listarCuentas('Pendiente de validación'));
    } catch (error) {
      setAviso(error instanceof ErrorApi ? error.cuerpo.mensaje : MENSAJE_SIN_CONEXION);
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

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
