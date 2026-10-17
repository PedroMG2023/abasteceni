import { NotificadorCorreo, ProveedorCorreoSimulado } from '../../src/infraestructura/notificacion/correo';
import { NotificadorWhatsApp, ProveedorWhatsAppSimulado } from '../../src/infraestructura/notificacion/whatsapp';
import { contratoNotificacion } from './notificacion.contrato';

contratoNotificacion({
  nombre: 'WhatsApp (proveedor simulado)',
  canal: 'whatsapp',
  crear: () => {
    const proveedor = new ProveedorWhatsAppSimulado();
    return {
      notificador: new NotificadorWhatsApp(proveedor),
      caer: () => (proveedor.disponible = false),
      entregados: () => proveedor.entregados.map((e) => ({ destino: e.telefonoMovil, texto: e.texto })),
    };
  },
});

contratoNotificacion({
  nombre: 'correo (proveedor simulado)',
  canal: 'correo',
  crear: () => {
    const proveedor = new ProveedorCorreoSimulado();
    return {
      notificador: new NotificadorCorreo(proveedor),
      caer: () => (proveedor.disponible = false),
      entregados: () => proveedor.enviados.map((e) => ({ destino: e.correo, texto: e.texto })),
    };
  },
});
