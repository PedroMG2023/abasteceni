import type { PuertoReloj } from '../../dominio/puertos';

export class RelojSistema implements PuertoReloj {
  ahora(): Date {
    return new Date();
  }
}
