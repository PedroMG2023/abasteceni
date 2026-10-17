// Acceso cruzado deliberado: m3 importa una pieza interna de m4 y no su index.ts.
import { reservarVolumen } from '../m4-ofertas/inventario-interno';
export const volumen = reservarVolumen(50);
