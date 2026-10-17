import type { CuentaRegistrada } from '../../../dominio/m1-usuarios';
import type { EventoDominio, PuertoNotificacion } from '../../../dominio/puertos';
import type { ManejadorEvento } from '../despachador-eventos';

// Texto aprobado por el equipo (DIS-20).
export const MENSAJE_CUENTA_REGISTRADA = 'AbasteceNi: recibimos su solicitud de cuenta comercial; está pendiente de validación.';

// Notifica al solicitante el registro de su cuenta (vehículo de IT-01). Invoca
// el puerto de notificación directamente mientras M7 no exista (DIS-13).
export class NotificarCuentaRegistrada implements ManejadorEvento {
  constructor(private readonly notificador: PuertoNotificacion) {}

  async manejar(evento: EventoDominio): Promise<void> {
    const { datos } = evento as CuentaRegistrada;
    await this.notificador.notificar({
      destinatario: { telefonoMovil: datos.telefonoMovil, correo: datos.correo },
      mensaje: MENSAJE_CUENTA_REGISTRADA,
    });
  }
}
