import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { stockfishTarget } from './stockfish-target.mjs';

// Expected game points, not a mate-deadline certificate or fly win probability.
// Sources/adaptations: research/literature/graded-feedback-2026-10-08/README.md.
export const gradedRubric = Object.freeze({ bestTolerance: 0.005, goodTolerance: 0.025,
  inaccuracy: 0.05, mistake: 0.10, blunder: 0.15 });
const uci = move => move.from + move.to + (move.promotion ?? '');
const unknown = reason => ({ schema: 'stockfish-graded-feedback-v1', teachingAllowed: false,
  grade: 'unknown', signal: 0, reason, evidenceClass: 'engine-estimate' });
function category(loss) {
  if (loss >= gradedRubric.blunder) return 'blunder';
  if (loss >= gradedRubric.mistake) return 'mistake';
  if (loss >= gradedRubric.inaccuracy) return 'inaccuracy';
  if (loss > gradedRubric.goodTolerance) return 'small-loss';
  return loss <= gradedRubric.bestTolerance ? 'engine-near-best' : 'good';
}
function shaping(loss) {
  return loss <= gradedRubric.goodTolerance ? 1 - loss / gradedRubric.goodTolerance
    : -Math.min(1, (loss - gradedRubric.goodTolerance) / (gradedRubric.blunder - gradedRubric.goodTolerance));
}

export function gradeStockfishChoice(review) {
  assert.equal(review?.criterion, 'full-game-expected-score');
  assert.ok(/^[a-f0-9]{64}$/.test(review.engine?.binarySha256 ?? '')
    && /^[a-f0-9]{64}$/.test(review.engine?.settingsHash ?? ''), 'Pin engine and settings identities');
  const board = new Chess(); board.loadPgn(review.context.pgn);
  assert.equal(board.fen(), review.context.fen, 'Teacher history/position mismatch');
  assert.equal(review.actor, board.turn(), 'Teacher actor mismatch');
  const legal = board.moves({ verbose: true }), moves = legal.map(uci);
  assert.ok(moves.includes(review.chosen), 'Chosen action is illegal');
  assert.ok(Array.isArray(review.analyses) && review.analyses.length <= 4096, 'Bound engine records');
  const byMove = new Map(moves.map(move => [move, new Map()]));
  for (const record of review.analyses) {
    assert.deepEqual(record.engine, review.engine, 'Mixed teacher identity');
    assert.ok(byMove.has(record.move) && Number.isSafeInteger(record.budget) && record.budget > 0);
    assert.ok(!byMove.get(record.move).has(record.budget), 'Duplicate move/budget analysis');
    assert.ok(Array.isArray(record.transcript) && record.transcript.length <= 4096
      && record.transcript.every(line => typeof line === 'string' && line.length <= 65536), 'Bound engine transcript');
    const child = new Chess(); child.loadPgn(board.pgn());
    child.move(legal.find(move => uci(move) === record.move));
    assert.equal(record.fen, child.fen(), 'Analysis child position mismatch');
    assert.equal(record.pgn, child.pgn(), 'Analysis child history mismatch');
    const target = stockfishTarget(record.transcript, {
      actor: review.actor, sideToMove: child.turn(), completed: record.completed });
    if (!target.teachingAllowed) return unknown(`Unavailable exact estimate for ${record.move}`);
    byMove.get(record.move).set(record.budget, target);
  }
  const budgets = [...byMove.get(review.chosen).keys()].sort((a, b) => a - b);
  if (budgets.length < 2 || [...byMove.values()].some(records =>
    JSON.stringify([...records.keys()].sort((a, b) => a - b)) !== JSON.stringify(budgets)))
    return unknown('Require every legal action at the same two or more budgets');
  const candidates = [...byMove].map(([move, records]) => {
    const values = [...records.values()].map(target => (target.utility + 1) / 2);
    return { move, low: Math.min(...values), high: Math.max(...values),
      targets: [...records.values()] };
  });
  const selected = candidates.find(row => row.move === review.chosen);
  const bestLow = Math.max(...candidates.map(row => row.low));
  const bestHigh = Math.max(...candidates.map(row => row.high));
  const regret = { low: Math.max(0, bestLow - selected.high), high: Math.max(0, bestHigh - selected.low) };
  const lowerSignal = shaping(regret.high), upperSignal = shaping(regret.low);
  const signal = lowerSignal > 0 ? lowerSignal : upperSignal < 0 ? upperSignal : 0;
  const gradeLow = category(regret.low), gradeHigh = category(regret.high);
  return { schema: 'stockfish-graded-feedback-v1', criterion: review.criterion,
    evidenceClass: 'engine-estimate', teachingAllowed: signal !== 0,
    grade: gradeLow === gradeHigh ? gradeLow : 'uncertain-grade', signal,
    regret, selectedExpectedScore: { low: selected.low, high: selected.high },
    bestExpectedScore: { low: bestLow, high: bestHigh },
    nearBestMoves: candidates.filter(row => row.high >= bestLow - gradedRubric.bestTolerance).map(row => row.move),
    budgets, engine: structuredClone(review.engine), chosen: review.chosen, actor: review.actor,
    rubric: gradedRubric, candidateCount: candidates.length,
    scope: 'All-legal engine estimates at finite budgets; budget-disagreement envelopes are not statistical confidence intervals. Does not establish task-deadline success or unique optimal play.' };
}

export function conservativeValueError(grade, neuralValue) {
  assert.ok(Number.isFinite(neuralValue) && Math.abs(neuralValue) <= 1, 'Invalid neural value');
  if (!grade.selectedExpectedScore) return { available: false, error: 0 };
  const low = 2 * grade.selectedExpectedScore.low - 1 - neuralValue;
  const high = 2 * grade.selectedExpectedScore.high - 1 - neuralValue;
  const error = low > 0 ? low : high < 0 ? high : 0;
  return { available: error !== 0, error, low, high,
    meaning: 'Conservative external target minus declared neural value; engineered teaching error, not identified natural dopamine.' };
}
