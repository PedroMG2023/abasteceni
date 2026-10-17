// Fuente del tiempo del dominio (AS-13): las pruebas lo sustituyen por un reloj fijo.
export interface PuertoReloj {
  ahora(): Date;
}
