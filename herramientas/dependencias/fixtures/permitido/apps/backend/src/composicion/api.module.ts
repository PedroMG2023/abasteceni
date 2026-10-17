import { adaptador } from '../infraestructura/notificacion/adaptador';
import { controlador } from '../aplicacion/m3-demandas/demandas.controller';
export const modulo = controlador(adaptador);
