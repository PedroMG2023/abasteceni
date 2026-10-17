import type { ReactNode } from 'react';
import { ContextoClienteApi } from '../../src/contexto/cliente-api';
import type { ClienteApi } from '../../src/puertos/cliente-api';

export function envolverCon(cliente: ClienteApi) {
  return function Envoltura({ children }: { children: ReactNode }) {
    return <ContextoClienteApi.Provider value={cliente}>{children}</ContextoClienteApi.Provider>;
  };
}
