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
