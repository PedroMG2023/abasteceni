import type { PuertoIdentificadores, PuertoReloj } from '../../src/dominio/puertos';

export class RelojFijo implements PuertoReloj {
  constructor(private instante = new Date('2026-10-17T12:00:00.000Z')) {}

  ahora(): Date {
    return new Date(this.instante);
  }

  avanzar(milisegundos: number): void {
    this.instante = new Date(this.instante.getTime() + milisegundos);
  }
}

export class IdentificadoresSecuenciales implements PuertoIdentificadores {
  private siguiente = 0;

  generar(): string {
    this.siguiente += 1;
    return `00000000-0000-4000-8000-${String(this.siguiente).padStart(12, '0')}`;
  }
}
