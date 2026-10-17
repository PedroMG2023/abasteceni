import { useSalud, type EstadoServicio } from '../hooks/useSalud';

const TEXTO_ESTADO: Record<EstadoServicio, string> = {
  consultando: 'consultando…',
  operativo: 'operativo',
  'sin-respuesta': 'sin respuesta',
};

// Vista inicial (capa 1). Solo renderiza: el estado lo provee el hook.
export function PaginaInicio() {
  const estado = useSalud();
  return (
    <main>
      <h1>AbasteceNi</h1>
      <p>Plataforma web B2B de emparejamiento comercial.</p>
      <p role="status">Estado del servicio: {TEXTO_ESTADO[estado]}</p>
    </main>
  );
}
