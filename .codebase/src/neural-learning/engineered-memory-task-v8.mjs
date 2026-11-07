// Engineered memory v8 (2026-11-07): all-capture ledger and judge for the capture-choice test. Pure: no brain runs here. Protocol: documentation/design/neural-learning/memory-v8-proposal-2026-11-07.md sections 1, 2 and 4.
import { partialFisherYates } from './engineered-memory-v4-ledger.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';
import { numericPairGate } from './transfer-evaluation-v2.mjs';
import { marginFor } from './engineered-memory-task-v6.mjs';

export const LEDGER_SALT = 0x1ed8;
export const GATE_SEED = 20261108;
const COMPARATORS = ['none', 'shuffled', 'quarter'];
const LOWER_QUANTILE = 0.025;
const MAX_LOST_SHARE = 0.02;

// Section 1: every eligible (id, uci) once, in a seeded order. Unknown captures get no slot; quiet moves are an error.
export function captureLedger({ practice, capturesOf, certificateOf, seed }) {
  if (new Set(practice).size !== practice.length) throw Error('captureLedger: practice ids must be unique');
  const base = [];
  for (const id of practice) {
    const ucis = [...capturesOf(id)].sort();
    if (new Set(ucis).size !== ucis.length) throw Error(`captureLedger: repeated capture at ${id}`);
    for (const uci of ucis) {
      const c = certificateOf(id, uci);
      if (!c) throw Error(`captureLedger: no certificate for ${id} ${uci}`);
      if (c.category === 'unknown') continue;
      if (c.category !== 'safe' && c.category !== 'unsafe') throw Error(`captureLedger: ${id} ${uci} has category ${c.category}, not a capture candidate`);
      const want = c.category === 'safe' ? 1 : -1;
      if (c.value !== want) throw Error(`captureLedger: ${id} ${uci} is ${c.category} with value ${c.value}`);
      base.push({ id, uci, category: c.category, value: c.value, certificateSha256: c.certificateSha256 });
    }
  }
  if (base.length === 0) throw Error('captureLedger: no eligible captures');
  const indices = partialFisherYates(base.map((_, i) => i), base.length, mulberry32((seed ^ LEDGER_SALT) >>> 0));
  return indices.map((i, slot) => {
    const { id, uci, category, value, certificateSha256 } = base[i];
    return { slot, id, uci, category, value, certificateSha256 };
  });
}

// Same rule as judgeV7 (section 4), with gate seed 20261108. Every seed must pass.
export function judgeV8(perSeed, { games, n, resamples = 10000 }) {
  if (!Array.isArray(perSeed) || perSeed.length === 0) throw Error('judgeV8 needs seeds');
  if (games.length !== n) throw Error(`judgeV8: games.length ${games.length} differs from n ${n}`);
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
