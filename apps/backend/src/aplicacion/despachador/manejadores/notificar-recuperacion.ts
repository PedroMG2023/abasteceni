import type { RecuperacionSolicitada } from '../../../dominio/m2-seguridad';
import type { EventoDominio, PuertoNotificacion } from '../../../dominio/puertos';
import type { ManejadorEvento } from '../despachador-eventos';

// Texto aprobado por el equipo (DIS-36).
export const mensajeRecuperacion = (enlace: string) =>
  `AbasteceNi: para restablecer su contraseña abra este enlace antes de 15 minutos: ${enlace}. Si usted no lo solicitó, ignore este mensaje.`;

// El secreto va en el fragmento de la dirección: el navegador no lo envía al
// servidor ni en la cabecera Referer (OWASP ASVS V2.5).
export const enlaceRestablecimiento = (origenWeb: string, secreto: string) =>
  `${origenWeb.replace(/\/$/, '')}/#/restablecer/${encodeURIComponent(secreto)}`;

// SYS-FN-05: «envío de un enlace temporal de restablecimiento al correo
// registrado». Recibe el notificador del canal de correo, como SYS-FN-07.
export class NotificarRecuperacion implements ManejadorEvento {
  constructor(
    private readonly correo: PuertoNotificacion,
    private readonly origenWeb: string,
  ) {}

  async manejar(evento: EventoDominio): Promise<void> {
    const { datos } = evento as RecuperacionSolicitada;
    await this.correo.notificar({
      destinatario: { telefonoMovil: '', correo: datos.correo },
      mensaje: mensajeRecuperacion(enlaceRestablecimiento(this.origenWeb, datos.secreto)),
    });
  }
}
