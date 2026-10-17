// Aviso general de un formulario (éxito o error), anunciado a los lectores de pantalla.
export function AvisoFormulario({ tipo, texto }: { readonly tipo: 'exito' | 'error'; readonly texto: string }) {
  return (
    <p className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {texto}
    </p>
  );
}
