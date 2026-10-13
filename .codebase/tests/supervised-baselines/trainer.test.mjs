import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { validateGraph } from '../../src/runtime/graph.mjs';

function model() {
  const g = validateGraph({ row: new Int32Array([0, 1, 3, 5]), col: new Int32Array([2, 0, 2, 0, 1]),
    sign: new Int8Array([-1, 1, -1, 1, 1]), initial: new Float32Array([1, 2, 1, 2, 1]),
    input: new Int32Array([0, 1]), output: new Int32Array([2]) });
  const m = new SparseTrainer(g, { steps: 4, inputDim: 2, outputs: 2, precision: 'float64' });
  m.params.bias.fill(0.3); m.params.input.fill(0.2);
  return m;
}
test('every parameter derivative agrees with independent central differences', () => {
  const m = model(), x = [0.4, 0.8], target = [0.1, -0.2];
  m.forward(x); m.backward(target);
  for (const [key, p] of Object.entries(m.params)) for (let i = 0; i < p.length; i++) {
    const original = p[i], eps = 1e-5;
    if (key === 'magnitude') m.setMagnitude(i, original + eps); else p[i] = original + eps;
    m.forward(x); const plus = m.loss(target);
    if (key === 'magnitude') m.setMagnitude(i, original - eps); else p[i] = original - eps;
    m.forward(x); const minus = m.loss(target);
    if (key === 'magnitude') m.setMagnitude(i, original); else p[i] = original;
    const numeric = (plus - minus) / (2 * eps);
    assert.ok(Math.abs(numeric - m.grads[key][i]) < 1e-7, `${key}[${i}]: ${numeric} vs ${m.grads[key][i]}`);
  }
});
test('sequential accumulation equals the average objective derivative', () => {
  const m = model(), data = [[[0.3, 0.8], [0.2, -0.1]], [[0.9, 0.1], [-0.1, 0.4]]];
  for (const [x, y] of data) { m.forward(x); m.backward(y); }
  const p = m.params.magnitude, original = p[1], eps = 1e-5;
  const loss = () => data.reduce((s, [x, y]) => { m.forward(x); return s + m.loss(y) / 2; }, 0);
  m.setMagnitude(1, original + eps); const plus = loss();
  m.setMagnitude(1, original - eps); const minus = loss(); m.setMagnitude(1, original);
  assert.ok(Math.abs((plus - minus) / (2 * eps) - m.grads.magnitude[1] / 2) < 1e-7);
});
test('updates learn inside the graph, keep its signs and reduce training loss', () => {
  const m = model(), x = [0.5, 0.2], y = [0.8, 0.1], before = [...m.params.magnitude];
  m.forward(x); const initial = m.loss(y);
  for (let i = 0; i < 50; i++) { m.forward(x); m.backward(y); m.step({ learningRate: 0.1 }); }
  m.forward(x);
  assert.ok(m.loss(y) < initial * 0.1);
  assert.ok(m.params.magnitude.some((v, i) => v !== before[i]));
  assert.ok(m.params.magnitude.every(v => v > 0));
  assert.deepEqual([...m.graph.sign], [-1, 1, -1, 1, 1]);
  assert.deepEqual(m.signedMagnitude, Float64Array.from(m.graph.sign, (s, i) => s * m.params.magnitude[i]));
});
test('memory is reused across updates and invalid numerical inputs fail', () => {
  const m = model(), bytes = m.allocatedBytes();
  assert.throws(() => m.forward([NaN, 1]));
  for (let i = 0; i < 10; i++) { m.forward([1, 0]); m.backward([0, 0]); m.step(); }
  assert.equal(m.allocatedBytes(), bytes);
  assert.throws(() => m.step());
});
test('frozen core control does not accidentally update core parameters', () => {
  const m = model(), before = m.params.magnitude.slice();
  m.forward([0.1, 0.4]); m.backward([0.5, 0.5]);
  const stats = m.step({ freezeCore: true });
  assert.equal(stats.changedEdges, 0); assert.deepEqual(m.params.magnitude, before);
});
