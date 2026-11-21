// Remaining stage 0 checks for the replay diary (design section 7.1, checks 1, 2, 3 and the known-answer draws of 4.8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ReplayDiary, Stream, hashStimulus, forbiddenOverlap } from '../../src/neural-learning/replay-diary-v1.mjs';
import { createEyesV2 } from '../../src/chess-input/eyes-v2.mjs';

const lesson = (i, kind = 'reward') => ({ stimulus: [[i, 1]], teaching: { kind, current: 0.75 }, lessonIndex: i, receiptHash: `r${i}` });

// Known-answer check: the first eight normals of the "features" stream, from the independent Python reference.
const reference = JSON.parse(readFileSync(new URL('./replay-diary-reference-normals.json', import.meta.url), 'utf8'));
test('normal draws match the independent reference within 1e-12 for every registered seed', () => {
  for (const [seed, expected] of Object.entries(reference)) {
    const s = new Stream(seed, 'features');
    for (let i = 0; i < expected.length; i++) {
      assert.ok(Math.abs(s.normal() - expected[i]) <= 1e-12, `seed ${seed} draw ${i}`);
    }
  }
});

// Receipt rebuild (check 1): a diary rebuilt from its receipts equals the saved diary byte for byte.
test('a diary rebuilt from its receipts equals the live diary byte for byte', () => {
  const receipts = Array.from({ length: 300 }, (_, i) => lesson(i + 1, i % 3 ? 'reward' : 'punish'));
  const live = new ReplayDiary({ capacity: 12, runSeed: 9 });
  for (const r of receipts) live.admit(r);
  const rebuilt = new ReplayDiary({ capacity: 12, runSeed: 9 });
  for (const r of receipts) rebuilt.admit(structuredClone(r));
  assert.equal(rebuilt.state(), live.state());
});

test('a receipt carrying an extra field (for example a certificate) is rejected and changes nothing', () => {
  const d = new ReplayDiary({ capacity: 4, runSeed: 1 });
  d.admit(lesson(1));
  const before = d.state();
  assert.throws(() => d.admit({ ...lesson(2), certificate: 'mate in one' }), /may not read: certificate/);
  assert.equal(d.state(), before);
});

test('forbidden hashes (validation or test inputs) are reported if they appear in the diary', () => {
  const d = new ReplayDiary({ capacity: 4, runSeed: 1 });
  d.admit(lesson(1));
  d.admit(lesson(2));
  assert.deepEqual(forbiddenOverlap(d, new Set([hashStimulus([[99, 1]])])), []);
  const leaked = hashStimulus([[1, 1]]);
  assert.deepEqual(forbiddenOverlap(d, new Set([leaked])), [leaked]);
});

// Invisible details (check 3): the eyes show only the board picture, so move counters cannot change the input.
const retina = (() => {
  const retina_idx = new Int32Array(256), retina_square = new Int8Array(256), retina_uv = new Float32Array(512);
  for (let k = 0; k < 256; k++) {
    retina_idx[k] = 1000 + k;
    retina_square[k] = k >> 2;
    retina_uv[2 * k] = (k & 1) ? 0.75 : 0.25;
    retina_uv[2 * k + 1] = (k & 2) ? 0.75 : 0.25;
  }
  return { retina_idx, retina_square, retina_uv };
})();
test('two boards differing only in move counters give the same stimulus, hash and diary state', () => {
  const eyes = createEyesV2(retina);
  const a = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const b = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 7 19';
  const sa = eyes.encode(a, 'e2e4').stimulation;
  const sb = eyes.encode(b, 'e2e4').stimulation;
  assert.deepEqual(sb, sa);
  assert.equal(hashStimulus(sb), hashStimulus(sa));
  const da = new ReplayDiary({ capacity: 4, runSeed: 2 });
  const db = new ReplayDiary({ capacity: 4, runSeed: 2 });
  da.admit({ stimulus: sa, teaching: { kind: 'reward', current: 0.75 }, lessonIndex: 1, receiptHash: 'x' });
  db.admit({ stimulus: sb, teaching: { kind: 'reward', current: 0.75 }, lessonIndex: 1, receiptHash: 'x' });
  assert.equal(da.state(), db.state());
});
