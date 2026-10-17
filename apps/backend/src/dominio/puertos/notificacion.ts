// MD-03, PuertoNotificacion (≡ Notificador de AS-05 y AS-13, DIS-12).
export interface Notificacion {
  readonly destinatario: {
    readonly telefonoMovil: string;
    readonly correo: string;
  };
  readonly mensaje: string;
}

export interface PuertoNotificacion {
  // Debe rechazar con ErrorEntregaNotificacion cuando el canal no entrega
  // (AS-09): es el error que interpreta el interruptor de circuito (ADR-02).
  notificar(notificacion: Notificacion): Promise<void>;
}

export class ErrorEntregaNotificacion extends Error {
  constructor(
    readonly canal: string,
    mensaje: string,
    opciones?: { cause?: unknown },
  ) {
    super(mensaje, opciones);
    this.name = 'ErrorEntregaNotificacion';
  }
}
