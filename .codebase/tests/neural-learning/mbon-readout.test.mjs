import test from 'node:test';
import assert from 'node:assert/strict';
import { readMBON, chooseMBON } from '../../src/neural-learning/mbon-readout.mjs';
test('fixed population means preserve coefficient and polarity under unequal populations', () => {
  const A = readMBON({ MBON12: [1, 3, 5, 7], MBON01: [1, 3] });
  const B = readMBON({ MBON12: [1, 1], MBON01: [2] });
  assert.equal(A.score, 2); assert.equal(B.score, -1);
  assert.deepEqual(chooseMBON(A, B), { choice: 'A', M: 3 });
  assert.deepEqual(chooseMBON(B, A), { choice: 'B', M: -3 });
  assert.deepEqual(chooseMBON(A, A), { choice: 'A', M: 0 });
});
test('invalid population or score cannot silently become a tied choice', () => {
  for (const bad of [[], [NaN], [Infinity], Array(129).fill(0)]) assert.throws(() => readMBON({ MBON12: bad, MBON01: [0] }));
  assert.throws(() => readMBON({ MBON12: [0] }));
  assert.throws(() => chooseMBON({ score: NaN }, { score: 0 }));
});
