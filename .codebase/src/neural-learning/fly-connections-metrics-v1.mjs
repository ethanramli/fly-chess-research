// Fly connections memory v1, revision 2 sections 4-6: pure metrics on supplied numbers.
// Producer module. The independent auditor implements its own arithmetic and must not use this file as an oracle.
import { numericPairGate } from './transfer-evaluation-v2.mjs';

const SUCCESS = 0.75;
const PRESSURE = 0.01;
const TIE_ABS = 1e-9;
const TIE_REL = 1e-7;
const f32 = new Float32Array(1);
const f32Bits = new Uint32Array(f32.buffer);

const isName = x => typeof x === 'string' && x.length > 0;
const uciOf = m => m.from + m.to + (m.promotion ?? '');
const byUci = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const bitsOf = x => { f32[0] = x; return f32Bits[0]; };
const acquiredBy = (t, base, epsilon) => t.success >= SUCCESS && t.margin > t.tolerance && t.margin - base.margin > epsilon;

export function scoreAllLegal(board, ranked, outcomes) {
  if (typeof board?.moves !== 'function') throw Error('board must be a chess.js Chess instance');
  const legal = board.moves({ verbose: true }).map(uciOf);
  if (legal.length === 0) throw Error('No legal moves');
  const legalSet = new Set(legal);
  if (legalSet.size !== legal.length) throw Error('Duplicate legal move generated');
  legal.sort(byUci);

  if (!Array.isArray(ranked)) throw Error('ranked must be an array');
  const seen = new Set();
  for (const entry of ranked) {
    if (!entry || typeof entry.move !== 'string') throw Error('ranked entries need a string move');
    if (!legalSet.has(entry.move)) throw Error(`Nonlegal ranked move ${entry.move}`);
    if (seen.has(entry.move)) throw Error(`Duplicate ranked move ${entry.move}`);
    if (!Number.isFinite(entry.score)) throw Error(`Nonfinite score for ${entry.move}`);
    seen.add(entry.move);
  }
  if (ranked.length !== legal.length) throw Error(`Ranking has ${ranked.length} moves; legal count is ${legal.length}; every legal move must appear once`);
  ranked.forEach((entry, i) => { if (entry.move !== legal[i]) throw Error('ranked must be sorted by UCI'); });

  if (!outcomes || typeof outcomes !== 'object' || Array.isArray(outcomes)) throw Error('outcomes must be an object');
  for (const key of Object.keys(outcomes)) if (!legalSet.has(key)) throw Error(`Unknown outcome key ${key}`);
  for (const move of legal) {
    if (!Object.hasOwn(outcomes, move)) throw Error(`Missing outcome for ${move}`);
    if (typeof outcomes[move] !== 'boolean') throw Error(`Outcome for ${move} must be boolean`);
  }

  const top = Math.max(...ranked.map(e => e.score));
  const tolerance = TIE_ABS + TIE_REL * Math.max(...ranked.map(e => Math.abs(e.score)));
  const topMoves = ranked.filter(e => Math.abs(top - e.score) <= tolerance).map(e => ({ move: e.move, score: e.score }));
  const s = topMoves.filter(e => outcomes[e.move]).length;
  const c = topMoves.length;
  const successScores = ranked.filter(e => outcomes[e.move]).map(e => e.score);
  const failureScores = ranked.filter(e => !outcomes[e.move]).map(e => e.score);
  const margin = successScores.length > 0 && failureScores.length > 0
    ? Math.max(...successScores) - Math.max(...failureScores)
    : null;
  return {
    topMoves,
    s,
    c,
    success: s / c,
    margin,
    tolerance,
    counts: { legal: legal.length, successes: successScores.length, failures: failureScores.length },
  };
}

function checkRecords(name, records, ref) {
  if (!Array.isArray(records) || records.length === 0) throw Error(`${name} must be a nonempty array`);
  if (ref && records.length !== ref.length) throw Error(`${name} has ${records.length} records; reference has ${ref.length}`);
  records.forEach((r, i) => {
    if (!r || !isName(r.boardId) || !isName(r.gameId)) throw Error(`${name}[${i}] needs nonempty boardId and gameId`);
    if (!Number.isFinite(r.margin)) throw Error(`${name}[${i}] margin must be finite (null is not allowed)`);
    if (!(Number.isFinite(r.success) && r.success >= 0 && r.success <= 1)) throw Error(`${name}[${i}] success must be in [0, 1]`);
    if (!(Number.isFinite(r.tolerance) && r.tolerance >= 0)) throw Error(`${name}[${i}] tolerance must be finite and nonnegative`);
    if (ref && (r.boardId !== ref[i].boardId || r.gameId !== ref[i].gameId)) throw Error(`${name}[${i}] identity/order differs from reference`);
  });
}

function checkGroup(names, arrays) {
  checkRecords(names[0], arrays[0]);
  const ids = arrays[0].map(r => r.boardId);
  if (new Set(ids).size !== ids.length) throw Error(`${names[0]} has a duplicate boardId`);
  names.slice(1).forEach((name, k) => checkRecords(name, arrays[k + 1], arrays[0]));
}

export function judgeRetention({ a0, aAfterA, aAfterB, aFinal, bBefore, bAfter, bFinal, minAcquired, retention = 0.70, epsilon = 1e-6 }) {
  checkGroup(['a0', 'aAfterA', 'aAfterB', 'aFinal'], [a0, aAfterA, aAfterB, aFinal]);
  checkGroup(['bBefore', 'bAfter', 'bFinal'], [bBefore, bAfter, bFinal]);
  if (!Number.isSafeInteger(minAcquired) || minAcquired < 1 || minAcquired > Math.min(a0.length, bBefore.length)) throw Error('minAcquired must be a safe integer from 1 to the board count');
  if (!(Number.isFinite(retention) && retention > 0 && retention <= 1)) throw Error('retention must be in (0, 1]');
  if (!(Number.isFinite(epsilon) && epsilon >= 0)) throw Error('epsilon must be finite and nonnegative');

  const a = a0.map((naive, i) => {
    const t = aAfterA[i], m = aAfterB[i], f = aFinal[i];
    const learned = t.margin - naive.margin;
    const acquired = acquiredBy(t, naive, epsilon);
    const ratioAfterB = learned > epsilon ? (m.margin - naive.margin) / learned : null;
    const ratioAfterFinal = learned > epsilon ? (f.margin - naive.margin) / learned : null;
    // Short-circuit: when acquired, learned > epsilon, so both ratios are numbers.
    const retained = acquired && m.success >= SUCCESS && f.success >= SUCCESS && ratioAfterB >= retention && ratioAfterFinal >= retention;
    return { boardId: naive.boardId, gameId: naive.gameId, acquired, retained, learned, ratioAfterB, ratioAfterFinal, records: { naive, afterA: t, afterB: m, afterFinal: f } };
  });
  const learnedSum = a.reduce((sum, x) => sum + x.learned, 0);
  const groupRatioAfterB = learnedSum > 0 ? a.reduce((sum, x) => sum + (x.records.afterB.margin - x.records.naive.margin), 0) / learnedSum : null;
  const groupRatioAfterFinal = learnedSum > 0 ? a.reduce((sum, x) => sum + (x.records.afterFinal.margin - x.records.naive.margin), 0) / learnedSum : null;
  const groupPass = learnedSum > 0 && groupRatioAfterB >= retention && groupRatioAfterFinal >= retention;
  const aAcquired = a.filter(x => x.acquired).length;
  const aLost = a.filter(x => x.acquired && !x.retained).map(x => x.boardId);
  const aPass = aAcquired >= minAcquired && aLost.length === 0 && groupPass;

  // B acquisition is decided at bAfter against bBefore and never re-selected at bFinal.
  const b = bBefore.map((before, i) => {
    const t = bAfter[i], f = bFinal[i];
    const acquired = acquiredBy(t, before, epsilon);
    return { boardId: before.boardId, gameId: before.gameId, acquired, retained: acquired && f.success >= SUCCESS, records: { before, after: t, final: f } };
  });
  const bAcquired = b.filter(x => x.acquired).length;
  const bLost = b.filter(x => x.acquired && !x.retained).map(x => x.boardId);
  const bPass = bAcquired >= minAcquired && bLost.length === 0;

  return {
    pass: aPass && bPass,
    a: { pass: aPass, acquired: aAcquired, minAcquired, groupRatioAfterB, groupRatioAfterFinal, groupPass, lostIds: aLost, failedIds: a.filter(x => !x.retained).map(x => x.boardId), items: a },
    b: { pass: bPass, acquired: bAcquired, minAcquired, lostIds: bLost, failedIds: b.filter(x => !x.retained).map(x => x.boardId), items: b },
  };
}

function edgeIndex(edgeIds) {
  if (!edgeIds || edgeIds.length === 0) throw Error('edgeIds must be a nonempty list');
  const index = new Map();
  for (let i = 0; i < edgeIds.length; i++) {
    const id = edgeIds[i];
    if (!Number.isSafeInteger(id) || index.has(id)) throw Error(`Invalid or duplicate edge ID ${id}`);
    index.set(id, i);
  }
  return index;
}

function checkPositive(xs, n, name) {
  if (!xs || xs.length !== n) throw Error(`${name} must have one value per edge`);
  for (let i = 0; i < n; i++) if (!(Number.isFinite(xs[i]) && xs[i] > 0)) throw Error(`${name}[${i}] must be finite and positive`);
}

function checkMagnitudes(xs, n, name) {
  if (!(xs instanceof Float32Array)) throw Error(`${name} must be a Float32Array`);
  checkPositive(xs, n, name);
}

export function recordEffectiveWrites(edgeIds, base, beforeGains, afterGains, beforeMagnitude, afterMagnitude) {
  const n = edgeIds.length;
  edgeIndex(edgeIds);
  checkPositive(base, n, 'base');
  checkPositive(beforeGains, n, 'beforeGains');
  checkPositive(afterGains, n, 'afterGains');
  checkMagnitudes(beforeMagnitude, n, 'beforeMagnitude');
  checkMagnitudes(afterMagnitude, n, 'afterMagnitude');
  const out = [];
  for (let i = 0; i < n; i++) {
    const gainChanged = beforeGains[i] !== afterGains[i];
    const beforeBits = bitsOf(beforeMagnitude[i]);
    const afterBits = bitsOf(afterMagnitude[i]);
    const effectiveChanged = beforeBits !== afterBits;
    if (!gainChanged && !effectiveChanged) continue;
    const relativeEffectiveChange = Math.abs(afterMagnitude[i] - beforeMagnitude[i]) / base[i];
    out.push({
      edgeId: edgeIds[i],
      beforeGain: beforeGains[i],
      afterGain: afterGains[i],
      beforeMagnitude: beforeMagnitude[i],
      afterMagnitude: afterMagnitude[i],
      beforeBits,
      afterBits,
      gainChanged,
      effectiveChanged,
      relativeEffectiveChange,
      pressureWrite: effectiveChanged && relativeEffectiveChange >= PRESSURE,
    });
  }
  return out;
}

export function summarizePressure(aWrittenEdges, bPressureEdges, base, finalMagnitude, edgeIds) {
  const n = edgeIds.length;
  const index = edgeIndex(edgeIds);
  checkPositive(base, n, 'base');
  checkMagnitudes(finalMagnitude, n, 'finalMagnitude');
  if (!aWrittenEdges || aWrittenEdges.length === 0) throw Error('No A-written edges: empty A capacity');
  const members = (ids, name) => {
    if (!ids || typeof ids[Symbol.iterator] !== 'function') throw Error(`${name} must be a list`);
    const set = new Set();
    for (const id of ids) {
      if (!index.has(id) || set.has(id)) throw Error(`${name} needs unique edge IDs from the mask (bad ${id})`);
      set.add(id);
    }
    return set;
  };
  const written = members(aWrittenEdges, 'aWrittenEdges');
  const pressure = members(bPressureEdges, 'bPressureEdges');
  const shared = [...written].filter(id => pressure.has(id)).length;
  const meaningfulFinal = edgeIds.filter((_, i) => Math.abs(finalMagnitude[i] - base[i]) / base[i] >= PRESSURE).length;
  // Exact integer form of numerator / denominator >= 0.25.
  const sharedPass = shared * 4 >= written.size;
  const maskPass = meaningfulFinal * 4 >= n;
  return {
    shared: { numerator: shared, denominator: written.size, pass: sharedPass },
    mask: { numerator: meaningfulFinal, denominator: n, pass: maskPass },
    pass: sharedPass && maskPass,
  };
}

export function compareByGame({ arms, games, primary, comparators, seed }) {
  if (!Array.isArray(games) || games.length === 0 || !games.every(isName)) throw Error('Game IDs must be nonempty strings');
  if (!Number.isInteger(seed) || seed < -(2 ** 31) || seed > 2 ** 31 - 1) throw Error('seed must be a 32-bit integer');
  if (!arms || typeof arms !== 'object') throw Error('arms must be an object');
  for (const [name, scores] of Object.entries(arms)) {
    if (!Array.isArray(scores) || scores.length !== games.length) throw Error(`Arm ${name} needs one score per game`);
    if (!scores.every(x => Number.isFinite(x) && x >= 0 && x <= 1)) throw Error(`Arm ${name} scores must be finite in [0, 1]`);
  }
  return numericPairGate({ arms, games, primary, comparators, minCorrect: 0, minMargin: 0, resamples: 10000, seed, lowerQuantile: 0.025 });
}
