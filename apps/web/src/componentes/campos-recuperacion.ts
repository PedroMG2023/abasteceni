import type { DefinicionCampo } from './CampoFormulario';
import { CAMPOS_REGISTRO, type CampoRegistro } from './campos-registro';

// Campos de la recuperación de la contraseña (SYS-FN-05), compuestos a partir de
// las definiciones del registro con sus mismos validadores (AS-07; DIS-22).
const delRegistro = (nombre: CampoRegistro) => CAMPOS_REGISTRO.find((d) => d.nombre === nombre)!;

export const CAMPOS_SOLICITUD_RECUPERACION: readonly DefinicionCampo<'correo'>[] = [
  { ...delRegistro('correo'), nombre: 'correo', ayuda: 'El correo con el que registró la cuenta.' },
];

export const CAMPOS_RESTABLECIMIENTO: readonly DefinicionCampo<'contrasena'>[] = [
  { ...delRegistro('contrasena'), nombre: 'contrasena', etiqueta: 'Contraseña nueva' },
];
