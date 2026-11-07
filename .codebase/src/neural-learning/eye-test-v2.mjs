// Arithmetic for Eye test v2 (restart plan revision 2026-11-03, problem 5): the reachable strength settings and the strength measure M.
// It runs no model. The decoder signs come from the checker's answers, so M is a sensitivity measure, not learning.

const TYPES = ['MBON05', 'MBON27', 'MBON09', 'MBON07', 'MBON06'];
export const OUTPUT_TYPES = Object.freeze([...TYPES]);

// Every inspected learning rule keeps gains at or below 1.
export function gainSettings(weights) {
  if (!weights || typeof weights.length !== 'number' || weights.length === 0) {
    throw new Error('Invalid decoder weights');
  }
  const n = weights.length;
  const plus = new Float64Array(n);
  const minus = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    if (typeof w !== 'number' || !Number.isFinite(w)) {
      throw new Error('Invalid decoder weights');
    }
    plus[i] = w < 0 ? 0.2 : 1.0;
    minus[i] = w > 0 ? 0.2 : 1.0;
  }
  return { plus, minus };
}

export function pairStrength({ safePlus, unsafePlus, safeMinus, unsafeMinus }) {
  const sets = [safePlus, unsafePlus, safeMinus, unsafeMinus];
  for (const set of sets) {
    for (const t of TYPES) {
      if (set == null || !Number.isFinite(set[t])) {
        throw new Error('Missing or invalid output activity');
      }
    }
  }
  let sum = 0;
  for (const t of TYPES) {
    const d = (safePlus[t] - unsafePlus[t]) - (safeMinus[t] - unsafeMinus[t]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function strengthM(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error('No pairs');
  }
  const byGame = new Map();
  for (const { game, activity } of pairs) {
    if (!byGame.has(game)) byGame.set(game, []);
    byGame.get(game).push(pairStrength(activity));
  }
  let total = 0;
  for (const strengths of byGame.values()) {
    total += strengths.reduce((a, b) => a + b, 0) / strengths.length;
  }
  return total / byGame.size;
}

// Same 10% threshold as restart plan section 7; a zero or invalid token measure is a failed measurement, never a pass.
export function strengthGate(mGraph, mTokens) {
  if (!Number.isFinite(mGraph) || !Number.isFinite(mTokens) || mTokens <= 0) {
    return { pass: false, ratio: null, reason: 'failed measurement' };
  }
  return { pass: mGraph >= 0.10 * mTokens, ratio: mGraph / mTokens, reason: null };
}
