import { useEffect, useState } from 'react';

export type Ruta = 'inicio' | 'registro' | 'sesion' | 'recuperacion' | 'restablecer';

// Página activa y, en «restablecer», el secreto del enlace de recuperación (SYS-FN-05).
export interface Ubicacion {
  readonly ruta: Ruta;
  readonly parametro: string | null;
}

const RUTAS: readonly Ruta[] = ['registro', 'sesion', 'recuperacion', 'restablecer'];

function leer(): Ubicacion {
  const [nombre, ...resto] = window.location.hash.replace(/^#\/?/, '').split('/');
  const ruta = RUTAS.find((r) => r === nombre) ?? 'inicio';
  const parametro = resto.join('/');
  return { ruta, parametro: parametro ? decodeURIComponent(parametro) : null };
}

// Navegación por fragmento, sin dependencias adicionales (SYS-NFN-10).
export function useRuta(): Ubicacion {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(leer);
  useEffect(() => {
    const alCambiar = () => setUbicacion(leer());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ubicacion;
}
