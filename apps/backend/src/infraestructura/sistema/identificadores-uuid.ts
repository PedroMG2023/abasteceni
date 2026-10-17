import { randomUUID } from 'node:crypto';
import type { PuertoIdentificadores } from '../../dominio/puertos';

export class IdentificadoresUuid implements PuertoIdentificadores {
  generar(): string {
    return randomUUID();
  }
}
