import type { DefinicionCampo } from './CampoFormulario';
import { longitud, obligatorio, patron } from './validadores';

export type CampoRegistro =
  | 'tipo'
  | 'razonSocial'
  | 'ruc'
  | 'departamento'
  | 'municipio'
  | 'rubro'
  | 'telefonoMovil'
  | 'correo'
  | 'contrasena';

// Formulario de registro de una cuenta comercial (SYS-FN-01; DIS-16, 17, 19, 21
// y 22), armado por composición de definiciones (AS-07). Los textos de ayuda
// atienden SYS-NFN-11 y RO-06 (alfabetización digital baja); constan en DIS-26.
export const CAMPOS_REGISTRO: readonly DefinicionCampo<CampoRegistro>[] = [
  {
    nombre: 'tipo',
    etiqueta: 'Tipo de cuenta',
    ayuda: 'Comprador publica demandas; Proveedor emite cotizaciones; Productor ofrece excedentes agrícolas.',
    opciones: ['Comprador', 'Proveedor', 'Productor'],
    validadores: [obligatorio('Indique el tipo de cuenta.')],
  },
  {
    nombre: 'razonSocial',
    etiqueta: 'Razón social',
    autoComplete: 'organization',
    validadores: [obligatorio('Indique la razón social.'), longitud(1, 200, 'Acorte la razón social: supera la longitud permitida.')],
  },
  {
    nombre: 'ruc',
    etiqueta: 'RUC',
    ayuda: '14 caracteres sin guiones: «J» y 13 dígitos, o los 13 dígitos de la cédula y su letra.',
    validadores: [
      obligatorio('Indique el RUC.'),
      patron(/^(J\d{13}|\d{13}[A-Za-z])$/, 'El RUC debe tener 14 caracteres: «J» y 13 dígitos, o 13 dígitos y una letra, sin guiones.'),
    ],
  },
  {
    nombre: 'departamento',
    etiqueta: 'Departamento',
    autoComplete: 'address-level1',
    validadores: [obligatorio('Indique el departamento.'), longitud(1, 100, 'Acorte el departamento: supera la longitud permitida.')],
  },
  {
    nombre: 'municipio',
    etiqueta: 'Municipio',
    autoComplete: 'address-level2',
    validadores: [obligatorio('Indique el municipio.'), longitud(1, 100, 'Acorte el municipio: supera la longitud permitida.')],
  },
  {
    nombre: 'rubro',
    etiqueta: 'Rubro comercial',
    ayuda: 'Por ejemplo: farmacia, ferretería, pulpería, granos básicos.',
    validadores: [obligatorio('Indique el rubro comercial.'), longitud(1, 100, 'Acorte el rubro comercial: supera la longitud permitida.')],
  },
  {
    nombre: 'telefonoMovil',
    etiqueta: 'Teléfono móvil',
    tipo: 'tel',
    autoComplete: 'tel',
    ayuda: 'Con el código de país, por ejemplo +50588887777. Recibirá los avisos por WhatsApp.',
    validadores: [
      obligatorio('Indique el teléfono móvil.'),
      patron(/^\+[1-9]\d{7,14}$/, 'Escriba el teléfono móvil con el código de país, por ejemplo +50588887777.'),
    ],
  },
  {
    nombre: 'correo',
    etiqueta: 'Correo electrónico',
    tipo: 'email',
    autoComplete: 'email',
    ayuda: 'Lo usará para iniciar sesión.',
    validadores: [
      obligatorio('Indique el correo electrónico.'),
      patron(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Escriba un correo electrónico válido, por ejemplo nombre@empresa.com.'),
    ],
  },
  {
    nombre: 'contrasena',
    etiqueta: 'Contraseña',
    tipo: 'password',
    autoComplete: 'new-password',
    ayuda: 'Entre 12 y 128 caracteres. Puede usar una frase.',
    validadores: [obligatorio('Indique la contraseña.'), longitud(12, 128, 'La contraseña debe tener entre 12 y 128 caracteres.')],
  },
];
