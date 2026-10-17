// Objeto valor RUC (MD-01). Formato aprobado en DIS-21: «J» seguida de 13
// dígitos (persona jurídica) o 13 dígitos seguidos de una letra (persona
// natural), sin guiones, normalizado a mayúsculas.
const PATRON_RUC = /^(J\d{13}|\d{13}[A-Z])$/;

export class Ruc {
  private constructor(readonly numero: string) {}

  static normalizar(valor: string): string {
    return valor.trim().toUpperCase();
  }

  static esValido(valor: string): boolean {
    return PATRON_RUC.test(Ruc.normalizar(valor));
  }

  static crear(valor: string): Ruc {
    if (!Ruc.esValido(valor)) throw new RangeError('RUC con formato inválido');
    return new Ruc(Ruc.normalizar(valor));
  }
}
