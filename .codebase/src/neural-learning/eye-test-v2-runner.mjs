// Eye test v2 (restart plan revision 2026-11-03, problem 5): read-only. Measures whether the brain's response to Eyes v2 input carries the safe-or-unsafe answer, and the strength measure M under reachable gains. Memory never changes; every gain change is undone and checked.
import { createHash } from 'node:crypto';
import { inputCollisions } from '../chess-input/eyes-v2.mjs';
import { OUTPUT_TYPES, gainSettings, pairStrength, strengthM, strengthGate } from './eye-test-v2.mjs';

const SD_FLOOR = 1e-12; // floating-point noise on a constant feature counts as SD 0.
const dot = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };

// L2 logistic regression in dual form. Step: alpha <- alpha - eta (alpha + C g), as specified in problem 5.
export function fitLogistic(X, y, { C = 1, iterations = 3000 } = {}) {
  const n = X.length, d = X[0].length;
  const K = X.map(a => Float64Array.from(X, b => dot(a, b)));
  let v = new Float64Array(n).fill(1), lambda = 0;
  for (let it = 0; it < 100; it++) {
    const w = Float64Array.from(K, row => dot(row, v));
    const norm = Math.sqrt(dot(w, w));
    if (norm === 0) break;
    lambda = norm;
    v = w.map(x => x / norm);
  }
  lambda = Math.max(lambda, 1e-12);
  const eta = 1 / (1 + 0.25 * C * (lambda + n));
  const alpha = new Float64Array(n), f = new Float64Array(n), g = new Float64Array(n);
  let b = 0;
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) f[i] = dot(K[i], alpha) + b;
    let gSum = 0;
    for (let i = 0; i < n; i++) { g[i] = -y[i] / (1 + Math.exp(y[i] * f[i])); gSum += g[i]; }
    for (let j = 0; j < n; j++) alpha[j] -= eta * (alpha[j] + C * g[j]);
    b -= eta * C * gSum;
  }
  const weights = new Float64Array(d);
  for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) weights[k] += alpha[i] * X[i][k];
  return { alpha, b, weights };
}

// Mean and population SD from trainRows only; constant features map to 0.
export function standardize(trainRows, rows) {
  const d = trainRows[0].length, n = trainRows.length;
  const mean = new Float64Array(d), sd = new Float64Array(d);
  for (const r of trainRows) for (let k = 0; k < d; k++) mean[k] += r[k] / n;
  for (const r of trainRows) for (let k = 0; k < d; k++) sd[k] += (r[k] - mean[k]) ** 2 / n;
  for (let k = 0; k < d; k++) sd[k] = Math.sqrt(sd[k]);
  return rows.map(r => Float64Array.from(r, (x, k) => (sd[k] > SD_FLOOR ? (x - mean[k]) / sd[k] : 0)));
}

// Leave-one-game-out: each pair's good (+1) and bad (-1) boards are held out together with its game.
export function leaveOneGameOut(features, pairs) {
  const folds = pairs.map((pair, p) => {
    const train = [], y = [];
    pairs.forEach((q, i) => {
      if (q.gameId !== pair.gameId) { train.push(features[i].good, features[i].bad); y.push(1, -1); }
    });
    const { weights, b } = fitLogistic(standardize(train, train), y);
    const [good, bad] = standardize(train, [features[p].good, features[p].bad]);
    const score = x => dot(weights, x) + b;
    return { weights, correct: score(good) > score(bad) };
  });
  return { correct: folds.filter(f => f.correct).length, folds };
}

export async function runEyeTestV2({ model, kcIndices, readerCells, eyes, tokens, photoreceptorIndices, pairs, expectedPairs = 48, guard = () => {}, log = () => {} }) {
  if (pairs.length !== expectedPairs) throw Error('Wrong pair count');
  if (new Set(pairs.map(p => p.gameId)).size !== pairs.length) throw Error('Game ids not distinct');
  const items = pairs.flatMap(p => [
    { fen: p.good.fen, action: p.move, answer: 'good' },
    { fen: p.bad.fen, action: p.move, answer: 'bad' },
  ]);
  if (inputCollisions(eyes, items).length) throw Error('Input collision');

  const magnitudes = () => {
    const m = model.params.magnitude;
    return createHash('sha256').update(Buffer.from(m.buffer, m.byteOffset, m.byteLength)).digest('hex');
  };
  const before = magnitudes();
  const limit = 12 * expectedPairs; // 4 per pair for the two comparisons, 8 per pair for strength.
  let passes = 0;
  const readerByType = new Map(OUTPUT_TYPES.map(t => [t, readerCells.filter(c => c.type === t).map(c => c.index)]));

  const pass = stimulation => {
    guard();
    if (passes + 1 > limit) throw Error('Pass budget exceeded');
    model.forward([0], stimulation);
    passes++;
    const h = model.h[model.steps];
    const types = {};
    for (const t of OUTPUT_TYPES) {
      const ids = readerByType.get(t);
      types[t] = ids.reduce((sum, i) => sum + h[i], 0) / ids.length;
    }
    return { kc: Float64Array.from(kcIndices, i => h[i]), types };
  };
  const rawOf = stimulation => {
    const m = new Map(stimulation.map(x => [x.index, x.current]));
    return Float64Array.from(photoreceptorIndices, i => m.get(i) ?? 0);
  };

  const rows = pairs.map(p => {
    const eg = eyes.encode(p.good.fen, p.move).stimulation, eb = eyes.encode(p.bad.fen, p.move).stimulation;
    const tg = tokens.encode(p.good.fen, p.move), tb = tokens.encode(p.bad.fen, p.move);
    return { eg, eb, tg, tb, graph: { good: pass(eg), bad: pass(eb) }, token: { good: pass(tg), bad: pass(tb) } };
  });
  const graphCv = leaveOneGameOut(rows.map(r => ({ good: r.graph.good.kc, bad: r.graph.bad.kc })), pairs);
  const tokenCv = leaveOneGameOut(rows.map(r => ({ good: r.token.good.kc, bad: r.token.bad.kc })), pairs);
  const rawCv = leaveOneGameOut(rows.map(r => ({ good: rawOf(r.eg), bad: rawOf(r.eb) })), pairs);

  // Plastic edges: KC-to-reader connections with sign +1. Gains are applied to these only, in a diagnostic copy.
  const kcPos = new Map(kcIndices.map((i, k) => [i, k]));
  const { row, col, sign } = model.graph;
  const plastic = [];
  for (const { index: j } of readerCells) {
    for (let e = row[j]; e < row[j + 1]; e++) if (sign[e] === 1 && kcPos.has(col[e])) plastic.push({ e, k: kcPos.get(col[e]) });
  }
  const base = plastic.map(({ e }) => model.params.magnitude[e]);

  const strengthOf = (side, folds) => pairs.map((pair, p) => {
    const { plus, minus } = gainSettings(folds[p].weights);
    const activity = {};
    for (const [name, S] of [['Plus', plus], ['Minus', minus]]) {
      try {
        plastic.forEach(({ e, k }, idx) => model.setMagnitude(e, base[idx] * S[k]));
        activity[`safe${name}`] = pass(side[p].good).types;
        activity[`unsafe${name}`] = pass(side[p].bad).types;
      } finally {
        plastic.forEach(({ e }, idx) => model.setMagnitude(e, base[idx]));
      }
      if (magnitudes() !== before) throw Error('Memory changed');
    }
    return { activity, strength: pairStrength(activity) };
  });
  const graphStr = strengthOf(rows.map(r => ({ good: r.eg, bad: r.eb })), graphCv.folds);
  const tokenStr = strengthOf(rows.map(r => ({ good: r.tg, bad: r.tb })), tokenCv.folds);

  const M = {
    graph: strengthM(graphStr.map((s, p) => ({ game: pairs[p].gameId, activity: s.activity }))),
    tokens: strengthM(tokenStr.map((s, p) => ({ game: pairs[p].gameId, activity: s.activity }))),
  };
  const counts = { graph: graphCv.correct, raw: rawCv.correct, tokens: tokenCv.correct };
  const gate = strengthGate(M.graph, M.tokens);
  const n = expectedPairs;
  const atLeast = x => Math.ceil(x * n / 48), atMost = x => Math.floor(x * n / 48);
  let outcome;
  if (counts.tokens < atLeast(44)) outcome = 'pipeline-fault';
  else if (counts.raw >= atLeast(36)) outcome = 'shortcut';
  else if (counts.graph >= atLeast(36) && counts.graph >= counts.raw + 6 && gate.pass) outcome = 'yes';
  else if (counts.graph <= atMost(30)) outcome = 'no';
  else outcome = 'grey';

  const perPair = pairs.map((p, i) => ({
    gameId: p.gameId,
    graphCorrect: graphCv.folds[i].correct,
    rawCorrect: rawCv.folds[i].correct,
    tokensCorrect: tokenCv.folds[i].correct,
    strengthGraph: graphStr[i].strength,
    strengthTokens: tokenStr[i].strength,
  }));
  for (const record of perPair) log(record);

  return {
    schema: 'eye-test-v2-result-v1', counts, M, gate, outcome,
    shuffledWiringNeeded: outcome === 'yes', passes, magnitudesUnchanged: true, perPair,
  };
}
