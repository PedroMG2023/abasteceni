import { useCallback, useState } from 'react';
import { validar, type Validador } from '../componentes/validadores';

export type Errores<N extends string> = Partial<Record<N, string>>;

// Estado y validación de un formulario, independiente de su presentación (AS-04).
export function useFormulario<N extends string>(definiciones: readonly { nombre: N; validadores: readonly Validador[] }[]) {
  const [valores, setValores] = useState<Record<N, string>>(
    () => Object.fromEntries(definiciones.map((d) => [d.nombre, ''])) as Record<N, string>,
  );
  const [errores, setErrores] = useState<Errores<N>>({});

  const cambiar = useCallback((nombre: N, valor: string) => {
    setValores((actuales) => ({ ...actuales, [nombre]: valor }));
    setErrores((actuales) => ({ ...actuales, [nombre]: undefined }));
  }, []);

  const validarTodo = useCallback((): boolean => {
    const nuevos: Errores<N> = {};
    for (const definicion of definiciones) {
      const mensaje = validar(valores[definicion.nombre], definicion.validadores);
      if (mensaje) nuevos[definicion.nombre] = mensaje;
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }, [definiciones, valores]);

  return { valores, errores, cambiar, validarTodo, asignarErrores: setErrores };
}
