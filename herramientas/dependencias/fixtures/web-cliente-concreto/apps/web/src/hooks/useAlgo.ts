// El hook importa deliberadamente el cliente HTTP concreto.
import { crearClienteApiHttp } from '../infraestructura/cliente-api-http';
export const useAlgo = () => crearClienteApiHttp();
