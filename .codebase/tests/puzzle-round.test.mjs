import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { validateGraph } from '../src/lowram/graph.mjs';
import { searchPuzzle, verifyMate, copyBoard, terminalValue, uci } from '../src/lowram/puzzle-search.mjs';
import { FeedbackRecorder, runPuzzleRound, brainIdentity, puzzleOutputs, checkPuzzle } from '../src/lowram/puzzle-round.mjs';

const fen = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
const puzzle = { id: 'fixture-1', group: 'fixture-family', split: 'fixture', fen, objective: 'forced-mate', plies: 1 };
const uniform = { evaluate: (board, moves) => ({ priors: moves.map(() => 1 / moves.length), value: 0 }) };
function model() {
  const graph = validateGraph({ row: Int32Array.from([0, 1, 3, 5]), col: Int32Array.from([2, 0, 2, 0, 1]),
    sign: Int8Array.from([-1, 1, -1, 1, 1]), initial: Float32Array.from([1, 2, 1, 2, 1]),
    input: Int32Array.from([0, 1]), output: Int32Array.from([2]) });
  return new SparseTrainer(graph, { steps: 3, inputDim: 1280, outputs: puzzleOutputs, seed: 47 });
}

test('mate feedback distinguishes success, bounded failure, and unknown without changing the board', () => {
  const board = new Chess(fen), original = board.fen();
  assert.equal(verifyMate(board, 'w', { plies: 1, maxNodes: 100 }).status, 'success');
  assert.equal(verifyMate(board, 'w', { plies: 1, maxNodes: 1 }).reward, null);
  assert.equal(board.fen(), original);
  board.move('Qg7#');
  assert.equal(verifyMate(board, 'w', { plies: 0 }).reward, 1);
  assert.equal(verifyMate(board, 'b', { plies: 0 }).reward, -1);
  const missed = new Chess(fen); missed.move({ from: 'f7', to: 'f6' });
  assert.equal(verifyMate(missed, 'w', { plies: 0 }).reward, -1);
  assert.equal(missed.isGameOver(), false); // Failed task is not a lost game.
});

test('mate proof agrees with an independent exhaustive mate-in-one check for each legal successor', () => {
  for (const start of [fen, '8/8/8/8/8/6k1/5q2/7K b - - 0 1']) {
    const board = new Chess(start), attacker = board.turn();
    for (const move of board.moves({ verbose: true })) {
      board.move(move);
      assert.equal(verifyMate(board, attacker, { plies: 0 }).status, board.isCheckmate() ? 'success' : 'failure');
      board.undo();
    }
  }
});

test('search backs up terminal wins in the right direction for either color', async () => {
  for (const [start, wanted] of [[fen, 'f7g7'], ['8/8/8/8/8/6k1/5q2/7K b - - 0 1', 'f2g2']]) {
    const board = new Chess(start), original = board.pgn();
    // Artificial test prior; not the production readout or a training label.
    const brain = { evaluate: (b, moves) => ({ priors: moves.map(m => uci(m) === wanted ? 1 : 0), value: 0 }) };
    const result = await searchPuzzle(brain, board, { simulations: 3, maxEvaluations: 2, milliseconds: 10000 });
    assert.equal(uci(result.move), wanted);
    assert.equal(result.candidates.find(c => c.uci === wanted).value, 1);
    assert.equal(result.evaluations, 1);
    assert.equal(result.terminalLeaves, 3);
    assert.equal(board.pgn(), original);
  }
});

test('search enforces evaluation/node budgets and labels depth cutoffs as unknown', async () => {
  const board = new Chess(), original = board.fen();
  const capped = await searchPuzzle(uniform, board, { maxEvaluations: 2, maxNodes: 21, simulations: 10, milliseconds: 10000 });
  assert.equal(capped.evaluations, 2);
  assert.equal(capped.nodes, 21);
  const shallow = await searchPuzzle(uniform, board, { maxDepth: 1, simulations: 3, milliseconds: 10000 });
  assert.equal(shallow.unknownCutoffs, 3);
  assert.equal(shallow.terminalLeaves, 0);
  assert.equal(board.fen(), original);
  await assert.rejects(searchPuzzle(uniform, board, { maxNodes: 2 }), /root moves/);
});

test('hypothetical board preserves repetition history and leaves real board intact on evaluator errors', async () => {
  const repeated = new Chess();
  for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) repeated.move(m);
  assert.equal(terminalValue(copyBoard(repeated)), 0);
  const board = new Chess(), original = board.pgn();
  let calls = 0;
  await assert.rejects(searchPuzzle({ evaluate(b, moves) {
    if (++calls === 2) throw Error('injected failure');
    return uniform.evaluate(b, moves);
  } }, board, { milliseconds: 10000 }), /injected failure/);
  assert.equal(board.pgn(), original);
});

test('one round delivers feedback without changing any graph array or parameter; backprop is never called', async () => {
  const brain = model(), before = brainIdentity(brain), receiver = new FeedbackRecorder();
  brain.backward = brain.backwardOutput = brain.step = () => { throw Error('Optimizer must not run'); };
  const result = await runPuzzleRound(brain, puzzle, receiver, { search: { simulations: 8, maxEvaluations: 3, milliseconds: 10000 } });
  assert.deepEqual(brainIdentity(brain), before);
  assert.equal(result.identity.graphAndParametersUnchanged, true);
  assert.equal(receiver.received, 1);
  assert.equal(result.receipt.appliedToNeurons, false);
  assert.equal(result.receipt.learningApplied, false);
  assert.equal(result.startingFen, fen);
  const replay = new Chess(fen); replay.move(result.chosenMove.san);
  assert.equal(replay.fen(), result.endingFen);
});

test('feedback records resume exactly and reject inconsistent reward/status pairs', () => {
  const first = new FeedbackRecorder();
  const unknown = first.receive({ puzzleId: 'p1', status: 'unknown', reward: null });
  assert.equal(unknown.learningApplied, false);
  const resumed = new FeedbackRecorder(first.received);
  assert.equal(resumed.receive({ puzzleId: 'p2', status: 'success', reward: 1 }).sequence, 2);
  assert.throws(() => resumed.receive({ puzzleId: 'bad', status: 'unknown', reward: -1 }), /Invalid feedback/);
  assert.throws(() => checkPuzzle({ ...puzzle, split: 'test' }), /Invalid puzzle/);
  assert.throws(() => checkPuzzle({ ...puzzle, split: 'validation' }), /Invalid puzzle/);
});
