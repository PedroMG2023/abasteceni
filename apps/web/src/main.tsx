import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProveedorClienteApiHttp } from './contexto/ProveedorClienteApiHttp';
import { Aplicacion } from './paginas/Aplicacion';
import './estilos.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <ProveedorClienteApiHttp>
      <Aplicacion />
    </ProveedorClienteApiHttp>
  </StrictMode>,
);
