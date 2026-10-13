import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { adamStep } from '../../src/supervised-baselines/adam.mjs';
import { saveCheckpoint, loadCheckpoint } from '../../src/runtime/storage.mjs';

test('disk checkpoints restore recurrent inference and the next SGD/Adam update in both precisions', t => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-checkpoint-sync-'));
  t.diagnostic(`Preserved synthetic checkpoints: ${dir}`);
  for (const precision of ['float32', 'float64']) for (const optimizer of ['sgd', 'adam']) {
    const graph = { row: Int32Array.of(0, 2, 2, 4), col: Int32Array.of(0, 2, 0, 2),
      sign: Int8Array.of(1, -1, 1, -1), initial: Float32Array.of(2, 1, 1, 2),
      input: Int32Array.of(0), output: Int32Array.of(0, 2) };
    const wiring = structuredClone(graph);
    const config = { steps: 8, inputDim: 3, outputs: 2, seed: 53, precision };
    const donor = new SparseTrainer(graph, config), restored = new SparseTrainer(graph, config);
    const update = model => optimizer === 'adam' ? adamStep(model) : model.step();
    const x = [1, 0, 0], target = [.2, -.1];
    donor.forward(x); donor.backward(target); update(donor);
    for (let i = 0; i < graph.col.length; i++) donor.setMagnitude(i, .05 + .03 * i);
    const checkpoint = join(dir, `${precision}-${optimizer}`), state = { updates: 1 };
    saveCheckpoint(donor, checkpoint, state);
    // Exercise loading into a used model as well as a fresh WASM scratch cache.
    restored.forward(x); restored.backward(target);
    assert.deepEqual(loadCheckpoint(restored, checkpoint), state);
    assert.deepEqual(restored.params, donor.params);
    assert.deepEqual(restored.signedMagnitude, donor.signedMagnitude, `${precision}/${optimizer}: restored recurrent weights`);
    assert.equal(restored.count, 0);
    assert.ok(Object.values(restored.grads).every(a => a.every(v => v === 0)));
    assert.deepEqual(restored.adam, donor.adam);
    assert.deepEqual(restored.forward(x), donor.forward(x));
    assert.deepEqual(restored.h, donor.h); assert.deepEqual(restored.activity, donor.activity);
    restored.backward(target); donor.backward(target);
    assert.deepEqual(restored.grads, donor.grads);
    assert.deepEqual(update(restored), update(donor));
    assert.deepEqual(restored.params, donor.params);
    assert.deepEqual(restored.signedMagnitude, donor.signedMagnitude);
    assert.deepEqual(restored.adam, donor.adam);
    assert.deepEqual(restored.forward(x), donor.forward(x));
    assert.deepEqual(graph, wiring);
  }
});
