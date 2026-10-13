import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { encodeFen } from './positions.mjs';
import { searchPuzzle, uci } from './puzzle-search.mjs';
import { reviewPuzzleExperience } from './experience-feedback.mjs';
import { certifyMate } from './mate-certificate.mjs';

export const puzzleOutputs = 133;
const square = s => (Number(s[1]) - 1) * 8 + s.charCodeAt(0) - 97;

function hashArrays(arrays) {
  const hash = createHash('sha256');
  for (const [name, a] of Object.entries(arrays)) {
    hash.update(name + ':' + a.byteLength + ':');
    hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  }
  return hash.digest('hex');
}

export function brainIdentity(model) {
  return { graphArrays: hashArrays(model.graph), parameters: hashArrays(model.params) };
}

// Fixed, randomly initialized engineering readout. No puzzle label enters it.
// 64 origin + 64 destination + 4 promotion logits; final output is a value.
// This factorization cannot express arbitrary origin/destination interactions.
export function puzzleEvaluator(model) {
  if (model.outputs !== puzzleOutputs) throw Error('Puzzle readout requires 133 outputs');
  return {
    evaluate(board, moves) {
      const logits = model.forward(encodeFen(board.fen()));
      const scores = moves.map(m => logits[square(m.from)] + logits[64 + square(m.to)]
        + (m.promotion ? logits[128 + 'qrbn'.indexOf(m.promotion)] : 0));
      const top = Math.max(...scores), weights = scores.map(v => Math.exp(v - top));
      const total = weights.reduce((a, b) => a + b, 0);
      return { priors: weights.map(v => v / total), value: Math.tanh(logits[132]) };
    },
  };
}

// Explicit integration boundary. Recording an event is NOT neural feedback,
// plasticity, a reward-neuron mapping, or evidence of learning.
export class FeedbackRecorder {
  constructor(received = 0) {
    if (!Number.isSafeInteger(received) || received < 0) throw Error('Invalid feedback cursor');
    this.received = received;
  }
  receive(event) {
    if (!event || typeof event.puzzleId !== 'string' || !event.puzzleId
      || !['success', 'failure', 'unknown'].includes(event.status)
      || event.reward !== ({ success: 1, failure: -1, unknown: null })[event.status]) throw Error('Invalid feedback event');
    this.received++;
    return { sequence: this.received, receiver: 'record-only-v1', event: { ...event },
      appliedToNeurons: false, learningApplied: false,
      blocker: 'A justified reward-neuron mapping and endogenous plasticity mechanism are not implemented' };
  }
}

export function checkPuzzle(puzzle) {
  if (!puzzle || !['fixture', 'train'].includes(puzzle.split)
    || !['id', 'group', 'fen'].every(k => typeof puzzle[k] === 'string' && puzzle[k].length > 0)
    || puzzle.objective !== 'forced-mate' || !Number.isSafeInteger(puzzle.plies)
    || puzzle.plies < 1 || puzzle.plies > 7 || puzzle.plies % 2 !== 1) throw Error('Invalid puzzle; only fixture/train forced-mate rows with 1,3,5,7 plies are accepted');
  const board = new Chess(puzzle.fen);
  if (board.isGameOver()) throw Error('Puzzle must start before the game ends');
  return board;
}

export async function runPuzzleRound(model, puzzle, receiver, {
  search = {}, proofNodes = 4096, proofMilliseconds = 2000, review = {}, guard = () => {}, pace = async () => {},
} = {}) {
  const board = checkPuzzle(puzzle), attacker = board.turn(), before = brainIdentity(model);
  const started = performance.now();
  guard();
  const proofStart = performance.now();
  // Check that the task itself has a verified solution. The proof's result and
  // its search path are never available to the fly or its second-board search.
  const taskProof = certifyMate(board, attacker, { plies: puzzle.plies, maxNodes: proofNodes, milliseconds: proofMilliseconds });
  const taskProofMs = performance.now() - proofStart;
  await pace(taskProofMs);
  if (taskProof.status !== 'success') throw Error(`Puzzle was not verified solvable: ${taskProof.status}`);
  const realBeforeSearch = board.fen();
  const calculation = await searchPuzzle(puzzleEvaluator(model), board, { ...search, guard, pace });
  if (board.fen() !== realBeforeSearch) throw Error('Second-board search changed the real board');
  // Capture the complete history before committing; teacher review runs only
  // after the move is fixed, and its results never enter candidate evaluation.
  const reviewBoard = new Chess(); reviewBoard.loadPgn(board.pgn());
  const played = board.move(calculation.move);
  guard();
  const feedbackStart = performance.now();
  const assessment = certifyMate(board, attacker, { plies: puzzle.plies - 1, maxNodes: proofNodes, milliseconds: proofMilliseconds });
  const assessmentMs = performance.now() - feedbackStart;
  await pace(assessmentMs);
  const reviewStart = performance.now();
  const experience = reviewPuzzleExperience(reviewBoard, calculation, puzzle, review);
  const reviewMs = performance.now() - reviewStart;
  await pace(reviewMs); guard();
  const receipt = receiver.receive({ puzzleId: puzzle.id, move: uci(played),
    status: assessment.status, reward: assessment.reward, criterion: assessment.criterion });
  const after = brainIdentity(model);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Immutable puzzle round changed graph or model parameters');
  return { schema: 'fly-puzzle-round-v1', puzzle, startingFen: realBeforeSearch, endingFen: board.fen(),
    chosenMove: { uci: uci(played), san: played.san },
    taskProof, feedback: assessment, receipt, calculation, experience,
    identity: { before, after, graphAndParametersUnchanged: true },
    timings: { taskProofMs, assessmentMs, reviewMs, roundElapsedMs: performance.now() - started },
    scope: 'One root-move trial plus independently verified feedback; record-only receiver; no biological learning or generalization claim' };
}
