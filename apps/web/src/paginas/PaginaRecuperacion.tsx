import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { CampoFormulario } from '../componentes/CampoFormulario';
import { CAMPOS_SOLICITUD_RECUPERACION } from '../componentes/campos-recuperacion';
import { useFormulario } from '../hooks/useFormulario';
import { useRecuperacion } from '../hooks/useRecuperacion';

// Solicitud del enlace de recuperación (SYS-FN-05). El aviso es el mismo exista
// o no el correo (DIS-36). Solo renderiza; el envío lo provee el hook (AS-04).
export function PaginaRecuperacion() {
  const { valores, errores, cambiar, validarTodo, asignarErrores } = useFormulario(CAMPOS_SOLICITUD_RECUPERACION);
  const { aviso, ocupado, solicitar } = useRecuperacion();
  const formulario = useRef<HTMLFormElement>(null);
  const [rechazos, setRechazos] = useState(0);

  useEffect(() => {
    if (aviso?.campo?.nombre === 'correo') asignarErrores({ correo: aviso.campo.mensaje });
  }, [aviso, asignarErrores]);

  // Tras un envío rechazado, el foco va al campo con error (ISO 9241-110; WCAG 3.3.1).
  useEffect(() => {
    if (rechazos > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [rechazos]);

  if (aviso?.tipo === 'exito') {
    return (
      <main>
        <h1>Recuperar la contraseña</h1>
        <AvisoFormulario tipo="exito" texto={aviso.texto} />
        <p>
          <a href="#/sesion">Volver a iniciar sesión</a>
        </p>
      </main>
    );
  }

  const alEnviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!validarTodo()) {
      setRechazos((n) => n + 1);
      return;
    }
    void solicitar(valores.correo);
  };

  return (
    <main>
      <h1>Recuperar la contraseña</h1>
      <form ref={formulario} onSubmit={alEnviar} noValidate>
        {aviso && !aviso.campo && <AvisoFormulario tipo="error" texto={aviso.texto} />}
        {CAMPOS_SOLICITUD_RECUPERACION.map((definicion) => (
          <CampoFormulario
            key={definicion.nombre}
            definicion={definicion}
            valor={valores[definicion.nombre]}
            error={errores[definicion.nombre]}
            alCambiar={(valor) => cambiar(definicion.nombre, valor)}
          />
        ))}
        <button type="submit" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
    </main>
  );
}
