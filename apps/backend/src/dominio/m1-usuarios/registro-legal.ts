import type { DetalleValidacion } from '../puertos';

// Documento de registro legal (SYS-FN-02, CT-REG-02; DIS-29): Cédula RUC o
// patente municipal en PDF o JPG, de hasta 5 MB (5 × 2²⁰ bytes).
export const TAMANO_MAXIMO_REGISTRO_LEGAL = 5 * 1024 * 1024;
export const TIPOS_REGISTRO_LEGAL = ['application/pdf', 'image/jpeg'] as const;
export type TipoRegistroLegal = (typeof TIPOS_REGISTRO_LEGAL)[number];

export interface RegistroLegal {
  readonly clave: string;
  readonly tipo: TipoRegistroLegal;
}

// Firmas de contenido: el tipo se decide por los bytes iniciales y no por la
// extensión ni por el tipo que declara el navegador (CLAUDE.md §9).
const FIRMAS: readonly [TipoRegistroLegal, readonly number[]][] = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]], // «%PDF-»
  ['image/jpeg', [0xff, 0xd8, 0xff]],
];

export function tipoPorContenido(contenido: Uint8Array): TipoRegistroLegal | null {
  const firma = FIRMAS.find(([, bytes]) => bytes.every((byte, i) => contenido[i] === byte));
  return firma?.[0] ?? null;
}

export function comprobarRegistroLegal(contenido: Uint8Array | undefined): DetalleValidacion[] {
  if (!contenido || contenido.length === 0) return [{ campo: 'registroLegal', motivo: 'obligatorio' }];
  if (contenido.length > TAMANO_MAXIMO_REGISTRO_LEGAL) return [{ campo: 'registroLegal', motivo: 'longitud' }];
  if (!tipoPorContenido(contenido)) return [{ campo: 'registroLegal', motivo: 'formato' }];
  return [];
}
