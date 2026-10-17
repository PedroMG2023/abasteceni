import type { Transaccion } from '../puertos';
import type { CuentaComercial } from './cuenta-comercial';
import type { EstadoCuenta } from './tipos';

// Puerto de persistencia de M1: uno por módulo (R-04, patrón graduado).
export interface PuertoRepositorioUsuarios {
  existeRuc(ruc: string, tx: Transaccion): Promise<boolean>;
  guardar(cuenta: CuentaComercial, tx: Transaccion): Promise<void>;
  listar(filtro: { estado?: EstadoCuenta }): Promise<CuentaComercial[]>;
}
