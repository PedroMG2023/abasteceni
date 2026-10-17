import { useState } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { useValidacionCuentas } from '../hooks/useValidacionCuentas';

// Panel del Administrador de la plataforma (SYS-FN-03, CT-SEG-04; DIS-31):
// solicitudes pendientes con su documento y las acciones Aprobar y Rechazar.
export function PanelAdministrador() {
  const { pendientes, cargando, aviso, aprobar, rechazar, verDocumento } = useValidacionCuentas();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  return (
    <section aria-labelledby="titulo-panel">
      <h2 id="titulo-panel">Panel del Administrador de la plataforma</h2>
      {aviso && <AvisoFormulario tipo={aviso.startsWith('Cuenta') ? 'exito' : 'error'} texto={aviso} />}
      {!cargando && pendientes.length === 0 && <p>No hay solicitudes pendientes de validación.</p>}
      <ul className="cuentas">
        {pendientes.map((cuenta) => (
          <li key={cuenta.id}>
            <h3>{cuenta.razonSocial}</h3>
            <p>
              {cuenta.tipo} · RUC {cuenta.ruc} · {cuenta.municipio}, {cuenta.departamento} · {cuenta.rubro}
            </p>
            <div className="acciones">
              <button type="button" onClick={() => void verDocumento(cuenta.id)}>
                Ver documento
              </button>
              <button type="button" onClick={() => void aprobar(cuenta.id)}>
                Aprobar
              </button>
              <button type="button" onClick={() => setRechazando(cuenta.id)}>
                Rechazar
              </button>
            </div>
            {rechazando === cuenta.id && (
              <div className="campo">
                <label htmlFor={`motivo-${cuenta.id}`}>Motivo del rechazo</label>
                <textarea id={`motivo-${cuenta.id}`} value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} />
                <button
                  type="button"
                  onClick={() =>
                    void rechazar(cuenta.id, motivo).then((hecho) => {
                      if (hecho) {
                        setRechazando(null);
                        setMotivo('');
                      }
                    })
                  }
                >
                  Confirmar rechazo
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
