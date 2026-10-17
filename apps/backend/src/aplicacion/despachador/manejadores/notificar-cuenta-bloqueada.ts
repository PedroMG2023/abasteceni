import type { CuentaBloqueada } from '../../../dominio/m2-seguridad';
import type { EventoDominio, PuertoNotificacion } from '../../../dominio/puertos';
import type { ManejadorEvento } from '../despachador-eventos';

// Texto aprobado por el equipo (DIS-34).
export const MENSAJE_CUENTA_BLOQUEADA =
  'AbasteceNi: bloqueamos su cuenta durante 15 minutos tras 5 intentos fallidos de inicio de sesión. Si no fue usted, comuníquese con la plataforma.';

// SYS-FN-07: «notificando el bloqueo al correo registrado». Recibe el
// notificador del canal de correo, no el canal general.
export class NotificarCuentaBloqueada implements ManejadorEvento {
  constructor(private readonly correo: PuertoNotificacion) {}

  async manejar(evento: EventoDominio): Promise<void> {
    const { datos } = evento as CuentaBloqueada;
    await this.correo.notificar({ destinatario: { telefonoMovil: '', correo: datos.correo }, mensaje: MENSAJE_CUENTA_BLOQUEADA });
  }
}
