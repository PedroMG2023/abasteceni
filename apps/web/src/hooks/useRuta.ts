import { useEffect, useState } from 'react';

export type Ruta = 'inicio' | 'registro' | 'sesion';

function leer(): Ruta {
  const ruta = window.location.hash.replace(/^#\/?/, '');
  return ruta === 'registro' || ruta === 'sesion' ? ruta : 'inicio';
}

// Navegación por fragmento, sin dependencias adicionales (SYS-NFN-10).
export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(leer);
  useEffect(() => {
    const alCambiar = () => setRuta(leer());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}
