import test from 'node:test';
import assert from 'node:assert/strict';
import {SparseTrainer as Original} from '../../src/supervised-baselines/trainer.mjs';
import {SparseTrainer as Candidate} from '../../src/supervised-baselines/trainer-reuse-candidate.mjs';
import {FrameReuseCache} from '../../src/runtime/frame-reuse-cache.mjs';

const graph = () => ({row: Int32Array.of(0, 2, 3, 4, 4), col: Int32Array.of(0, 3, 0, 1),
  initial: Float32Array.of(2, 1, 1, 1), sign: Int8Array.of(1, -1, 1, -1),
  input: Int32Array.of(0, 3), output: Int32Array.of(1, 2)});
function same(a, b) {
  for (const key of ['h', 'activity']) assert.deepEqual(a[key], b[key], key);
  for (const key of ['drive', 'alpha', 'prediction', 'signedMagnitude']) assert.deepEqual(a[key], b[key], key);
}

test('exact frame reuse preserves every trajectory, derivative and update in both precisions', () => {
  for (const precision of ['float32', 'float64']) for (const steps of [1, 8, 40]) {
    const config = {precision, steps, inputDim: 2, outputs: 2, seed: 47};
    const a = new Original(graph(), config), b = new Candidate(graph(), config);
    let clean = 0;
    const accumulate = b.sparseAccumulator.accumulate.bind(b.sparseAccumulator);
    b.sparseAccumulator.accumulate = (previous, mask) => {
      if (mask) clean += mask.reduce((n, value) => n + Number(value === 0), 0);
      return accumulate(previous, mask);
    };
    for (let iteration = 0; iteration < 12; iteration++) {
      b.reuseSlot = iteration % 3;
      const input = iteration < 6 ? [0, 0] : [.3, -.1];
      const stimulation = iteration % 4 === 3 ? [{index: 3, current: .15}] : [];
      const initial = iteration === 9 ? Float32Array.of(.1, 0, .2, -0) : null;
      a.forward(input, stimulation, initial); b.forward(input, stimulation, initial); same(a, b);
      a.backward([.1, -.2]); b.backward([.1, -.2]); assert.deepEqual(a.grads, b.grads);
    }
    assert(clean > 0, 'The masked path must actually skip some rows');
    assert.deepEqual(a.step(), b.step()); assert.deepEqual(a.params, b.params);
    a.forward([1, 0]); b.forward([1, 0]); same(a, b);
    assert(b.allocatedBytes() >= a.allocatedBytes() + b.frameReuseCache.allocatedBytes);
  }
});

test('reuse invalidates on raw topology, parameter, precision and restored-value changes', () => {
  const config = {steps: 3, inputDim: 2, outputs: 2};
  const a = new Original(graph(), config), b = new Candidate(graph(), config); b.reuseSlot = 0;
  const run = () => {a.forward([0, .2]); b.forward([0, .2]); same(a, b);};
  run(); run();
  for (const mutate of [
    m => m.setMagnitude(0, .17),
    m => {m.params.magnitude[1] = .31; m.refreshSignedMagnitude();},
    m => {m.signedMagnitude[2] *= .93;},
    m => {m.params.bias[2] += .7;},
    m => {m.params.leak[0] += .4;},
    m => {m.params.input[1] += .5;},
    m => {m.params.headBias[0] += .05;},
    m => {m.saturation = 7;},
    m => {m.graph.col[0] = 2;},
    m => {m.graph.row[1] = 1;},
    m => {m.h = m.h.map(v => Float64Array.from(v)); m.activity = m.activity.map(v => Float64Array.from(v));},
    m => {m.params.magnitude.fill(.25); m.refreshSignedMagnitude();},
  ]) {mutate(a); mutate(b); run(); run();}
  b.frameReuseCache.clear(); run();
  a.graph.col[0] = -1; b.graph.col[0] = -1;
  assert.throws(() => a.forward([0, .2])); assert.throws(() => b.forward([0, .2]));
});

test('bounded or disabled cache falls back to the complete original computation', () => {
  const config = {steps: 8, inputDim: 2, outputs: 2};
  const a = new Original(graph(), config), b = new Candidate(graph(), config);
  b.frameReuseCache = new FrameReuseCache(1);
  for (const slot of [0, 0, 31, null, 32]) {
    b.reuseSlot = slot; a.forward([1, 0]); b.forward([1, 0]); same(a, b);
    assert.equal(b.frameReuseCache.allocatedBytes, 0);
  }
});
