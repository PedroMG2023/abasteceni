// Dependencias deliberadas del dominio hacia el exterior.
import { randomUUID } from 'node:crypto';
import { repositorio } from '../../infraestructura/persistencia/m1-usuarios/repositorio';
export const servicio = { repositorio, id: randomUUID() };
