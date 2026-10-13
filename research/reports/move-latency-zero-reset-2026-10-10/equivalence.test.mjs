import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer as Oracle, random } from './oracle-trainer.mjs';
import { SparseTrainer as Candidate } from './candidate-trainer.mjs';
import { validateGraph } from '../../../.codebase/src/runtime/graph.mjs';
import { chooseFlyMove, choosePawnMove } from '../../../.codebase/src/evaluation-and-performance/fly-policy.mjs';

function graph(seed) {
  const rng = random(seed), n = 19, row = [0], col = [], sign = [], initial = [];
  const signs = Array.from({ length: n }, () => rng() < .4 ? -1 : 1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) if (i === j || rng() < .3) {
      col.push(i); sign.push(signs[i]); initial.push(1 + Math.floor(rng() * 12));
    }
    row.push(col.length);
  }
  return validateGraph({ row: Int32Array.from(row), col: Int32Array.from(col),
    sign: Int8Array.from(sign), initial: Float32Array.from(initial),
    input: Int32Array.from([0, 2, 6, 11]), output: Int32Array.from([4, 9, 18]) });
}
function equalState(a, b) {
  for (const key of ['h', 'activity', 'drive', 'alpha', 'prediction', 'params', 'grads', 'signedMagnitude'])
    assert.deepEqual(b[key], a[key], key);
}

test('synthetic exact buffers, derivatives and post-update outputs, including explicit state', () => {
  for (const precision of ['float32', 'float64']) for (const steps of [1, 2, 8]) for (const seed of [1, 47, 109]) {
    const config = { precision, steps, seed, inputDim: 7, outputs: 2, normalization: 'global' };
    const a = new Oracle(graph(seed), config), b = new Candidate(graph(seed), config);
    const rng = random(seed + 3);
    // Include varying leak, bias, saturation, cancellation and negative drives.
    for (let j = 0; j < a.n; j++) {
      a.params.leak[j] = b.params.leak[j] = (rng() - .5) * 6;
      a.params.bias[j] = b.params.bias[j] = (rng() - .5) * 40;
    }
    for (const initial of [null, new Float32Array(a.n), Float32Array.from({ length: a.n }, () => rng() * 9)]) {
      const x = Array.from({ length: 7 }, (_, i) => i % 3 ? rng() - .5 : 0);
      const stimulation = [{ index: 2, current: 15 }, { index: 2, current: -4 }, { index: 12, current: -20 }];
      a.zeroGrad(); b.zeroGrad();
      assert.deepEqual(b.forward(x, stimulation, initial), a.forward(x, stimulation, initial)); equalState(a, b);
      a.backward([.3, -.1]); b.backward([.3, -.1]); equalState(a, b);
      assert.deepEqual(b.step(), a.step()); equalState(a, b);
      assert.deepEqual(b.forward(x), a.forward(x)); equalState(a, b);
    }
  }
});

test('synthetic invalid inputs, stimulation, initial state, weights and columns still fail', () => {
  for (const Type of [Oracle, Candidate]) {
    const m = new Type(graph(47), { inputDim: 2, outputs: 2 });
    assert.throws(() => m.forward([1]), /dimension/);
    assert.throws(() => m.forward([NaN, 1]), /Nonfinite input/);
    assert.throws(() => m.forward([1, 0], [{ index: -1, current: 1 }]), /stimulation/);
    assert.throws(() => m.forward([1, 0], [], [0]), /initial/);
    const valid = m.signedMagnitude[0];
    for (const bad of [NaN, Infinity, -Infinity]) {
      m.signedMagnitude[0] = bad;
      assert.throws(() => m.forward([0, 0]), /Nonfinite recurrent/);
    }
    m.signedMagnitude[0] = valid;
    m.graph.col[0] = m.n;
    assert.throws(() => m.forward([0, 0]), /Nonfinite recurrent/);
  }
});

test('synthetic all-legal scores, tie order, pawn policy and real history agree', async () => {
  const fixtures = [[], ['e4'], ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    '8/8/8/3k4/8/3K4/8/7R w - - 0 1',
    '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    'r3k2r/8/8/3pP3/8/8/8/R3K2R w KQkq d6 0 1',
    ['Nf3', 'Nf6', 'Ng1', 'Ng8']];
  for (const fixture of fixtures) {
    const game = typeof fixture === 'string' ? new Chess(fixture) : new Chess();
    if (Array.isArray(fixture)) for (const move of fixture) game.move(move);
    const fen = game.fen(), history = game.pgn(), count = game.moves().length;
    const config = { seed: 47, steps: 8, inputDim: 1280, outputs: 2, normalization: 'global' };
    const a = new Oracle(graph(47), config), b = new Candidate(graph(47), config);
    const recorded = async model => {
      const scores = [], original = model.forward.bind(model); let paced = 0;
      model.forward = (...args) => { const output = original(...args); scores.push([...output]); return output; };
      const choice = await chooseFlyMove(model, game, async () => paced++);
      return { choice, scores, paced };
    };
    assert.deepEqual(await recorded(b), await recorded(a)); equalState(a, b);
    assert.equal(game.fen(), fen); assert.equal(game.pgn(), history);
    assert.equal(a.activeInput.length, b.activeInput.length);
    assert.equal(count, game.moves().length);
    if (game.moves({ verbose: true }).some(move => move.piece === 'p'))
      assert.deepEqual(choosePawnMove(b, fen), choosePawnMove(a, fen));
    // An exactly tied head must retain the existing legal-move order.
    a.params.head.fill(0); b.params.head.fill(0);
    const tied = await chooseFlyMove(b, game);
    assert.deepEqual(tied, await chooseFlyMove(a, game));
    assert.equal(tied.from + tied.to + (tied.promotion ?? ''),
      game.moves({ verbose: true })[0].lan);
  }
});
