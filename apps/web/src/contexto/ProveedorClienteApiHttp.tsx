import { useMemo, type ReactNode } from 'react';
import { crearClienteApiHttp } from '../infraestructura/cliente-api-http';
import { ContextoClienteApi } from './cliente-api';

// Único lugar de la capa 1 que construye el cliente HTTP concreto (ADR-06).
export function ProveedorClienteApiHttp({ children }: { children: ReactNode }) {
  const cliente = useMemo(() => crearClienteApiHttp(), []);
  return <ContextoClienteApi.Provider value={cliente}>{children}</ContextoClienteApi.Provider>;
}
