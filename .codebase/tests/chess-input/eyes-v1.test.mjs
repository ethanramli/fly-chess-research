import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';

// Synthetic retina: 64 squares, each with a 2x2 lattice of 4 photoreceptors (k = 4 * seat + j), index 1000 + k.
const retina = (() => {
  const retina_idx = new Int32Array(256), retina_square = new Int8Array(256), retina_uv = new Float32Array(512);
  for (let k = 0; k < 256; k++) {
    retina_idx[k] = 1000 + k;
    retina_square[k] = k >> 2;
    retina_uv[2 * k] = (k & 1) ? 0.75 : 0.25;      // u takes two values
    retina_uv[2 * k + 1] = (k & 2) ? 0.75 : 0.25;  // v takes two values
  }
  return { retina_idx, retina_square, retina_uv };
})();
const eyes = createEyesV1(retina);
const seat = sq => (sq.charCodeAt(1) - 49) * 8 + (sq.charCodeAt(0) - 97); // seat index seen by White
const cellsOf = s => [0, 1, 2, 3].map(j => 4 * s + j);
const stimulationOf = cue => new Map(cue.stimulation.map(({ index, current }) => [index, current]));
// The Fly receives a current from photoreceptor k only when it is positive; zero means absent.
const expectCurrent = (got, k, expected) => expected > 0
  ? assert.equal(got.get(1000 + k), expected)
  : assert.equal(got.has(1000 + k), false);
const START = new Chess().fen();

test('start position, e2e4 as White: marks, own and opponent ink, empty squares absent', () => {
  const cue = eyes.encode(START, 'e2e4'), got = stimulationOf(cue);
  const ink = t => eyes.pictureInk(t);
  for (const k of cellsOf(seat('e2'))) expectCurrent(got, k, 0.5);            // empty and marked
  for (const k of cellsOf(seat('e4'))) expectCurrent(got, k, 1 * ink('p')[k] + 0.5);
  let lit = 0;
  for (const k of cellsOf(seat('d2'))) {                                      // own pawn, unmarked
    if (ink('p')[k] > 0) lit++;
    expectCurrent(got, k, 1 * ink('p')[k]);
  }
  assert(lit > 0);
  for (const k of cellsOf(seat('d7'))) expectCurrent(got, k, 0.5 * ink('p')[k]); // black pawn from White's seat
  for (const k of cellsOf(seat('a3'))) expectCurrent(got, k, 0);
  assert(Math.max(...cue.stimulation.map(s => s.current)) <= 1.5);
});

test('colour mirror: a position and its true mirror (ranks reversed, colours swapped) give the same stimulation', () => {
  const start = eyes.encode(START, 'e2e4');
  assert(start.stimulation.length > 0);
  assert.deepEqual(start.stimulation,
    eyes.encode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', 'e7e5').stimulation);
  // P: White to move. M: its mirror, Black to move. Each rank is mirrored: rank 5 <-> rank 4, rank 6 <-> rank 3.
  const P = '4k3/pp3ppp/8/3pP3/8/2N5/PPP2PPP/4K3 w - - 0 1';
  const M = '4k3/ppp2ppp/2n5/8/3Pp3/8/PP3PPP/4K3 b - - 0 1';
  assert.deepEqual(eyes.encode(P, 'e5e6').stimulation, eyes.encode(M, 'e4e3').stimulation);
  assert.deepEqual(eyes.encode(P, 'c3d5').stimulation, eyes.encode(M, 'c6d4').stimulation);
});

test('capture, en passant, promotion and castling', () => {
  const ink = t => eyes.pictureInk(t);
  // Nxd5: the white knight replaces the black pawn and is the marked to-square.
  const capture = stimulationOf(eyes.encode('4k3/pp3ppp/8/3pP3/8/2N5/PPP2PPP/4K3 w - - 0 1', 'c3d5'));
  for (const k of cellsOf(seat('d5'))) expectCurrent(capture, k, 1 * ink('n')[k] + 0.5);
  // dxe6 e.p. removes the pawn on e5, the third square, which carries no current.
  const ep = stimulationOf(eyes.encode('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1', 'd5e6'));
  for (const k of cellsOf(seat('e5'))) expectCurrent(ep, k, 0);
  for (const k of cellsOf(seat('d5'))) expectCurrent(ep, k, 0.5);
  for (const k of cellsOf(seat('e6'))) expectCurrent(ep, k, 1 * ink('p')[k] + 0.5);
  // Promotion: a8 shows the promoted piece, not a pawn.
  const queen = stimulationOf(eyes.encode('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7a8q'));
  for (const k of cellsOf(seat('a8'))) expectCurrent(queen, k, 1 * ink('q')[k] + 0.5);
  const knight = stimulationOf(eyes.encode('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7a8n'));
  for (const k of cellsOf(seat('a8'))) expectCurrent(knight, k, 1 * ink('n')[k] + 0.5);
  // O-O: the rook lands unmarked on f1, h1 is empty, e1 and g1 are marked.
  const castle = stimulationOf(eyes.encode('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'e1g1'));
  for (const k of cellsOf(seat('f1'))) expectCurrent(castle, k, 1 * ink('r')[k]);
  for (const k of cellsOf(seat('h1'))) expectCurrent(castle, k, 0);
  for (const k of cellsOf(seat('e1'))) expectCurrent(castle, k, 0.5);
  for (const k of cellsOf(seat('g1'))) expectCurrent(castle, k, 1 * ink('k')[k] + 0.5);
});

test('illegal action throws; encode is deterministic; result keys are exact', () => {
  assert.throws(() => eyes.encode(START, 'e2e5'), /Illegal eye action/);
  const first = eyes.encode(START, 'e2e4');
  assert.deepEqual(eyes.encode(START, 'e2e4'), first);
  assert.deepEqual(eyes.encode(new Chess(), 'e2e4'), first); // object with fen()
  assert.deepEqual(Object.keys(first).sort(), ['action', 'identity', 'schema', 'scope', 'stimulation']);
});

test('identity changes with one picture digit or one retina_uv value', () => {
  const pictures = JSON.parse(readFileSync(new URL('../../src/chess-input/eyes-v1-pictures.json', import.meta.url), 'utf8'));
  const row = pictures.pictures.p[0];
  pictures.pictures.p[0] = (row[0] === '0' ? '1' : '0') + row.slice(1);
  assert.notEqual(createEyesV1(retina, pictures).identity, eyes.identity);
  const retina_uv = Float32Array.from(retina.retina_uv);
  retina_uv[0] += 0.01;
  assert.notEqual(createEyesV1({ ...retina, retina_uv }).identity, eyes.identity);
  assert.equal(createEyesV1(retina).identity, eyes.identity);
});

test('plumbing: the stimulation raises the target neuron in SparseTrainer', () => {
  // Four neurons. Neuron 3 receives from neurons 0, 1 and 2 (CSR rows are receivers). Neurons 0..2 are the eye targets.
  const graph = { row: Int32Array.from([0, 0, 0, 0, 3]), col: Int32Array.from([0, 1, 2]), sign: new Int8Array(3).fill(1),
    initial: new Float32Array(3).fill(1), input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1 });
  // Only three photoreceptors, all on e4 (seat 28). Other squares have none; the constructor must accept that.
  const small = createEyesV1({ retina_idx: Int32Array.from([0, 1, 2]), retina_square: Int8Array.from([28, 28, 28]),
    retina_uv: Float32Array.from([0.25, 0.25, 0.75, 0.25, 0.25, 0.75]) });
  model.forward([0], []);
  const rest = model.h[model.steps][3];
  model.forward([0], small.encode(START, 'e2e4').stimulation);
  assert(model.h[model.steps][3] > rest);
});

const realRetina = fileURLToPath(new URL('../../../.cache/full.npz', import.meta.url));
test('real retina: 5,543 photoreceptors, every square separated, start position bounded',
  { skip: !existsSync(realRetina) }, t => {
    const real = loadRetina(realRetina);
    assert.equal(real.retina_idx.length, 5543);
    assert(real.retina_idx.every(i => i >= 0 && i <= 134208));
    const real_eyes = createEyesV1(real);
    const types = 'pnbrqk';
    const bySquare = Array.from({ length: 64 }, () => []);
    real.retina_square.forEach((s, k) => bySquare[s].push(k));
    let worst = Infinity;
    for (let s = 0; s < 64; s++) {
      assert(bySquare[s].length > 0, `square ${s} has no photoreceptors`);
      for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
        const A = real_eyes.pictureInk(types[a]), B = real_eyes.pictureInk(types[b]);
        const mean = bySquare[s].reduce((sum, k) => sum + Math.abs(A[k] - B[k]), 0) / bySquare[s].length;
        worst = Math.min(worst, mean);
        assert(mean >= 0.05, `square ${s} ${types[a]}/${types[b]} separation ${mean}`);
      }
    }
    t.diagnostic(`worst separation ${worst}`);
    const cue = real_eyes.encode(START, 'e2e4');
    assert(Math.max(...cue.stimulation.map(s => s.current)) <= 1.5);
  });
