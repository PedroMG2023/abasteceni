import { lt, sql } from 'drizzle-orm';
import type { PuertoContadorPeticiones } from '../../dominio/puertos';
import type { BaseDatos } from '../persistencia/base-datos';
import { contadorPeticiones } from '../persistencia/plataforma/esquema';

// Contador de ADR-08 en PostgreSQL: una sola sentencia atómica por petición,
// compartida por todas las instancias (PA-04).
export class ContadorPeticionesPg implements PuertoContadorPeticiones {
  constructor(private readonly db: BaseDatos) {}

  async registrar(clave: string, inicioVentana: Date): Promise<number> {
    const [fila] = await this.db
      .insert(contadorPeticiones)
      .values({ clave, ventana: inicioVentana, cuenta: 1 })
      .onConflictDoUpdate({
        target: [contadorPeticiones.clave, contadorPeticiones.ventana],
        set: { cuenta: sql`${contadorPeticiones.cuenta} + 1` },
      })
      .returning({ cuenta: contadorPeticiones.cuenta });
    return fila.cuenta;
  }

  // Purga de ventanas vencidas; la ejecuta el trabajador.
  async purgar(anterioresA: Date): Promise<number> {
    const resultado = await this.db.delete(contadorPeticiones).where(lt(contadorPeticiones.ventana, anterioresA));
    return resultado.rowCount ?? 0;
  }
}
