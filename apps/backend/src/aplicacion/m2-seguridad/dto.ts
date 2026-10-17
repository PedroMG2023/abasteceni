import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Frontera de POST /api/v1/sesiones (contrato: SolicitudInicioSesion).
export class SolicitudInicioSesionDto {
  @IsNotEmpty() @IsString() @MaxLength(254) correo!: string;
  @IsNotEmpty() @IsString() @MaxLength(128) contrasena!: string;
}
