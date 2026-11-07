// Fixed engineering arbitration; no fitted coefficients or teacher labels.
export function memoryBackedScore(system, neuralValue, recalled) {
  if (!['fly-memory', 'memory-only', 'fly-only'].includes(system) || !Number.isFinite(neuralValue)
    || typeof recalled?.known !== 'boolean' || !Number.isFinite(recalled.value)
    || (recalled.known && ![-1, 1].includes(recalled.value)) || (!recalled.known && recalled.value !== 0)) throw Error('Invalid policy observation');
  const neural = Math.max(-1, Math.min(1, neuralValue / .32));
  if (system === 'fly-only') return neural;
  if (recalled.known) return recalled.value;
  return system === 'memory-only' ? 0 : neural;
}

export function policyChoice(scores, draw) {
  if (!Array.isArray(scores) || scores.length !== 2 || !scores.every(Number.isFinite) || !(draw >= 0 && draw < 1)) throw Error('Invalid policy choice');
  return draw < 1 / (1 + Math.exp((scores[1] - scores[0]) / .1)) ? 0 : 1;
}
