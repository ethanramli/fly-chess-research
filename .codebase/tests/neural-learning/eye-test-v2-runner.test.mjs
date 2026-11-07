import test from 'node:test';
import assert from 'node:assert/strict';
import { fitLogistic, standardize, runEyeTestV2 } from '../../src/neural-learning/eye-test-v2-runner.mjs';

const dot = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0);

test('fitLogistic classifies 20 separable points and shrinks to near zero at tiny C', () => {
  const X = [], y = [];
  for (let i = 0; i < 20; i++) {
    const s = i < 10 ? 1 : -1;
    X.push(Float64Array.of(2 * s + 0.1 * (i % 3), 0.05 * (i % 5), -0.03 * i));
    y.push(s);
  }
  const { weights, b } = fitLogistic(X, y);
  X.forEach((x, i) => assert.equal(Math.sign(dot(weights, x) + b), y[i]));
  const tiny = fitLogistic(X, y, { C: 1e-6 });
  for (const w of tiny.weights) assert.ok(Math.abs(w) < 1e-3, `weight ${w} not near zero`);
});

test('standardize uses training statistics only and maps SD-0 features to 0', () => {
  const train = [Float64Array.of(0, 5), Float64Array.of(2, 5)];
  const [a] = standardize(train, [Float64Array.of(3, 9)]);
  assert.equal(a[0], 2); // (3 - mean 1) / SD 1
  assert.equal(a[1], 0); // constant training feature
});

// Fake model: KC i = sum of currents with index % 12 === i; reader cells 12-16 sum magnitude x KC over incoming edges.
function fakeModel({ stuck = false } = {}) {
  const nodes = 17, steps = 2, kcCount = 12, readers = 5;
  const row = Int32Array.from({ length: nodes + 1 }, (_, j) => Math.max(0, j - 12) * kcCount);
  const edges = readers * kcCount;
  const col = Int32Array.from({ length: edges }, (_, e) => e % kcCount);
  const sign = Int8Array.from({ length: edges }, () => 1);
  const magnitude = Float32Array.from({ length: edges }, () => 1);
  const h = Array.from({ length: steps + 1 }, () => new Float64Array(nodes));
  return {
    steps, h, graph: { row, col, sign }, params: { magnitude },
    setMagnitude(e, v) { if (stuck && v === 1) return; magnitude[e] = v; }, // stuck: restores to 1 are lost
    forward(_x, stimulation) {
      const kc = new Float64Array(kcCount);
      for (const { index, current } of stimulation) kc[index % kcCount] += current;
      const out = h[steps];
      out.fill(0);
      for (let i = 0; i < kcCount; i++) out[i] = kc[i];
      for (let j = 12; j < nodes; j++) for (let e = row[j]; e < row[j + 1]; e++) out[j] += magnitude[e] * kc[col[e]];
    },
  };
}

const readerCells = ['MBON05', 'MBON27', 'MBON09', 'MBON07', 'MBON06'].map((type, i) => ({ type, index: 12 + i }));
const kcIndices = Array.from({ length: 12 }, (_, i) => i);
const photoreceptorIndices = kcIndices;
// Answer 'good' drives KC 0, 'bad' drives KC 1; a per-pair current on KC 2-11 keeps every input unique.
const stimulationFor = fen => {
  const [, p, side] = fen.split(':');
  return [{ index: side === 'good' ? 0 : 1, current: 1 }, { index: 2 + (Number(p) % 10), current: 0.5 + Number(p) / 100 }];
};
const pairs = Array.from({ length: 48 }, (_, p) => ({
  gameId: `g${p}`, move: 'e2e4', good: { fen: `pair:${p}:good` }, bad: { fen: `pair:${p}:bad` },
}));
const eyes = { encode: fen => ({ stimulation: stimulationFor(fen) }) };
const tokens = { encode: fen => stimulationFor(fen).map(x => ({ ...x, current: 2 * x.current })) };

test('runEyeTestV2 on a fake model: 576 passes, memory unchanged, 48 per-pair rows', async () => {
  const model = fakeModel();
  const logged = [];
  const started = performance.now();
  const result = await runEyeTestV2({ model, kcIndices, readerCells, eyes, tokens, photoreceptorIndices, pairs, log: r => logged.push(r) });
  console.log(`runEyeTestV2 fake run: ${(performance.now() - started).toFixed(0)} ms`);
  assert.equal(result.passes, 576);
  assert.equal(result.magnitudesUnchanged, true);
  assert.equal(result.counts.tokens, 48);
  assert.ok(['yes', 'no', 'grey', 'shortcut', 'pipeline-fault'].includes(result.outcome));
  assert.equal(result.perPair.length, 48);
  assert.equal(logged.length, 48);
});

test('runEyeTestV2 throws Memory changed when a gain change is not restored', async () => {
  await assert.rejects(
    runEyeTestV2({ model: fakeModel({ stuck: true }), kcIndices, readerCells, eyes, tokens, photoreceptorIndices, pairs }),
    /Memory changed/,
  );
});
