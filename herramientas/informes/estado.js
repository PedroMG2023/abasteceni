// Estado de integración en main de cada iteración (DM-04, condiciones 5 y 6).
// Se actualiza al fusionar cada solicitud y se regeneran los informes. Lo ya
// fusionado (PR #3, #6 y #7) es un hecho; la PR #8 depende de RECUPERACION_INTEGRADA.
const IT02_INTEGRADA = process.env.IT02_INTEGRADA !== '0';
const COMMIT_IT02 = process.env.COMMIT_IT02 ?? '6d0f2d3';
const BLOQUEO_INTEGRADO = process.env.BLOQUEO_INTEGRADO !== '0';
const COMMIT_BLOQUEO = process.env.COMMIT_BLOQUEO ?? '2bd1b3e';
// Tramo B completo y tramo C parcial (SYS-FN-05 y SYS-FN-08): rama it-02/recuperacion, PR #8.
const RECUPERACION_INTEGRADA = process.env.RECUPERACION_INTEGRADA === '1';
const COMMIT_RECUPERACION = process.env.COMMIT_RECUPERACION ?? '';
const CI_RECUPERACION = 'ejecución 39339908565';

module.exports = {
  it00: { pr: 'PR #1', estado: 'Integrada en `main` (commit de fusión `9e16046`)', corto: 'Integrado (PR #1)' },
  it01: { pr: 'PR #2', estado: 'Integrada en `main` (commit de fusión `8d1845e`)', corto: 'Integrado (PR #2)' },
  it02: IT02_INTEGRADA
    ? { pr: 'PR #3', estado: `Integrada en \`main\` (commit de fusión \`${COMMIT_IT02}\`)`, corto: 'Integrado (PR #3)' }
    : { pr: 'PR #3', estado: 'Construida y verificada; pendiente de la revisión cruzada (DM-05) para integrarse', corto: 'Pendiente de revisión cruzada (PR #3)' },
  IT02_INTEGRADA,
  // Tramo B parcial (SYS-FN-07) y mejora del formulario: rama it-02/bloqueo, PR #6.
  BLOQUEO_INTEGRADO,
  bloqueo: BLOQUEO_INTEGRADO
    ? `integrado en \`main\` con la PR #6, fusión \`${COMMIT_BLOQUEO}\``
    : 'construido y verificado en la rama `it-02/bloqueo`, pendiente de la revisión cruzada (PR #6)',
  RECUPERACION_INTEGRADA,
  CI_RECUPERACION,
  recuperacion: RECUPERACION_INTEGRADA
    ? `integrados en \`main\` con la PR #8, fusión \`${COMMIT_RECUPERACION}\``
    : `construidos y verificados en la rama \`it-02/recuperacion\` (${CI_RECUPERACION}, 10/10 en verde), pendientes de la PR #8`,
  // Forma corta y sin concordancia, para acompañar a un archivo o a una pantalla.
  pr8: RECUPERACION_INTEGRADA ? `integración en \`main\` con la PR #8 (\`${COMMIT_RECUPERACION}\`)` : 'PR #8, pendiente de la revisión cruzada',
  // Frase de resumen para la introducción de cada informe.
  resumen: IT02_INTEGRADA
    ? 'IT-00, IT-01 e IT-02 (tramo A) están integradas en `main` (PR #1, #2 y #3), con la batería en verde.' +
      (BLOQUEO_INTEGRADO ? ' Del tramo B, SYS-FN-07 también está integrado (PR #6).' : '') +
      (RECUPERACION_INTEGRADA
        ? ' SYS-FN-05, que completa el tramo B, y SYS-FN-08, del tramo C, están integrados (PR #8).'
        : ` SYS-FN-05, que completa el tramo B, y SYS-FN-08, del tramo C, están construidos y verificados (${CI_RECUPERACION}, 10/10 en verde), pendientes de la revisión cruzada y de la integración (PR #8).`)
    : 'IT-00 e IT-01 están integradas en `main` (PR #1 y #2). IT-02 (tramo A) está **construida y verificada, pendiente de la revisión cruzada** (PR #3) para integrarse (DM-04, condiciones 5 y 6), y por eso se presenta como construida en rama y no como parte del incremento integrado.',
};
