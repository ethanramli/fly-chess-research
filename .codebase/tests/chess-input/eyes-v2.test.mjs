import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';
import { createEyesV2, inputCollisions } from '../../src/chess-input/eyes-v2.mjs';

// Synthetic retina: 64 squares, each with a 2x2 lattice of 4 photoreceptors (k = 4 * seat + j), index 1000 + k.
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
const v1 = createEyesV1(retina);
const v2 = createEyesV2(retina);
const seat = sq => (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97); // seat index seen by White
const cellsOf = s => [0, 1, 2, 3].map(j => 4 * s + j);
const stimulationOf = cue => new Map(cue.stimulation.map(({ index, current }) => [index, current]));
// The Fly receives a current from photoreceptor k only when it is positive; zero means absent.
const expectCurrent = (got, k, expected) => expected > 0
  ? assert.equal(got.get(1000 + k), expected)
  : assert.equal(got.has(1000 + k), false);
// Float32 ink is summed in a different order than the expected formula, so compare with a tolerance.
const near = (got, k, expected) => assert(Math.abs((got.get(1000 + k) ?? 0) - expected) < 1e-6,
  `cell ${k}: got ${got.get(1000 + k)}, want ${expected}`);
const START = new Chess().fen();
const CAPTURE = '4k3/8/8/8/p7/8/8/R3K3 w - - 0 1';
const EMPTY = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
const review = [{ fen: CAPTURE, action: 'a1a4', answer: 'success' }, { fen: EMPTY, action: 'a1a4', answer: 'failure' }];

test('review example: v1 gives a1a4 the same input with or without the pawn; v2 shows the pawn', () => {
  const ink = t => v2.pictureInk(t);
  assert.deepEqual(v1.encode(CAPTURE, 'a1a4').stimulation, v1.encode(EMPTY, 'a1a4').stimulation);
  assert.notDeepEqual(v2.encode(CAPTURE, 'a1a4').stimulation, v2.encode(EMPTY, 'a1a4').stimulation);
  const capture = stimulationOf(v2.encode(CAPTURE, 'a1a4'));
  const emptyV2 = stimulationOf(v2.encode(EMPTY, 'a1a4'));
  const emptyV1 = stimulationOf(v1.encode(EMPTY, 'a1a4'));
  for (const k of cellsOf(seat('a4'))) {
    near(capture, k, 1 * ink('r')[k] + 0.25 * ink('p')[k] + 0.5);
    assert.equal(emptyV2.get(1000 + k), emptyV1.get(1000 + k));
  }
});

test('non-capture moves: v2 input equals v1 input exactly', () => {
  assert.deepEqual(v2.encode(START, 'e2e4').stimulation, v1.encode(START, 'e2e4').stimulation);
  const after = new Chess();
  after.move('e4');
  assert.deepEqual(v2.encode(after.fen(), 'e7e5').stimulation, v1.encode(after.fen(), 'e7e5').stimulation);
});

test('en passant: the passed pawn is drawn on d5, not on the landing square d6', () => {
  const ink = t => v2.pictureInk(t);
  const EP = '4k3/2p5/8/3pP3/8/8/8/4K3 w - d6 0 2';
  const got = stimulationOf(v2.encode(EP, 'e5d6'));
  const v1got = stimulationOf(v1.encode(EP, 'e5d6'));
  for (const k of cellsOf(seat('d5'))) expectCurrent(got, k, 0.25 * ink('p')[k]);
  for (const k of cellsOf(seat('d6'))) assert.equal(got.get(1000 + k), v1got.get(1000 + k));
});

test('Black capture: a1 is seat 56 for Black, the rook is the mover and the knight is dim', () => {
  const ink = t => v2.pictureInk(t);
  const got = stimulationOf(v2.encode('4k3/8/8/8/8/8/r7/N3K3 b - - 0 1', 'a2a1'));
  for (const k of cellsOf(56)) near(got, k, 1 * ink('r')[k] + 0.25 * ink('n')[k] + 0.5);
});

test('inputCollisions: v1 merges the review pair with different answers; v2 does not; same answers never collide', () => {
  const groups = inputCollisions(v1, review);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items, [0, 1]);
  assert.deepEqual(groups[0].answers, ['success', 'failure']);
  assert.deepEqual(inputCollisions(v2, review), []);
  const same = [{ fen: START, action: 'e2e4', answer: 'success' }, { fen: START, action: 'e2e4', answer: 'success' }];
  assert.deepEqual(inputCollisions(v1, same), []);
  assert.throws(() => inputCollisions(v1, 'not an array'), /array/);
});

test('identity: deterministic, different from v1, duplicate photoreceptor indices throw', () => {
  assert.equal(createEyesV2(retina).identity, v2.identity);
  assert.notEqual(v2.identity, v1.identity);
  const retina_idx = Int32Array.from(retina.retina_idx);
  retina_idx[1] = retina_idx[0];
  assert.throws(() => createEyesV2({ ...retina, retina_idx }), /unique photoreceptor indices/);
});

const realRetina = fileURLToPath(new URL('../../../.cache/full.npz', import.meta.url));
test('real retina: the review pair is one input under v1 and two inputs under v2',
  { skip: !existsSync(realRetina) }, () => {
    const real = loadRetina(realRetina);
    const r1 = createEyesV1(real), r2 = createEyesV2(real);
    assert.deepEqual(r1.encode(CAPTURE, 'a1a4').stimulation, r1.encode(EMPTY, 'a1a4').stimulation);
    assert.notDeepEqual(r2.encode(CAPTURE, 'a1a4').stimulation, r2.encode(EMPTY, 'a1a4').stimulation);
  });
