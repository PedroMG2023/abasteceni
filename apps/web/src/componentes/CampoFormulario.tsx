import type { Validador } from './validadores';

// Definición de un campo: el formulario se arma componiendo definiciones con su
// ayuda contextual (SYS-NFN-11) y sus validadores, sin modificar el componente (AS-07).
export interface DefinicionCampo<N extends string = string> {
  readonly nombre: N;
  readonly etiqueta: string;
  readonly ayuda?: string;
  readonly tipo?: 'text' | 'email' | 'tel' | 'password';
  readonly opciones?: readonly string[];
  readonly autoComplete?: string;
  readonly validadores: readonly Validador[];
}

interface Propiedades {
  readonly definicion: Omit<DefinicionCampo, 'validadores'>;
  readonly valor: string;
  readonly error?: string | null;
  readonly alCambiar: (valor: string) => void;
}

// Campo de formulario accesible (WCAG 2.1, ISO 9241-110): etiqueta asociada,
// ayuda y error enlazados con aria-describedby. Solo renderiza (AS-04).
export function CampoFormulario({ definicion, valor, error, alCambiar }: Propiedades) {
  const id = `campo-${definicion.nombre}`;
  const descripciones = [definicion.ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const comunes = {
    id,
    name: definicion.nombre,
    value: valor,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': descripciones,
  };

  return (
    <div className="campo">
      <label htmlFor={id}>{definicion.etiqueta}</label>
      {definicion.opciones ? (
        <select {...comunes} onChange={(e) => alCambiar(e.target.value)}>
          <option value="">Seleccione…</option>
          {definicion.opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      ) : (
        <input {...comunes} type={definicion.tipo ?? 'text'} autoComplete={definicion.autoComplete} onChange={(e) => alCambiar(e.target.value)} />
      )}
      {definicion.ayuda && (
        <p id={`${id}-ayuda`} className="ayuda">
          {definicion.ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
