import test from 'node:test';
import assert from 'node:assert/strict';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {captureTrajectory, compareTrajectory} from '../../scripts/evaluation-and-performance/trajectory-reuse-observer.mjs';

test('causal reuse checks full row arguments and every claimed clean output', () => {
  for (const precision of ['float32', 'float64']) {
    const graph = {row: Int32Array.of(0, 0, 1, 2), col: Int32Array.of(0, 1),
      initial: Float32Array.of(1, 1), sign: Int8Array.of(1, -1),
      input: Int32Array.of(0), output: Int32Array.of(2)};
    const model = new SparseTrainer(graph, {steps: 3, inputDim: 1, outputs: 1, precision});
    const edges = [0], posts = [1];
    model.forward([0]); const reference = captureTrajectory(model, edges);
    assert(compareTrajectory(model, reference, edges, posts).every(r => r.dirtyRows === 0));
    model.forward([0], [{index: 0, current: 1}]);
    const changed = compareTrajectory(model, reference, edges, posts);
    assert.equal(changed[0].dirtyRows, 1);
    assert(changed[2].dirtyRows > changed[0].dirtyRows);
    model.setMagnitude(0, model.params.magnitude[0] * 1.1); model.forward([0]);
    assert(compareTrajectory(model, reference, edges, posts)[0].dirtyRows >= 1);
    model.forward([0]); const second = captureTrajectory(model, edges);
    model.activity[0][2] += 1;
    assert.throws(() => compareTrajectory(model, second, edges, posts), /Unexpected clean activity/);
  }
});
