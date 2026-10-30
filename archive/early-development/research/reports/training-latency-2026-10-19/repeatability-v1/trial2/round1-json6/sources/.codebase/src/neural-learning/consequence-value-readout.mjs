import { readMBON } from './mbon-readout.mjs';

// Fixed engineering contrast against an identical unconditioned neural model.
// Teacher labels never enter this readout. Units are not centipawns/probability;
// a nonzero value is memory-dependent valence, not verified chess correctness.
export function readConsequenceValue(populations, reference, scale = 1) {
  if (!Number.isFinite(scale) || scale <= 0) throw Error('Invalid consequence value scale');
  const response = readMBON(populations), baseline = readMBON(reference);
  const learnedChange = response.score - baseline.score;
  if (!Number.isFinite(learnedChange)) throw Error('Nonfinite learned consequence contrast');
  return { ...response, referenceScore: baseline.score, learnedChange,
    value: Math.tanh(learnedChange / scale),
    meaning: 'Fixed reference-relative MBON balance; experimental learned valence, uncalibrated consequence value' };
}
