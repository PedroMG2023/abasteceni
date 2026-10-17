// Declaración de consentimiento aprobada por el equipo (DIS-28; SYS-FN-36,
// Ley No. 787; informa la transferencia internacional de ADR-09).
export const TEXTO_CONSENTIMIENTO =
  'Autorizo a AbasteceNi, S.A. a tratar los datos de este formulario (razón social, RUC, documento de registro legal, teléfono y correo) para validar mi cuenta comercial y operar la plataforma, conforme a la Ley No. 787 de Protección de Datos Personales. Los datos se alojan en servidores de Microsoft Azure fuera de Nicaragua (México). Puedo ejercer mis derechos de acceso, rectificación, cancelación y oposición, y solicitar la cancelación de mi cuenta.';

// Registro legal (SYS-FN-02; DIS-29). El navegador orienta; el servidor decide por el contenido.
export const TAMANO_MAXIMO_REGISTRO_LEGAL = 5 * 1024 * 1024;
export const TIPOS_ACEPTADOS = '.pdf,.jpg,.jpeg,application/pdf,image/jpeg';
export const MENSAJES_ADJUNTOS = {
  registroLegalObligatorio: 'Adjunte el documento de registro legal (Cédula RUC o patente municipal).',
  registroLegalFormato: 'Cargue el documento en formato PDF o JPG.',
  registroLegalTamano: 'El documento supera el tamaño máximo de 5 MB.',
  consentimiento: 'Debe aceptar la declaración de consentimiento para registrarse.',
} as const;
