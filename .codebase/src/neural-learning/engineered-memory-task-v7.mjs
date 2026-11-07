// Engineered memory v7 (2026-11-05): capture-candidate scoring and judge for the capture-choice test. Pure: no brain runs here. Protocol: documentation/design/neural-learning/memory-v7-proposal-2026-11-05.md sections 1, 3, 4 and 5.
import { numericPairGate } from './transfer-evaluation-v2.mjs';
import { partialFisherYates } from './engineered-memory-v4-ledger.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';
import { marginFor } from './engineered-memory-task-v6.mjs';

const GATE_SEED = 20261107;
const COMPARATORS = ['none', 'shuffled', 'quarter'];
const LOWER_QUANTILE = 0.025;
const MAX_LOST_SHARE = 0.02;
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const uciOf = move => move.from + move.to + (move.promotion ?? '');
const count = (xs, v) => xs.filter(x => x === v).length;

// Scoring set (section 1): legal captures on the replayed board whose certificate is safe or unsafe. Quiet moves and unknown captures are not candidates.
export function captureCandidates(board, legal, categoryOf, id) {
  const moves = new Map(board.moves({ verbose: true }).map(m => [uciOf(m), m]));
  if (moves.size !== legal.length || legal.some(uci => !moves.has(uci))) throw Error(`Legal moves differ from the replayed board at ${id}`);
  const kept = legal
    .filter(uci => moves.get(uci).captured)
    .map(uci => ({ uci, category: categoryOf(id, uci) }))
    .filter(({ category }) => category === 'safe' || category === 'unsafe');
  const categories = new Set(kept.map(k => k.category));
  if (!categories.has('safe') || !categories.has('unsafe')) throw Error(`Capture candidates at ${id} lack a safe or an unsafe capture`);
  return kept.map(k => k.uci).sort();
}

// Shuffled arm (section 3, [r1-2]). The +1/-1 values of known capture slots are permuted among those slots only. Quiet slots keep their value, unknown slots stay null.
export function permuteCaptureValues(ledger, isCaptureSlot, seed) {
  const captureSlots = ledger.filter(slot => slot.value !== null && isCaptureSlot(slot));
  const indices = partialFisherYates(captureSlots.map((_, i) => i), captureSlots.length, mulberry32((seed ^ 0x7ca7) >>> 0));
  let t = 0;
  const values = ledger.map(slot => {
    if (slot.value === null) return null;
    return isCaptureSlot(slot) ? captureSlots[indices[t++]].value : slot.value;
  });
  const original = ledger.map(slot => slot.value);
  if (count(values, 1) !== count(original, 1) || count(values, -1) !== count(original, -1)) {
    throw Error('Capture permutation changed the count of +1 or -1 values');
  }
  return { values, indices };
}

// Descriptive reference (section 5). Returns every candidate with the top score, in candidate order.
// ponytail: a promotion capture scores the pawn (move.piece is 'p'); the promoted piece is not counted. Add it when a promotion capture is a candidate.
export function pieceValueChoice(board, candidates) {
  const moves = new Map(board.moves({ verbose: true }).map(m => [uciOf(m), m]));
  const scored = candidates.map(uci => {
    const move = moves.get(uci);
    if (!move?.captured) throw Error(`Not a legal capture on this board: ${uci}`);
    return { uci, score: PIECE_VALUE[move.captured] - PIECE_VALUE[move.piece] };
  });
  const best = Math.max(...scored.map(s => s.score));
  return scored.filter(s => s.score === best).map(s => s.uci);
}

// Same rule as judgeV6 (section 4), with gate seed 20261107. Every seed must pass.
export function judgeV7(perSeed, { games, n, resamples = 10000 }) {
  if (!Array.isArray(perSeed) || perSeed.length === 0) throw Error('judgeV7 needs seeds');
  if (games.length !== n) throw Error(`judgeV7: games.length ${games.length} differs from n ${n}`);
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
