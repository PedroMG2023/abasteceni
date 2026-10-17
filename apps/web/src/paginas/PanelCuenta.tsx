import type { Rol } from '../puertos/cliente-api';

// Panel de las cuentas comerciales (CT-SEG-04; DIS-31). Sus funciones (M3–M8)
// se construyen en iteraciones posteriores.
export function PanelCuenta({ rol }: { readonly rol: Exclude<Rol, 'Administrador'> }) {
  return (
    <section aria-labelledby="titulo-panel">
      <h2 id="titulo-panel">Panel del {rol}</h2>
      <p>Las funciones de este panel se habilitan en próximas iteraciones.</p>
    </section>
  );
}
