// Errores propios de la capa 2: los lanzan los guards y los traduce el filtro.
export class ErrorProhibido extends Error {
  constructor() {
    super('PROHIBIDO');
    this.name = 'ErrorProhibido';
  }
}

export class ErrorDemasiadasPeticiones extends Error {
  constructor(readonly reintentarEnSegundos: number) {
    super('DEMASIADAS_PETICIONES');
    this.name = 'ErrorDemasiadasPeticiones';
  }
}
