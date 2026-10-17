import { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from '../../dominio/puertos';

// Frontera con el proveedor externo (WhatsApp Business API, SYS-FN-25).
export interface ProveedorWhatsApp {
  enviarMensaje(telefonoMovil: string, texto: string): Promise<void>;
}

// Proveedor simulado para la línea base (IT-01): no hay integración real con
// WhatsApp Business API en el alcance vigente. Permite simular la caída del
// proveedor para verificar el interruptor de circuito (ADR-02).
export class ProveedorWhatsAppSimulado implements ProveedorWhatsApp {
  disponible = true;
  llamadas = 0;
  readonly entregados: { telefonoMovil: string; texto: string }[] = [];

  async enviarMensaje(telefonoMovil: string, texto: string): Promise<void> {
    this.llamadas += 1;
    if (!this.disponible) throw new Error('Proveedor de WhatsApp no disponible (simulado).');
    this.entregados.push({ telefonoMovil, texto });
  }
}

// Adaptador del puerto de notificación sobre WhatsApp (AS-05).
export class NotificadorWhatsApp implements PuertoNotificacion {
  static readonly CANAL = 'whatsapp';

  constructor(private readonly proveedor: ProveedorWhatsApp) {}

  async notificar(notificacion: Notificacion): Promise<void> {
    try {
      await this.proveedor.enviarMensaje(notificacion.destinatario.telefonoMovil, notificacion.mensaje);
    } catch (error) {
      throw new ErrorEntregaNotificacion(NotificadorWhatsApp.CANAL, 'El proveedor de WhatsApp no entregó la notificación.', {
        cause: error,
      });
    }
  }
}
