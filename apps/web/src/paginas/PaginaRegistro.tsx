import { useEffect, useRef, type FormEvent } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { CampoFormulario } from '../componentes/CampoFormulario';
import { CAMPOS_REGISTRO } from '../componentes/campos-registro';
import { TEXTO_CONSENTIMIENTO, TIPOS_ACEPTADOS } from '../componentes/consentimiento';
import { useRegistroCuenta } from '../hooks/useRegistroCuenta';

// Registro de una cuenta comercial (SYS-FN-01). Solo renderiza; el estado y el
// envío los provee el hook del caso de uso (AS-04).
export function PaginaRegistro() {
  const { valores, errores, cambiar, elegirArchivo, consentimiento, aceptarConsentimiento, enviar, estado, aviso, cuenta, rechazos } = useRegistroCuenta();
  const formulario = useRef<HTMLFormElement>(null);

  // Tras un envío rechazado, el foco va al primer campo con error, que anuncia su
  // mensaje (ISO 9241-110, robustez frente a errores de uso; WCAG 3.3.1).
  useEffect(() => {
    if (rechazos > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [rechazos]);

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
      <form ref={formulario} onSubmit={alEnviar} noValidate>
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
        <div className="campo">
          <label htmlFor="campo-registroLegal">Registro legal (Cédula RUC o patente municipal)</label>
          <input
            id="campo-registroLegal"
            name="registroLegal"
            type="file"
            accept={TIPOS_ACEPTADOS}
            aria-invalid={errores.registroLegal ? true : undefined}
            aria-describedby={['campo-registroLegal-ayuda', errores.registroLegal ? 'campo-registroLegal-error' : ''].join(' ').trim()}
            onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
          />
          <p id="campo-registroLegal-ayuda" className="ayuda">
            PDF o JPG, máximo 5 MB.
          </p>
          {errores.registroLegal && (
            <p id="campo-registroLegal-error" className="error" role="alert">
              {errores.registroLegal}
            </p>
          )}
        </div>
        <div className="campo consentimiento">
          <label>
            <input
              type="checkbox"
              name="aceptaConsentimiento"
              checked={consentimiento}
              aria-invalid={errores.aceptaConsentimiento ? true : undefined}
              onChange={(e) => aceptarConsentimiento(e.target.checked)}
            />{' '}
            {TEXTO_CONSENTIMIENTO}
          </label>
          {errores.aceptaConsentimiento && (
            <p className="error" role="alert">
              {errores.aceptaConsentimiento}
            </p>
          )}
        </div>
        <button type="submit" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Registrar cuenta'}
        </button>
      </form>
    </main>
  );
}
