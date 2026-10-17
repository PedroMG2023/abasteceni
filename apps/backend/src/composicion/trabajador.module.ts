import { Module } from '@nestjs/common';

// Raíz de composición del trabajador asíncrono (MD-03): mismo artefacto que el
// servicio de aplicación, otro proceso. En IT-01 incorpora el sondeo de la
// bandeja de salida, el despachador y los adaptadores de notificación.
@Module({})
export class TrabajadorModule {}
