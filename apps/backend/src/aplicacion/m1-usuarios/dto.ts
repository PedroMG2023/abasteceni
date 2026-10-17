import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ESTADOS_CUENTA, TIPOS_CUENTA, type EstadoCuenta } from '../../dominio/m1-usuarios';

// Frontera de POST /api/v1/cuentas (contrato: SolicitudRegistroCuenta). El
// formato del RUC, del teléfono y del correo lo verifica además el dominio (PA-05).
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
}

export class FiltroCuentasDto {
  @IsOptional() @IsIn(ESTADOS_CUENTA) estado?: EstadoCuenta;
}
