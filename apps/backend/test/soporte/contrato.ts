import { readFileSync } from 'node:fs';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

// Valida las respuestas HTTP contra packages/contrato/openapi.yaml (PA-07,
// SYS-NFN-16). El contrato es la fuente de verdad: una respuesta que no lo
// cumple hace fallar la prueba aunque el código «funcione».
const RUTA_CONTRATO = require.resolve('@abasteceni/contrato/openapi.yaml');
const ID_CONTRATO = 'openapi.yaml';

interface Operacion {
  responses: Record<string, { $ref?: string; content?: Record<string, { schema?: unknown }> }>;
}

const contrato = parse(readFileSync(RUTA_CONTRATO, 'utf8')) as {
  paths: Record<string, Record<string, Operacion>>;
  components: { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> };
};

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contrato, ID_CONTRATO);

const escapar = (segmento: string) => segmento.replace(/~/g, '~0').replace(/\//g, '~1');

// Devuelve el puntero JSON a la respuesta declarada, siguiendo la referencia
// a components/responses cuando la hay.
function punteroRespuesta(ruta: string, metodo: string, estado: string, respuesta: Operacion['responses'][string]) {
  if (respuesta.$ref) {
    const nombre = respuesta.$ref.replace('#/components/responses/', '');
    return { puntero: `/components/responses/${escapar(nombre)}`, respuesta: contrato.components.responses?.[nombre] };
  }
  return { puntero: `/paths/${escapar(ruta)}/${metodo}/responses/${estado}`, respuesta };
}

function formatear(errores: ErrorObject[] | null | undefined): string {
  return (errores ?? []).map((e) => `${e.instancePath || '(raíz)'} ${e.message}`).join('; ');
}

// Lanza un error descriptivo si el estado o el cuerpo no corresponden a lo que
// el contrato declara para la operación.
export function validarRespuesta(ruta: string, metodo: string, estado: number, cuerpo: unknown): void {
  const verbo = metodo.toLowerCase();
  const operacion = contrato.paths[ruta]?.[verbo];
  if (!operacion) throw new Error(`El contrato no declara ${metodo.toUpperCase()} ${ruta}.`);
  const declarada = operacion.responses[String(estado)];
  if (!declarada) throw new Error(`El contrato no declara el estado ${estado} para ${metodo.toUpperCase()} ${ruta}.`);
  const { puntero, respuesta } = punteroRespuesta(ruta, verbo, String(estado), declarada);
  if (!respuesta?.content?.['application/json']?.schema) return;
  const validar = ajv.compile({ $ref: `${ID_CONTRATO}#${puntero}/content/application~1json/schema` });
  if (!validar(cuerpo)) {
    throw new Error(`La respuesta ${estado} de ${metodo.toUpperCase()} ${ruta} no cumple el contrato: ${formatear(validar.errors)}`);
  }
}
