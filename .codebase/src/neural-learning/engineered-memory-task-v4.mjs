// Engineered memory v4 (2026-11-04): externally scheduled representation assay. Pure task logic. Features come from the caller, so the brain is never touched here. Every arm stores the same verified ledger; only the feature and (for mismatched arms) the outcome values change. Protocol: documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md sections 4-7.
import { createHash } from 'node:crypto';
import { NearestEpisodeMemory } from './kc-episodic-memory-v2.mjs';
import { frozenScores } from './transfer-evaluation-v1.mjs';
import { numericPairGate } from './transfer-evaluation-v2.mjs';

export const V4_ARMS = ['graph', 'graph-sparse', 'graph-mismatched', 'graph-sparse-mismatched', 'raw', 'random', 'graph-centred', 'none'];

export const FEATURE_OF_ARM = {
  graph: 'graph',
  'graph-sparse': 'graph-sparse',
  'graph-mismatched': 'graph',
  'graph-sparse-mismatched': 'graph-sparse',
  raw: 'raw',
  random: 'random',
  'graph-centred': 'graph-centred',
  none: null,
};

// Each candidate is gated against these comparators. 'graph-centred' is a diagnostic and is never a candidate.
export const CANDIDATES = {
  graph: ['raw', 'random', 'none', 'graph-mismatched'],
  'graph-sparse': ['raw', 'random', 'none', 'graph-sparse-mismatched'],
};

const MISMATCHED = new Set(['graph-mismatched', 'graph-sparse-mismatched']);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const sameVector = (a, b) => a.length === b.length && a.every((x, j) => x === b[j]);

export function centred(kc, blank) {
  if (kc.length !== blank.length) throw Error('kc and blank lengths differ');
  return Float64Array.from(kc, (x, i) => x - blank[i]);
}

// ponytail: full sort of 5,177 values per move; fine at this scale, bounded heap if the benchmark says otherwise.
export function sparse(kc, blank, keep = 259) {
  if (!Number.isSafeInteger(keep) || keep < 1) throw Error('keep must be a positive integer');
  const r = centred(kc, blank).map(x => (x > 0 ? x : 0));
  const order = [...r.keys()].filter(i => r[i] > 0).sort((a, b) => r[b] - r[a] || a - b);
  const out = new Float64Array(r.length);
  for (const i of order.slice(0, keep)) out[i] = r[i];
  return out;
}

export function sparseDensity(v) {
  return v.reduce((n, x) => (x !== 0 ? n + 1 : n), 0) / v.length;
}

export function runArmV4({ arm, ledger, permutedValues, test, featureOf, categoryOf, capacity = 2048, k = 3, log = () => {} }) {
  if (!V4_ARMS.includes(arm)) throw Error(`Unknown arm: ${arm}`);
  const mismatched = MISMATCHED.has(arm);
  const knownValues = ledger.map(s => s.value).filter(v => v !== null);
  if (knownValues.some(v => v !== 1 && v !== -1)) throw Error('Ledger values must be 1, -1 or null');
  if (mismatched) {
    const count = (xs, v) => xs.filter(x => x === v).length;
    if (!permutedValues || permutedValues.length !== knownValues.length) {
      throw Error(`${arm} needs ${knownValues.length} permuted values, one per known slot`);
    }
    if (count(permutedValues, 1) !== count(knownValues, 1) || count(permutedValues, -1) !== count(knownValues, -1)) {
      throw Error(`${arm}: permuted values must keep the +1/-1 counts of the known ledger values`);
    }
  }

  // Practice: fixed ledger order. Unknown slots write nothing in every arm. Arm 'none' reads and writes nothing.
  const memory = new NearestEpisodeMemory({ capacity, k });
  let writes = 0;
  let unknown = 0;
  let replacements = 0;
  let evictions = 0;
  let knownIndex = 0;
  for (const slot of ledger) {
    if (slot.value === null) {
      unknown++;
      continue;
    }
    const value = mismatched ? permutedValues[knownIndex] : slot.value;
    knownIndex++;
    if (arm === 'none') continue;
    const feature = featureOf(slot.id, slot.uci);
    const existed = memory.entries.some(e => sameVector(e.vector, feature));
    const full = memory.size >= capacity;
    const evidenceHash = sha256(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value }));
    memory.write(feature, value, evidenceHash);
    writes++;
    if (existed) replacements++;
    else if (full) evictions++;
    log({ kind: 'write', arm, slot: slot.slot, id: slot.id, uci: slot.uci, value, evidenceHash });
  }

  // Test: the store is frozen. Each position scores s / c: c moves tied at the top, s of them safe.
  const before = memory.fingerprint();
  const expected = [];
  let ties = 0;
  for (const p of test) {
    const moves = [...p.moves].sort();
    const score = arm === 'none' ? () => 0 : u => memory.score(featureOf(p.id, u));
    const scores = frozenScores(moves, score, () => memory.fingerprint());
    const max = Math.max(...scores);
    const top = moves.filter((_, i) => scores[i] === max);
    const s = top.filter(u => categoryOf(p.id, u) === 'safe').length;
    const c = top.length;
    expected.push(s / c);
    if (c > 1) ties++;
    log({ kind: 'test', arm, id: p.id, c, s, expected: s / c });
  }
  if (memory.fingerprint() !== before) throw Error('Memory changed during testing');
  if (arm === 'none' && memory.size !== 0) throw Error('No-memory arm changed memory');

  return {
    arm,
    writes,
    unknown,
    stored: memory.size,
    replacements,
    evictions,
    test: expected,
    expectedTotal: expected.reduce((a, b) => a + b, 0),
    ties,
    fingerprint: memory.fingerprint(),
  };
}

// rows: runArmV4 results, each tagged with its seed ({ seed, ...result }). testGames: gameId per test position.
export function judgeV4(rows, { seeds, testGames, minCorrect = 96, minMargin = 9, resamples = 10000 }) {
  if (!Array.isArray(seeds) || seeds.length === 0) throw Error('judgeV4 needs seeds');
  const perCandidate = {};
  for (const cand of Object.keys(CANDIDATES)) {
    const perSeed = seeds.map(seed => {
      const seedRows = rows.filter(r => r.seed === seed);
      const arms = Object.fromEntries(seedRows.map(r => [r.arm, r.test]));
      for (const name of [cand, ...CANDIDATES[cand]]) {
        if (!arms[name]) throw Error(`Missing row: ${name} seed ${seed}`);
      }
      const gate = numericPairGate({
        arms, games: testGames, primary: cand, comparators: CANDIDATES[cand],
        minCorrect, minMargin, resamples, seed: 20261103, lowerQuantile: 0.025,
      });
      return { seed, ...gate };
    });
    perCandidate[cand] = { pass: perSeed.every(s => s.pass), perSeed };
  }
  const winners = Object.keys(perCandidate).filter(c => perCandidate[c].pass);
  const pass = winners.length > 0;
  return {
    perCandidate,
    winners,
    pass,
    outcome: pass ? 'passes' : 'does not pass',
    rule: { minCorrect, minMargin, resamples, gateSeed: 20261103, lowerQuantile: 0.025, candidates: CANDIDATES },
  };
}
