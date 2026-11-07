// Engineered memory v6 (2026-11-05): confirmation gate for the frozen replication. Pure: no brain runs here. Protocol: documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md sections 4 and 5.
import { numericPairGate } from './transfer-evaluation-v2.mjs';

const GATE_SEED = 20261106;
const COMPARATORS = ['none', 'shuffled', 'quarter'];
const LOWER_QUANTILE = 0.025;
const MAX_LOST_SHARE = 0.02;

// v5's margin of 7 per 150 positions, rounded up to the test size.
export const marginFor = n => Math.ceil(7 * n / 150);

// Every seed must pass. A seed passes only if all five criteria hold (proposal section 4).
export function judgeV6(perSeed, { games, n, resamples = 10000 }) {
  if (!Array.isArray(perSeed) || perSeed.length === 0) throw Error('judgeV6 needs seeds');
  if (games.length !== n) throw Error(`judgeV6: games.length ${games.length} differs from n ${n}`);
  const M = marginFor(n);
  const rows = perSeed.map(({ seed, scores, retention }) => {
    const gate = numericPairGate({
      arms: scores, games, primary: 'full', comparators: COMPARATORS,
      minCorrect: 0, minMargin: 0, resamples, seed: GATE_SEED, lowerQuantile: LOWER_QUANTILE,
    });
    const { none, shuffled, quarter } = gate.comparators;
    const retentionOk = retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= MAX_LOST_SHARE;
    const pass = none.margin >= M
      && shuffled.margin >= M
      && quarter.margin > 0
      && COMPARATORS.every(c => gate.comparators[c].lower > 0)
      && retentionOk;
    return { seed, gate, retention, pass };
  });
  const pass = rows.every(r => r.pass);
  return {
    perSeed: rows,
    pass,
    outcome: pass ? 'passes' : 'does not pass',
    rule: {
      margin: M,
      n,
      primary: 'full',
      comparators: COMPARATORS,
      quarterMarginAbove: 0,
      lowerBoundAbove: 0,
      lowerQuantile: LOWER_QUANTILE,
      gateSeed: GATE_SEED,
      maxLostShare: MAX_LOST_SHARE,
      resamples,
    },
  };
}
