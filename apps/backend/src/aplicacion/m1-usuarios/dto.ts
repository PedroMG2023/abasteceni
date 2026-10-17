import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DECISIONES, ESTADOS_CUENTA, TIPOS_CUENTA, type Decision, type EstadoCuenta } from '../../dominio/m1-usuarios';

// Frontera de POST /api/v1/cuentas (contrato: SolicitudRegistroCuenta, en
// multipart/form-data). El formato del RUC, del teléfono y del correo, el
// consentimiento y el documento los verifica además el dominio (PA-05).
export class SolicitudRegistroCuentaDto {
  @IsNotEmpty() @IsString() @IsIn(TIPOS_CUENTA) tipo!: string;
  @IsNotEmpty() @IsString() @MaxLength(200) razonSocial!: string;
  @IsNotEmpty() @IsString() @MaxLength(14) ruc!: string;
  @IsNotEmpty() @IsString() @MaxLength(100) departamento!: string;
  @IsNotEmpty() @IsString() @MaxLength(100) municipio!: string;
  @IsNotEmpty() @IsString() @MaxLength(100) rubro!: string;
  @IsNotEmpty() @IsString() @MaxLength(16) telefonoMovil!: string;
  @IsNotEmpty() @IsString() @MaxLength(254) correo!: string;
  @IsNotEmpty() @IsString() @MaxLength(128) contrasena!: string;
  // En multipart llega como texto: solo «true» expresa la aceptación (SYS-FN-36).
  @IsNotEmpty() @IsIn(['true']) aceptaConsentimiento!: string;
}

export class FiltroCuentasDto {
  @IsOptional() @IsIn(ESTADOS_CUENTA) estado?: EstadoCuenta;
}

// Frontera de PATCH /api/v1/cuentas/{id} (contrato: ValidacionCuenta).
export class ValidacionCuentaDto {
  @IsNotEmpty() @IsIn(DECISIONES) decision!: Decision;
  @IsOptional() @IsString() @MaxLength(500) justificacion?: string;
}
