// Synthetic three-node check of signed-weight construction; no neural propagation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { SparseTrainer } from '../../../.codebase/src/supervised-baselines/trainer.mjs';
const graph = { row: Int32Array.of(0, 0, 0, 2), col: Int32Array.of(0, 1),
  initial: Float32Array.of(10, 10), sign: Int8Array.of(1, -1), input: Int32Array.of(0), output: Int32Array.of(2) };
const model = new SparseTrainer(graph, { steps: 1, inputDim: 1, outputs: 1 });
assert(model.signedMagnitude[0] > 0 && model.signedMagnitude[1] < 0);
model.setMagnitude(0, 0.25); model.setMagnitude(1, 0.25);
assert.deepEqual([...model.signedMagnitude], [0.25, -0.25]);
model.refreshSignedMagnitude();
assert.deepEqual([...model.signedMagnitude], [0.25, -0.25]);
const sourceSha256 = createHash('sha256').update(readFileSync(new URL('../../../.codebase/src/supervised-baselines/trainer.mjs', import.meta.url))).digest('hex');
writeFileSync(new URL('./runtime-result.json', import.meta.url), JSON.stringify({ status: 'pass',
  scope: 'Three-node synthetic constructor/magnitude-refresh check; no forward call or actual graph model',
  sourceSha256, command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)] }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'pass', signedMagnitude: [...model.signedMagnitude], propagation: false }));
