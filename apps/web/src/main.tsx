import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProveedorClienteApiHttp } from './contexto/ProveedorClienteApiHttp';
import { PaginaInicio } from './paginas/PaginaInicio';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <ProveedorClienteApiHttp>
      <PaginaInicio />
    </ProveedorClienteApiHttp>
  </StrictMode>,
);
