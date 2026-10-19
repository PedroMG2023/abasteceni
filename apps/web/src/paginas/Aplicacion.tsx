import { useRuta } from '../hooks/useRuta';
import { PaginaInicio } from './PaginaInicio';
import { PaginaInicioSesion } from './PaginaInicioSesion';
import { PaginaRecuperacion } from './PaginaRecuperacion';
import { PaginaRegistro } from './PaginaRegistro';
import { PaginaRestablecimiento } from './PaginaRestablecimiento';

function PaginaActiva() {
  const { ruta, parametro } = useRuta();
  switch (ruta) {
    case 'registro':
      return <PaginaRegistro />;
    case 'sesion':
      return <PaginaInicioSesion />;
    case 'recuperacion':
      return <PaginaRecuperacion />;
    case 'restablecer':
      return <PaginaRestablecimiento secreto={parametro ?? ''} />;
    default:
      return <PaginaInicio />;
  }
}

// Estructura de la interfaz: navegación y página activa.
export function Aplicacion() {
  return (
    <>
      <nav aria-label="Principal">
        <a href="#/">Inicio</a>
        <a href="#/registro">Registrar cuenta</a>
        <a href="#/sesion">Iniciar sesión</a>
      </nav>
      <PaginaActiva />
    </>
  );
}
