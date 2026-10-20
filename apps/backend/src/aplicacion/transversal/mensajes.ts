import type { CodigoAccesoDenegado, CodigoAutenticacion, CodigoConflicto, CodigoVencido, DetalleValidacion } from '../../dominio/puertos';

// Catálogo único de los mensajes que la API devuelve a la persona usuaria
// (ISO 9241-110, tolerancia a errores: indicar qué corregir y cómo). Propuesto
// en DIS-26 para aprobación del equipo; los de DIS-25 ya están aprobados.

const ETIQUETAS: Record<string, string> = {
  tipo: 'el tipo de cuenta',
  razonSocial: 'la razón social',
  ruc: 'el RUC',
  departamento: 'el departamento',
  municipio: 'el municipio',
  rubro: 'el rubro comercial',
  telefonoMovil: 'el teléfono móvil',
  correo: 'el correo electrónico',
  contrasena: 'la contraseña',
  justificacion: 'el motivo del rechazo',
  decision: 'la decisión',
};

// Mensajes completos para los campos cuyo texto no se arma con la etiqueta.
const ESPECIFICOS: Record<string, Partial<Record<DetalleValidacion['motivo'], string>>> = {
  registroLegal: {
    obligatorio: 'Adjunte el documento de registro legal (Cédula RUC o patente municipal).',
    formato: 'Cargue el documento en formato PDF o JPG.',
    longitud: 'El documento supera el tamaño máximo de 5 MB.',
  },
  aceptaConsentimiento: {
    obligatorio: 'Debe aceptar la declaración de consentimiento para registrarse.',
    valor: 'Debe aceptar la declaración de consentimiento para registrarse.',
  },
  decision: { valor: 'Elija aprobar o rechazar.', obligatorio: 'Elija aprobar o rechazar.' },
  justificacion: { obligatorio: 'Indique el motivo del rechazo.' },
};

const FORMATOS: Record<string, string> = {
  ruc: 'El RUC debe tener 14 caracteres: «J» y 13 dígitos, o 13 dígitos y una letra, sin guiones.',
  telefonoMovil: 'Escriba el teléfono móvil con el código de país, por ejemplo +50588887777.',
  correo: 'Escriba un correo electrónico válido, por ejemplo nombre@empresa.com.',
};

const LONGITUDES: Record<string, string> = {
  contrasena: 'La contraseña debe tener entre 12 y 128 caracteres.',
};

const VALORES: Record<string, string> = {
  tipo: 'Elija Comprador, Proveedor o Productor.',
};

export const MENSAJE_SOLICITUD_INVALIDA = 'Revise los datos marcados.';
export const MENSAJE_DEMASIADAS_PETICIONES = 'Se superó el límite de peticiones. Intente de nuevo en un minuto.';
export const MENSAJE_PROHIBIDO = 'No tiene permiso para realizar esta operación.';
export const MENSAJE_NO_ENCONTRADO = 'El recurso solicitado no existe.';
export const MENSAJE_DOCUMENTO_DEMASIADO_GRANDE = 'El documento supera el tamaño máximo de 5 MB.';
export const MENSAJE_CUENTA_NO_ENCONTRADA = 'La cuenta indicada no existe.';
export const MENSAJE_TRANSICION_NO_PERMITIDA = 'La cuenta ya fue validada; no admite esta decisión.';
export const MENSAJE_ERROR_INTERNO = 'Ocurrió un error inesperado. Intente de nuevo más tarde.';

export function mensajeCampo(detalle: DetalleValidacion): string {
  const especifico = ESPECIFICOS[detalle.campo]?.[detalle.motivo];
  if (especifico) return especifico;
  const etiqueta = ETIQUETAS[detalle.campo] ?? `el campo ${detalle.campo}`;
  switch (detalle.motivo) {
    case 'obligatorio':
      return `Indique ${etiqueta}.`;
    case 'formato':
      return FORMATOS[detalle.campo] ?? `Revise el formato de ${etiqueta}.`;
    case 'longitud':
      return LONGITUDES[detalle.campo] ?? `Acorte ${etiqueta}: supera la longitud permitida.`;
    case 'valor':
      return VALORES[detalle.campo] ?? `El valor de ${etiqueta} no es válido.`;
  }
}

export const MENSAJES_CONFLICTO: Record<CodigoConflicto, string> = {
  RUC_REGISTRADO: 'Ya existe una cuenta registrada con ese RUC.',
  CORREO_REGISTRADO: 'Ya existe una cuenta registrada con ese correo electrónico.',
};

export const MENSAJES_AUTENTICACION: Record<CodigoAutenticacion, string> = {
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  RENOVACION_INVALIDA: 'Su sesión expiró. Inicie sesión de nuevo.',
  ACCESO_INVALIDO: 'Inicie sesión para continuar.',
  // DIS-37, aprobado por el equipo (SYS-FN-08).
  SESION_DESPLAZADA: 'Su sesión se cerró porque la cuenta inició sesión en otro dispositivo.',
};

// DIS-25 y DIS-34, aprobados por el equipo.
export const MENSAJES_ACCESO_DENEGADO: Record<CodigoAccesoDenegado, string> = {
  CUENTA_PENDIENTE: 'Su cuenta está pendiente de validación.',
  CUENTA_RECHAZADA: 'Su solicitud de cuenta fue rechazada.',
  // DIS-34, aprobado por el equipo.
  CUENTA_BLOQUEADA: 'Su cuenta está bloqueada temporalmente por intentos fallidos. Intente de nuevo en 15 minutos.',
};

// DIS-36, aprobado por el equipo (SYS-FN-05).
export const MENSAJE_RECUPERACION_SOLICITADA = 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Vence en 15 minutos.';
export const MENSAJE_CONTRASENA_RESTABLECIDA = 'Su contraseña fue restablecida. Inicie sesión con la nueva contraseña.';
export const MENSAJES_VENCIDO: Record<CodigoVencido, string> = {
  ENLACE_VENCIDO: 'El enlace venció o ya fue usado. Solicite uno nuevo.',
};
