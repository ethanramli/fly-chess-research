// Memory v4 R5 regression (2026-11-04): the pinned rmsScaler divides by (RMS + 1e-6), so a practice-zero
// feature with a nonzero test value is amplified, not zeroed. Proposal section 4.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { sparse } from '../../src/neural-learning/engineered-memory-task-v4.mjs';

test('training-zero feature with a test value of 1 scales to 1 / 1e-6', () => {
  const scale = rmsScaler([Float64Array.from([0, 2]), Float64Array.from([0, 2])]);
  const out = scale(Float64Array.from([1, 2]));
  assert.equal(out[0], 1 / 1e-6);
  assert.equal(out[1], 2 / (2 + 1e-6));
});

test('sparse then scale replays bit for bit from Float32 inputs', () => {
  const kc = Float32Array.from([0.3, 0.7, 0.1, 0.9]), blank = Float32Array.from([0.1, 0.1, 0.2, 0.1]);
  const scale = rmsScaler([sparse(kc, blank, 2), sparse(Float32Array.from([0.5, 0.2, 0.4, 0.8]), blank, 2)]);
  const a = scale(sparse(kc, blank, 2)), b = scale(sparse(Float32Array.from(kc), Float32Array.from(blank), 2));
  assert.ok(a.every((x, i) => Object.is(x, b[i])));
});
