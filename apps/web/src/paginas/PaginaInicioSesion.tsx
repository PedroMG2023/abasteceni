import { useState, type FormEvent } from 'react';
import { AvisoFormulario } from '../componentes/AvisoFormulario';
import { useSesion } from '../hooks/useSesion';
import { PanelAdministrador } from './PanelAdministrador';
import { PanelCuenta } from './PanelCuenta';

// Inicio de sesión con correo y contraseña (SYS-FN-04). Tras iniciar, muestra el
// panel que corresponde al rol asignado (CT-SEG-04; DIS-31).
export function PaginaInicioSesion() {
  const { identidad, aviso, ocupado, iniciar, cerrar } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  if (identidad) {
    return (
      <main>
        <h1>Sesión iniciada</h1>
        <p role="status">Rol: {identidad.rol}</p>
        {identidad.rol === 'Administrador' ? <PanelAdministrador /> : <PanelCuenta rol={identidad.rol} />}
        <button type="button" onClick={() => void cerrar()}>
          Cerrar sesión
        </button>
      </main>
    );
  }

  const alEnviar = (evento: FormEvent) => {
    evento.preventDefault();
    void iniciar({ correo, contrasena });
  };

  return (
    <main>
      <h1>Iniciar sesión</h1>
      <form onSubmit={alEnviar}>
        {aviso && <AvisoFormulario tipo="error" texto={aviso} />}
        <div className="campo">
          <label htmlFor="sesion-correo">Correo electrónico</label>
          <input id="sesion-correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="sesion-contrasena">Contraseña</label>
          <input
            id="sesion-contrasena"
            type="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </div>
        <button type="submit" disabled={ocupado}>
          {ocupado ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
