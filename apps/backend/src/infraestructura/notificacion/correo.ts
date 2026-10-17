import { ErrorEntregaNotificacion, type Notificacion, type PuertoNotificacion } from '../../dominio/puertos';

// Frontera con el servicio de correo saliente (MD-05), canal de reserva de R-05.
export interface ProveedorCorreo {
  enviar(correo: string, asunto: string, texto: string): Promise<void>;
}

// Proveedor simulado: el alcance vigente no integra un servicio de correo real.
export class ProveedorCorreoSimulado implements ProveedorCorreo {
  disponible = true;
  readonly enviados: { correo: string; asunto: string; texto: string }[] = [];

  async enviar(correo: string, asunto: string, texto: string): Promise<void> {
    if (!this.disponible) throw new Error('Servicio de correo no disponible (simulado).');
    this.enviados.push({ correo, asunto, texto });
  }
}

// Segundo adaptador del puerto de notificación (AS-05): se incorpora sin
// modificar el dominio ni el despachador, y cumple el mismo contrato (AS-09).
export class NotificadorCorreo implements PuertoNotificacion {
  static readonly CANAL = 'correo';
  static readonly ASUNTO = 'AbasteceNi';

  constructor(private readonly proveedor: ProveedorCorreo) {}

  async notificar(notificacion: Notificacion): Promise<void> {
    try {
      await this.proveedor.enviar(notificacion.destinatario.correo, NotificadorCorreo.ASUNTO, notificacion.mensaje);
    } catch (error) {
      throw new ErrorEntregaNotificacion(NotificadorCorreo.CANAL, 'El servicio de correo no entregó la notificación.', { cause: error });
    }
  }
}
