import type { CuentaAprobada, CuentaRechazada } from '../../../dominio/m1-usuarios';
import type { EventoDominio, PuertoNotificacion } from '../../../dominio/puertos';
import type { ManejadorEvento } from '../despachador-eventos';

// Textos aprobados por el equipo (DIS-30).
export const MENSAJE_CUENTA_APROBADA = 'AbasteceNi: su cuenta comercial fue aprobada. Ya puede iniciar sesión.';
export const mensajeCuentaRechazada = (justificacion: string) =>
  `AbasteceNi: su solicitud de cuenta fue rechazada. Motivo: ${justificacion}.`.replace(/\.\.$/, '.');

// Aviso de la decisión del Administrador (D1 PM-01: «rechazo motivado y
// notificado»). Se registra en la composición sin modificar el despachador (AS-06).
export class NotificarCuentaAprobada implements ManejadorEvento {
  constructor(private readonly notificador: PuertoNotificacion) {}

  async manejar(evento: EventoDominio): Promise<void> {
    const { datos } = evento as CuentaAprobada;
    await this.notificador.notificar({ destinatario: { telefonoMovil: datos.telefonoMovil, correo: datos.correo }, mensaje: MENSAJE_CUENTA_APROBADA });
  }
}

export class NotificarCuentaRechazada implements ManejadorEvento {
  constructor(private readonly notificador: PuertoNotificacion) {}

  async manejar(evento: EventoDominio): Promise<void> {
    const { datos } = evento as CuentaRechazada;
    await this.notificador.notificar({
      destinatario: { telefonoMovil: datos.telefonoMovil, correo: datos.correo },
      mensaje: mensajeCuentaRechazada(datos.justificacion),
    });
  }
}
