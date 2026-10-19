import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Frontera de POST /api/v1/sesiones (contrato: SolicitudInicioSesion).
export class SolicitudInicioSesionDto {
  @IsNotEmpty() @IsString() @MaxLength(254) correo!: string;
  @IsNotEmpty() @IsString() @MaxLength(128) contrasena!: string;
}

// Frontera de POST /api/v1/sesiones/recuperacion (contrato: SolicitudRecuperacion).
// El formato del correo lo valida el dominio, con el mensaje del catálogo.
export class SolicitudRecuperacionDto {
  @IsString() @MaxLength(254) correo!: string;
}

// Frontera de POST /api/v1/sesiones/recuperacion/restablecimiento
// (contrato: SolicitudRestablecimiento). La longitud de la contraseña la valida
// el dominio (DIS-22), con el mensaje del catálogo.
export class SolicitudRestablecimientoDto {
  @IsNotEmpty() @IsString() @MaxLength(256) secreto!: string;
  @IsString() @MaxLength(128) contrasena!: string;
}
