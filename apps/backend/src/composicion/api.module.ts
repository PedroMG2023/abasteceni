import { Module } from '@nestjs/common';
import { SaludController } from '../aplicacion/transversal/salud.controller';

// Raíz de composición del servicio de aplicación (MD-03). Es el único lugar
// que ve las cuatro capas: enlaza adaptadores con puertos por símbolo (AS-17).
@Module({
  controllers: [SaludController],
})
export class ApiModule {}
