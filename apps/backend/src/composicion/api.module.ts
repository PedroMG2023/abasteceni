import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { CuentasController } from '../aplicacion/m1-usuarios/cuentas.controller';
import { SesionesController } from '../aplicacion/m2-seguridad/sesiones.controller';
import { SIMBOLOS, type ConfiguracionHttp } from '../aplicacion/simbolos';
import { AutenticacionGuard } from '../aplicacion/transversal/autenticacion.guard';
import { FiltroErrores } from '../aplicacion/transversal/filtro-errores.filter';
import { LimitePeticionesGuard } from '../aplicacion/transversal/limite-peticiones.guard';
import { RegistroPeticionesInterceptor } from '../aplicacion/transversal/registro-peticiones.interceptor';
import { RolesGuard } from '../aplicacion/transversal/roles.guard';
import { SaludController } from '../aplicacion/transversal/salud.controller';
import { crearTuberiaValidacion } from '../aplicacion/transversal/validacion';
import { ServicioUsuarios } from '../dominio/m1-usuarios';
import { ServicioSeguridad } from '../dominio/m2-seguridad';
import type { PuertoIdentificadores, PuertoReloj, PuertoUnidadTrabajo } from '../dominio/puertos';
import { BandejaSalidaPg } from '../infraestructura/bandeja-salida/bandeja-salida-pg';
import { ContadorPeticionesPg } from '../infraestructura/limite-peticiones/contador-peticiones-pg';
import type { BaseDatos } from '../infraestructura/persistencia/base-datos';
import { RepositorioUsuariosPg } from '../infraestructura/persistencia/m1-usuarios/repositorio-usuarios-pg';
import { RepositorioSeguridadPg } from '../infraestructura/persistencia/m2-seguridad/repositorio-seguridad-pg';
import { DerivacionArgon2 } from '../infraestructura/seguridad/derivacion-argon2';
import { FirmaJwt } from '../infraestructura/seguridad/firma-jwt';
import { SecretosRenovacionCripto } from '../infraestructura/seguridad/secretos-renovacion';
import type { Configuracion } from './configuracion';
import { BASE_DATOS, CONFIGURACION, IDENTIFICADORES, UNIDAD_TRABAJO, proveedoresComunes } from './infraestructura-comun';

// Símbolos de los adaptadores que solo enlaza la composición (AS-17).
export const ADAPTADORES_API = {
  bandejaSalida: Symbol('PuertoPublicacionEventos'),
  repositorioUsuarios: Symbol('PuertoRepositorioUsuarios'),
  repositorioSeguridad: Symbol('PuertoRepositorioSeguridad'),
  derivacionClave: Symbol('PuertoDerivacionClave'),
  firmaAcceso: Symbol('PuertoFirmaAcceso'),
  secretosRenovacion: Symbol('PuertoSecretosRenovacion'),
} as const;

const A = ADAPTADORES_API;

// Raíz de composición del servicio de aplicación (MD-03, AS-17): enlaza cada
// puerto con su adaptador por símbolo y construye el dominio con fábricas, sin
// decoradores del marco en las clases del dominio (PA-01).
@Module({})
export class ApiModule {
  static registrar(configuracion: Configuracion): DynamicModule {
    return {
      module: ApiModule,
      controllers: [SaludController, CuentasController, SesionesController],
      providers: [
        ...proveedoresComunes(configuracion),
        {
          provide: SIMBOLOS.configuracionHttp,
          useFactory: (c: Configuracion): ConfiguracionHttp => ({
            limitePeticionesPorMinuto: c.limitePeticionesPorMinuto,
            cookieSegura: c.cookieSegura,
          }),
          inject: [CONFIGURACION],
        },
        { provide: A.bandejaSalida, useFactory: (db: BaseDatos) => new BandejaSalidaPg(db), inject: [BASE_DATOS] },
        { provide: A.repositorioUsuarios, useFactory: (db: BaseDatos) => new RepositorioUsuariosPg(db), inject: [BASE_DATOS] },
        { provide: A.repositorioSeguridad, useFactory: (db: BaseDatos) => new RepositorioSeguridadPg(db), inject: [BASE_DATOS] },
        { provide: SIMBOLOS.contadorPeticiones, useFactory: (db: BaseDatos) => new ContadorPeticionesPg(db), inject: [BASE_DATOS] },
        { provide: A.derivacionClave, useClass: DerivacionArgon2 },
        { provide: A.firmaAcceso, useFactory: (c: Configuracion) => new FirmaJwt(c.secretoFirmaAcceso), inject: [CONFIGURACION] },
        { provide: A.secretosRenovacion, useClass: SecretosRenovacionCripto },
        {
          provide: SIMBOLOS.servicioSeguridad,
          useFactory: (repositorio, unidadTrabajo, derivacion, firma, secretos, reloj, identificadores) =>
            new ServicioSeguridad({ repositorio, unidadTrabajo, derivacion, firma, secretos, reloj, identificadores }),
          inject: [A.repositorioSeguridad, UNIDAD_TRABAJO, A.derivacionClave, A.firmaAcceso, A.secretosRenovacion, SIMBOLOS.reloj, IDENTIFICADORES],
        },
        {
          provide: SIMBOLOS.servicioUsuarios,
          useFactory: (
            repositorio: RepositorioUsuariosPg,
            unidadTrabajo: PuertoUnidadTrabajo,
            eventos: BandejaSalidaPg,
            credenciales: ServicioSeguridad,
            reloj: PuertoReloj,
            identificadores: PuertoIdentificadores,
          ) => new ServicioUsuarios({ repositorio, unidadTrabajo, eventos, credenciales, reloj, identificadores }),
          inject: [A.repositorioUsuarios, UNIDAD_TRABAJO, A.bandejaSalida, SIMBOLOS.servicioSeguridad, SIMBOLOS.reloj, IDENTIFICADORES],
        },
        // Envolturas transversales de la capa 2 (AS-03), en este orden: límite
        // de peticiones, autenticación y rol.
        { provide: APP_GUARD, useClass: LimitePeticionesGuard },
        { provide: APP_GUARD, useClass: AutenticacionGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: FiltroErrores },
        { provide: APP_INTERCEPTOR, useClass: RegistroPeticionesInterceptor },
        { provide: APP_PIPE, useFactory: crearTuberiaValidacion },
      ],
    };
  }
}
