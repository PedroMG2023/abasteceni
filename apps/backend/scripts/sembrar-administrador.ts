import { ServicioSeguridad } from '../src/dominio/m2-seguridad';
import { BandejaSalidaPg } from '../src/infraestructura/bandeja-salida/bandeja-salida-pg';
import { crearBaseDatos } from '../src/infraestructura/persistencia/base-datos';
import { RepositorioSeguridadPg } from '../src/infraestructura/persistencia/m2-seguridad/repositorio-seguridad-pg';
import { UnidadTrabajoPg } from '../src/infraestructura/persistencia/unidad-trabajo-pg';
import { DerivacionArgon2 } from '../src/infraestructura/seguridad/derivacion-argon2';
import { FirmaJwt } from '../src/infraestructura/seguridad/firma-jwt';
import { SecretosRenovacionCripto } from '../src/infraestructura/seguridad/secretos-renovacion';
import { IdentificadoresUuid } from '../src/infraestructura/sistema/identificadores-uuid';
import { RelojSistema } from '../src/infraestructura/sistema/reloj-sistema';

// Siembra de la primera cuenta de Administrador de la plataforma (DIS-24). No
// existe registro público de administradores (RO-04). Idempotente.
async function sembrar(): Promise<void> {
  const { URL_BD_APP, SECRETO_FIRMA_ACCESO, CORREO_ADMINISTRADOR, CONTRASENA_ADMINISTRADOR } = process.env;
  if (!URL_BD_APP || !SECRETO_FIRMA_ACCESO || !CORREO_ADMINISTRADOR || !CONTRASENA_ADMINISTRADOR) {
    throw new Error('Defina URL_BD_APP, SECRETO_FIRMA_ACCESO, CORREO_ADMINISTRADOR y CONTRASENA_ADMINISTRADOR.');
  }
  const { db, pool } = crearBaseDatos(URL_BD_APP, 1);
  try {
    const seguridad = new ServicioSeguridad({
      repositorio: new RepositorioSeguridadPg(db),
      unidadTrabajo: new UnidadTrabajoPg(db),
      eventos: new BandejaSalidaPg(db),
      derivacion: new DerivacionArgon2(),
      firma: new FirmaJwt(SECRETO_FIRMA_ACCESO),
      secretos: new SecretosRenovacionCripto(),
      reloj: new RelojSistema(),
      identificadores: new IdentificadoresUuid(),
    });
    const resultado = await seguridad.registrarAdministrador({ correo: CORREO_ADMINISTRADOR, contrasena: CONTRASENA_ADMINISTRADOR });
    console.log(resultado === 'creado' ? 'Administrador creado.' : 'El Administrador ya existía.');
  } finally {
    await pool.end();
  }
}

sembrar().catch((error: unknown) => {
  console.error('No se pudo sembrar el Administrador:', error instanceof Error ? error.message : error);
  process.exit(1);
});
