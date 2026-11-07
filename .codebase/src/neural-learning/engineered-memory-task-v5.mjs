// Engineered memory v5 (2026-11-05): pure task logic for the learned-key memory test. Features come from callers; no brain runs here. Protocol: documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md sections 4-8; module contract: memory-v5-file-formats.md.
import { createHash } from 'node:crypto';
import { NearestEpisodeMemory, rmsScaler } from './kc-episodic-memory-v2.mjs';
import { sparse } from './engineered-memory-task-v4.mjs';
import { frozenScores } from './transfer-evaluation-v1.mjs';
import { numericPairGate } from './transfer-evaluation-v2.mjs';

const sha256 = text => createHash('sha256').update(text).digest('hex');
const sameVector = (a, b) => a.length === b.length && a.every((x, j) => x === b[j]);
const splitKey = key => {
  const i = key.lastIndexOf('|');
  if (i < 0) throw Error(`Key has no move part: ${key}`);
  return [key.slice(0, i), key.slice(i + 1)];
};
const keyed = read => (id, uci) => read(`${id}|${uci}`);

const KEYS = ['K1', 'K2', 'K3'];
const SPARSE_KEEP = 259;
const COMPARATORS = ['none', 'shuffled', 'quarter'];
const GATE_SEED = 20261105;
const LOWER_QUANTILE = 0.025;
const MIN_MARGIN = 7;
const MAX_LOST_SHARE = 0.02;

// Subtracts the mean of a position's legal-move vectors (sorted-UCI order, Float64 sums). Means are cached per position.
function centredOnPosition(source, legalOf) {
  const means = new Map();
  const meanOf = id => {
    if (!means.has(id)) {
      const moves = [...legalOf(id)].sort(); // sum order fixed: sorted UCI
      if (moves.length === 0) throw Error(`No legal moves for ${id}`);
      let sum = null;
      for (const u of moves) {
        const v = source(id, u);
        if (sum === null) sum = new Float64Array(v.length);
        for (let i = 0; i < sum.length; i++) sum[i] += v[i];
      }
      means.set(id, sum.map(x => x / moves.length));
    }
    return means.get(id);
  };
  return (id, uci) => {
    const m = meanOf(id);
    return Float64Array.from(source(id, uci), (x, i) => x - m[i]);
  };
}

export function transformFor(key, { row, blank, legalOf, rawOf, randomOf }) {
  switch (key) {
    case 'K1': return (id, uci) => Float64Array.from(keyed(row)(id, uci));
    case 'K2': { let b = null; return (id, uci) => sparse(keyed(row)(id, uci), b ??= blank(), SPARSE_KEEP); }
    case 'K3': return centredOnPosition(keyed(row), legalOf);
    case 'raw-pc': return centredOnPosition(keyed(rawOf), legalOf);
    case 'random-pc': return centredOnPosition(keyed(randomOf), legalOf);
    default: throw Error(`Unknown key: ${key}`);
  }
}

// Label-free: the first sorted legal move of each of the first floor(n / 4) positions.
export function calibrationKeys(orderedIds, legalOf) {
  return orderedIds.slice(0, Math.floor(orderedIds.length / 4)).map(id => {
    const first = [...legalOf(id)].sort()[0];
    if (first === undefined) throw Error(`No legal moves for ${id}`);
    return `${id}|${first}`;
  });
}

// RMS-scales the transformed calibration vectors, then zeroes coordinates that are 0 in every calibration vector.
export function fitPipeline(transform, calibrationKeys) {
  if (calibrationKeys.length === 0) throw Error('fitPipeline needs calibration keys');
  const vectors = calibrationKeys.map(key => transform(...splitKey(key)));
  const scale = rmsScaler(vectors);
  const live = Array.from({ length: vectors[0].length }, (_, i) => vectors.some(v => v[i] !== 0));
  const apply = (id, uci) => {
    const v = scale(transform(id, uci));
    for (let i = 0; i < live.length; i++) if (!live[i]) v[i] = 0;
    return v;
  };
  return { apply, rmsSha256: scale.rmsSha256, zeroRmsFeatures: live.filter(x => !x).length, calibrationKeys };
}

// ponytail: linear entry scan per write; fine at a few thousand writes, index it if a benchmark says otherwise.
export function buildStore({ slots, values, apply, capacity = 4096, k = 3, arm }) {
  if (values.length !== slots.length) throw Error('values must align with slots');
  const memory = new NearestEpisodeMemory({ capacity, k });
  const counts = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
  slots.forEach((slot, i) => {
    const value = values[i];
    if (value === null) {
      counts.unknown++;
      return;
    }
    const vector = apply(slot.id, slot.uci);
    const existing = memory.entries.find(e => sameVector(e.vector, vector));
    const prior = existing ? existing.value : null;
    const full = memory.size >= capacity;
    memory.write(vector, value, sha256(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value })));
    counts.writes++;
    if (existing) {
      counts.replacements++;
      if (prior === value) counts.identicalConsistent++;
      else counts.identicalConflicting++;
    } else if (full) counts.evictions++;
  });
  return { memory, counts };
}

// A probe is recalled when the sign of the score matches its original value. Score 0 is not recalled.
export function retention(memory, probes) {
  return probes.map(({ vector, value }) => Math.sign(memory.score(vector)) === value);
}

// memory === null is the none arm: every move scores 0, so every legal move ties.
export function scorePositions(memory, positions, apply, categoryOf) {
  return positions.map(({ id, moves }) => {
    const sorted = [...moves].sort();
    const scores = frozenScores(
      sorted,
      u => (memory === null ? 0 : memory.score(apply(id, u))),
      () => (memory === null ? 'none' : memory.fingerprint()),
    );
    const max = Math.max(...scores);
    const top = sorted.filter((_, i) => scores[i] === max);
    const s = top.filter(u => categoryOf(id, u) === 'safe').length;
    const c = top.length;
    return { id, c, s, expected: s / c };
  });
}

// Margin = (AB store - AB shuffled) + (BA store - BA shuffled). Ties go to the lower K number.
export function selectKey(dev) {
  const margins = Object.fromEntries(KEYS.map(k => [
    k,
    (dev[k].AB.store - dev[k].AB.shuffled) + (dev[k].BA.store - dev[k].BA.shuffled),
  ]));
  let selected = null;
  for (const k of KEYS) {
    if (margins[k] > 0 && (selected === null || margins[k] > margins[selected])) selected = k;
  }
  return { margins, selected };
}

// Confirmation gate (proposal section 8). Every seed must pass; a seed passes only if all four criteria hold.
export function judgeV5(perSeed, { games, resamples = 10000 } = {}) {
  if (!Array.isArray(perSeed) || perSeed.length === 0) throw Error('judgeV5 needs seeds');
  const rows = perSeed.map(({ seed, scores, retention: r }) => {
    const gate = numericPairGate({
      arms: scores, games, primary: 'full', comparators: COMPARATORS,
      minCorrect: 0, minMargin: 0, resamples, seed: GATE_SEED, lowerQuantile: LOWER_QUANTILE,
    });
    const { none, shuffled, quarter } = gate.comparators;
    const retentionOk = r.previouslyRecalled > 0 && r.lost / r.previouslyRecalled <= MAX_LOST_SHARE;
    const pass = none.margin >= MIN_MARGIN
      && shuffled.margin >= MIN_MARGIN
      && quarter.margin > 0
      && COMPARATORS.every(c => gate.comparators[c].lower > 0)
      && retentionOk;
    return { seed, gate, retention: r, pass };
  });
  const pass = rows.every(r => r.pass);
  return {
    perSeed: rows,
    pass,
    outcome: pass ? 'passes' : 'does not pass',
    rule: {
      primary: 'full',
      comparators: COMPARATORS,
      minNoneMargin: MIN_MARGIN,
      minShuffledMargin: MIN_MARGIN,
      quarterMarginAbove: 0,
      lowerBoundAbove: 0,
      lowerQuantile: LOWER_QUANTILE,
      gateSeed: GATE_SEED,
      maxLostShare: MAX_LOST_SHARE,
      resamples,
    },
  };
}
