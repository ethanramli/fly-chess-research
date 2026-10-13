import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { CircuitTrainer } from '../../src/runtime/circuit.mjs';
import { PairedTrainer, pairedObjective } from '../../src/supervised-baselines/paired.mjs';
import { validateGraph } from '../../src/runtime/graph.mjs';

function model() {
  // Includes 0 -> 1 -> 2 -> 3 -> 0 and extra return paths.
  const graph = validateGraph({ row: Int32Array.from([0, 1, 3, 5, 7]), col: Int32Array.from([3, 0, 2, 1, 3, 0, 2]),
    sign: Int8Array.from([1, 1, -1, 1, 1, 1, -1]), initial: Float32Array.from([1, 2, 1, 1, 2, 1, 1]),
    input: Int32Array.from([0, 1]), output: Int32Array.from([2, 3]) });
  const m = new SparseTrainer(graph, { steps: 6, inputDim: 2, outputs: 2, precision: 'float64' });
  m.params.bias.fill(0.3); m.params.input.fill(0.2);
  return m;
}

function mappings(c) {
  const maps = { magnitude: [...c.edges], bias: [...c.nodes], leak: [...c.nodes], inputBias: [...c.inputs], input: [] };
  for (const i of c.inputs) for (let f = 0; f < c.model.inputDim; f++) maps.input.push(i * c.model.inputDim + f);
  return maps;
}

test('boundary adjoints recover exact anchor gradients including paths leaving and re-entering a block', () => {
  for (const nodes of [[0], [0, 1], [1, 3], [0, 1, 2, 3]]) {
    const m = model(), c = new CircuitTrainer(m, nodes);
    c.anchor([0.4, 0.8], [0.2, -0.3]);
    assert.ok(Math.abs(c.forward().loss - c.anchorLoss) < 1e-12);
    c.backward();
    for (const [key, indices] of Object.entries(mappings(c))) for (let k = 0; k < indices.length; k++) {
      assert.ok(Math.abs(c.grads[key][k] - m.grads[key][indices[k]]) < 1e-11, `${nodes}: ${key}[${k}]`);
    }
  }
});

test('local derivative matches finite differences of the surrogate away from anchor', () => {
  const m = model(), c = new CircuitTrainer(m, [0, 3]);
  c.anchor([0.2, 0.7], [0.7, -0.2]); c.forward(); c.backward(); c.step(0.03);
  c.forward(); c.backward();
  for (const [key, indices] of Object.entries(mappings(c))) for (let k = 0; k < indices.length; k++) {
    const idx = indices[k], original = m.params[key][idx], eps = 1e-5;
    if (key === 'magnitude') m.setMagnitude(idx, original + eps); else m.params[key][idx] = original + eps;
    const plus = c.forward().loss;
    if (key === 'magnitude') m.setMagnitude(idx, original - eps); else m.params[key][idx] = original - eps;
    const minus = c.forward().loss;
    if (key === 'magnitude') m.setMagnitude(idx, original); else m.params[key][idx] = original;
    assert.ok(Math.abs((plus - minus) / (2 * eps) - c.grads[key][k]) < 1e-7, `${key}[${k}]`);
  }
});

test('dropping boundary error signals fails to recover the true upstream gradient', () => {
  const m = model(), c = new CircuitTrainer(m, [0]);
  c.anchor([0.3, 0.7], [0.5, -0.1]);
  const trueBias = m.grads.bias[0];
  assert.ok(Math.abs(trueBias) > 1e-6);
  for (const f of c.force) f.fill(0);
  c.forward(); c.backward();
  assert.equal(c.grads.bias[0], 0);
});

test('failed full-model verification restores every block parameter and invalidates cache', () => {
  const m = model(), c = new CircuitTrainer(m, [0, 3]);
  c.anchor([0.2, 0.7], [0.3, -0.1]);
  const original = Object.fromEntries(Object.entries(m.params).map(([k, v]) => [k, v.slice()]));
  m.params.input[0] = NaN;
  const result = c.verify();
  assert.equal(result.accepted, false); assert.equal(result.rolledBack, true);
  for (const [key, p] of Object.entries(m.params)) assert.deepEqual(p, original[key]);
  assert.deepEqual(m.signedMagnitude, Float64Array.from(m.graph.sign, (s, i) => s * m.params.magnitude[i]));
  assert.throws(() => c.forward()); assert.throws(() => c.step());
});

test('paired loss accumulation agrees with numerical derivatives of both examples', () => {
  const m = model(), paired = new PairedTrainer(m), xa = [0.4, 0.8], xb = [0.9, 0.1], ya = [0.3, -0.1], yb = [-0.2, 0.6];
  paired.train(xa, xb, ya, yb, 0.7);
  const loss = () => { const a = Array.from(m.forward(xa)), b = Array.from(m.forward(xb)); return pairedObjective(a, b, ya, yb, 0.7).loss; };
  for (const [key, p] of Object.entries(m.params)) for (let k = 0; k < p.length; k++) {
    const original = p[k], eps = 1e-5;
    if (key === 'magnitude') m.setMagnitude(k, original + eps); else p[k] = original + eps;
    const plus = loss();
    if (key === 'magnitude') m.setMagnitude(k, original - eps); else p[k] = original - eps;
    const minus = loss();
    if (key === 'magnitude') m.setMagnitude(k, original); else p[k] = original;
    assert.ok(Math.abs((plus - minus) / (2 * eps) - m.grads[key][k] / 2) < 1e-7, `${key}[${k}]`);
  }
});
