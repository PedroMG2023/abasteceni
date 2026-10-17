import { useRuta } from '../hooks/useRuta';
import { PaginaInicio } from './PaginaInicio';
import { PaginaInicioSesion } from './PaginaInicioSesion';
import { PaginaRegistro } from './PaginaRegistro';

// Estructura de la interfaz: navegación y página activa.
export function Aplicacion() {
  const ruta = useRuta();
  return (
    <>
      <nav aria-label="Principal">
        <a href="#/">Inicio</a>
        <a href="#/registro">Registrar cuenta</a>
        <a href="#/sesion">Iniciar sesión</a>
      </nav>
      {ruta === 'registro' ? <PaginaRegistro /> : ruta === 'sesion' ? <PaginaInicioSesion /> : <PaginaInicio />}
    </>
  );
}
