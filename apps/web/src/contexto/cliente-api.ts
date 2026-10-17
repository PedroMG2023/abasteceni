import { createContext, useContext } from 'react';
import type { ClienteApi } from '../puertos/cliente-api';

// Contexto que entrega a hooks y componentes la implementación del puerto
// ClienteApi (AS-18). No conoce ninguna implementación concreta.
export const ContextoClienteApi = createContext<ClienteApi | null>(null);

export function useClienteApi(): ClienteApi {
  const cliente = useContext(ContextoClienteApi);
  if (!cliente) throw new Error('useClienteApi requiere un ContextoClienteApi.Provider.');
  return cliente;
}
