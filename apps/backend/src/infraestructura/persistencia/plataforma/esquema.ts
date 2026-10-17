import { pgSchema } from 'drizzle-orm/pg-core';

// Esquema transversal: bandeja de salida (ADR-01) y contador de peticiones (ADR-08).
export const esquema = pgSchema('plataforma');
