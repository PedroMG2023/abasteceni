import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { CampoFormulario } from '../componentes/CampoFormulario';
import { CAMPOS_RESTABLECIMIENTO } from '../componentes/campos-recuperacion';
import { useFormulario } from '../hooks/useFormulario';
import { useRecuperacion } from '../hooks/useRecuperacion';

// Restablecimiento de la contraseña con el secreto del enlace (SYS-FN-05). Si el
// enlace venció o ya se usó, ofrece pedir otro (ISO 9241-110, tolerancia a errores).
export function PaginaRestablecimiento({ secreto }: { readonly secreto: string }) {
  const { valores, errores, cambiar, validarTodo, asignarErrores } = useFormulario(CAMPOS_RESTABLECIMIENTO);
  const { aviso, ocupado, restablecer } = useRecuperacion();
  const formulario = useRef<HTMLFormElement>(null);
  const [rechazos, setRechazos] = useState(0);

  useEffect(() => {
    if (aviso?.campo?.nombre === 'contrasena') asignarErrores({ contrasena: aviso.campo.mensaje });
  }, [aviso, asignarErrores]);

  useEffect(() => {
    if (rechazos > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [rechazos]);

  if (aviso?.tipo === 'exito') {
    return (
      <main>
        <h1>Restablecer la contraseña</h1>
        <AvisoFormulario tipo="exito" texto={aviso.texto} />
        <p>
          <a href="#/sesion">Iniciar sesión</a>
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
    void restablecer(secreto, valores.contrasena);
  };

  return (
    <main>
      <h1>Restablecer la contraseña</h1>
      <form ref={formulario} onSubmit={alEnviar} noValidate>
        {aviso && !aviso.campo && <AvisoFormulario tipo="error" texto={aviso.texto} />}
        {aviso?.codigo === 'ENLACE_VENCIDO' && (
          <p>
            <a href="#/recuperacion">Solicitar un enlace nuevo</a>
          </p>
        )}
        {CAMPOS_RESTABLECIMIENTO.map((definicion) => (
          <CampoFormulario
            key={definicion.nombre}
            definicion={definicion}
            valor={valores[definicion.nombre]}
            error={errores[definicion.nombre]}
            alCambiar={(valor) => cambiar(definicion.nombre, valor)}
          />
        ))}
        <button type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar la contraseña'}
        </button>
      </form>
    </main>
  );
}
