import { volumenDisponible } from '../m4-ofertas/index';
import type { Notificador } from '../puertos/index';
export const servicio = (n: Notificador) => ({ n, v: volumenDisponible(1) });
