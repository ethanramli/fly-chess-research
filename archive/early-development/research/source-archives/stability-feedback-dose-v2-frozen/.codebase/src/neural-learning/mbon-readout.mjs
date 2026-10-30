// Fixed experimental MBON balance, not a learned decoder or natural action circuit.
const mean = values => {
  if (!Array.isArray(values) || values.length < 1 || values.length > 128 || !values.every(Number.isFinite)) throw Error('Invalid bounded MBON population');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
export function readMBON(populations) {
  const MBON12 = mean(populations?.MBON12), MBON01 = mean(populations?.MBON01);
  const score = MBON12 - MBON01;
  if (!Number.isFinite(score)) throw Error('Nonfinite MBON preference');
  return { MBON12, MBON01, score, meaning: 'Fixed mean(MBON12) minus mean(MBON01); larger preferred; engineered memory readout' };
}
export function chooseMBON(A, B) {
  if (!Number.isFinite(A?.score) || !Number.isFinite(B?.score)) throw Error('Invalid MBON scores');
  const M = A.score - B.score;
  if (!Number.isFinite(M)) throw Error('Nonfinite action margin');
  return { choice: M >= 0 ? 'A' : 'B', M };
}
