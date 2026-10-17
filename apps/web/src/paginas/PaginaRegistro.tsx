import type { FormEvent } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { CampoFormulario } from '../componentes/CampoFormulario';
import { CAMPOS_REGISTRO } from '../componentes/campos-registro';
import { useRegistroCuenta } from '../hooks/useRegistroCuenta';

// Registro de una cuenta comercial (SYS-FN-01). Solo renderiza; el estado y el
// envío los provee el hook del caso de uso (AS-04).
export function PaginaRegistro() {
  const { valores, errores, cambiar, enviar, estado, aviso, cuenta } = useRegistroCuenta();

  if (estado === 'registrada' && cuenta) {
    return (
      <main>
        <h1>Solicitud registrada</h1>
        <AvisoFormulario tipo="exito" texto={`Su cuenta quedó en estado «${cuenta.estado}». Le avisaremos cuando sea validada.`} />
        <p>
          <a href="#/">Volver al inicio</a>
        </p>
      </main>
    );
  }

  const alEnviar = (evento: FormEvent) => {
    evento.preventDefault();
    void enviar();
  };

  return (
    <main>
      <h1>Registrar una cuenta comercial</h1>
      <form onSubmit={alEnviar} noValidate>
        {aviso && <AvisoFormulario tipo="error" texto={aviso} />}
        {CAMPOS_REGISTRO.map((definicion) => (
          <CampoFormulario
            key={definicion.nombre}
            definicion={definicion}
            valor={valores[definicion.nombre]}
            error={errores[definicion.nombre]}
            alCambiar={(valor) => cambiar(definicion.nombre, valor)}
          />
        ))}
        <button type="submit" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Registrar cuenta'}
        </button>
      </form>
    </main>
  );
}
