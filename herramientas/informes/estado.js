// Estado de integración en main de cada iteración (DM-04, condiciones 5 y 6).
// Se actualiza al fusionar cada solicitud y se regeneran los informes.
const IT02_INTEGRADA = process.env.IT02_INTEGRADA === '1';
const COMMIT_IT02 = process.env.COMMIT_IT02 ?? '';

module.exports = {
  it00: { pr: 'PR #1', estado: 'Integrada en `main` (commit de fusión `9e16046`)', corto: 'Integrado (PR #1)' },
  it01: { pr: 'PR #2', estado: 'Integrada en `main` (commit de fusión `8d1845e`)', corto: 'Integrado (PR #2)' },
  it02: IT02_INTEGRADA
    ? { pr: 'PR #3', estado: `Integrada en \`main\` (commit de fusión \`${COMMIT_IT02}\`)`, corto: 'Integrado (PR #3)' }
    : { pr: 'PR #3', estado: 'Construida y verificada; pendiente de la revisión cruzada (DM-05) para integrarse', corto: 'Pendiente de revisión cruzada (PR #3)' },
  IT02_INTEGRADA,
  // Tramo B parcial (SYS-FN-07) y mejora del formulario: rama it-02/bloqueo, PR #6.
  BLOQUEO_INTEGRADO: process.env.BLOQUEO_INTEGRADO === '1',
  bloqueo:
    process.env.BLOQUEO_INTEGRADO === '1'
      ? `integrado en \`main\` con la PR #6, fusión \`${process.env.COMMIT_BLOQUEO ?? ''}\``
      : 'construido y verificado en la rama `it-02/bloqueo`, pendiente de la revisión cruzada (PR #6)',
  // Frase de resumen para la introducción de cada informe.
  resumen: IT02_INTEGRADA
    ? 'IT-00, IT-01 e IT-02 (tramo A) están integradas en `main` (PR #1, #2 y #3), con la batería en verde.' +
      (process.env.BLOQUEO_INTEGRADO === '1' ? ' Del tramo B, SYS-FN-07 también está integrado (PR #6).' : '')
    : 'IT-00 e IT-01 están integradas en `main` (PR #1 y #2). IT-02 (tramo A) está **construida y verificada, pendiente de la revisión cruzada** (PR #3) para integrarse (DM-04, condiciones 5 y 6), y por eso se presenta como construida en rama y no como parte del incremento integrado.',
};
