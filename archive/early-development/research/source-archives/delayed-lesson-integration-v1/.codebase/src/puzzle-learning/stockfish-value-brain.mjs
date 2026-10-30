import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DualValencePuzzleBrain } from './dual-valence-puzzle-brain.mjs';
import { createDualValenceInterface } from '../neural-learning/dual-valence-interface.mjs';
import { gradeStockfishChoice, conservativeValueError } from '../search-and-feedback/stockfish-feedback-rubric.mjs';
import { provisionalMBONValue } from '../search-and-feedback/stockfish-target.mjs';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';
import { fixedStateHash } from '../neural-learning/association-validation.mjs';
import { mappedActivityTrace } from '../neural-learning/mapped-activity-trace.mjs';

// Separate experimental condition. The fixed transform is uncalibrated; no
// decoder fitting, imported weights, backprop or teacher-calculated gains.
export class StockfishValueBrain extends DualValencePuzzleBrain {
  constructor(options, { valueScale = 1, maxReinforcementCurrent = 1.5 } = {}) {
    super(options);
    assert.ok(Number.isFinite(valueScale) && valueScale > 0);
    assert.ok(Number.isFinite(maxReinforcementCurrent) && maxReinforcementCurrent > 0 && maxReinforcementCurrent <= 1.5);
    this.valueConfig = { schema: 'fixed-mbon-value-proxy-v1', valueScale, maxReinforcementCurrent };
    this.valueIdentity = digest(this.valueConfig);
  }
  async evaluate(board, moves, task) {
    const assessment = await this.assess(board, moves, task);
    const highest = Math.max(...assessment.rows.map(row => row.score));
    const weights = assessment.rows.map(row => Math.exp(this.priorScale * (row.score - highest)));
    const sum = weights.reduce((a, b) => a + b, 0);
    const values = assessment.rows.map(row => provisionalMBONValue(row, this.valueConfig.valueScale));
    return { priors: weights.map(weight => weight / sum),
      value: Math.max(...values.map(value => value ?? 0)),
      valueIdentity: this.valueIdentity, scope: 'Uncalibrated fixed action-value proxy; max over evaluated actions is an engineered node estimate.' };
  }
  async replayValue(review, { condition = 'informative', shuffle = null,
    captureActivityTrace = false } = {}) {
    assert.ok(['informative', 'outcome-only', 'no-channel', 'shuffled', 'disabled'].includes(condition));
    assert.equal(typeof captureActivityTrace, 'boolean');
    const board = new Chess(); board.loadPgn(review.context.pgn);
    assert.equal(board.fen(), review.context.fen);
    const taskEvidence = verifiedExperience(board, review.chosen, review.context.task, review.taskProof);
    if (!taskEvidence.learningAllowed) return { schema: 'stockfish-value-feedback-receipt-v2',
      taskEvidence, skipped: true, learningApplied: false,
      reason: 'Independent task consequence is unknown; no Stockfish-value event is taught.',
      memoryHash: this.memoryFingerprint(), valueIdentity: this.valueIdentity,
      scope: 'Engine estimate cannot replace the required independently checked task consequence.' };
    const grade = condition === 'outcome-only' ? null : gradeStockfishChoice(review);
    // `grade.teachingAllowed` governs action-regret shaping. Value teaching has
    // its own conservative target-minus-prediction test, so a valid target may
    // be used even when the chosen move is near-best and regret shaping is zero.
    if (condition !== 'outcome-only' && !grade.selectedExpectedScore) return { schema: 'stockfish-value-feedback-receipt-v2', grade,
      taskEvidence, skipped: true, learningApplied: false, reason: 'Teacher value target is incomplete or unavailable.',
      memoryHash: this.memoryFingerprint(), valueIdentity: this.valueIdentity,
      scope: 'Unavailable teacher evidence supplies no neural feedback event.' };
    const memoryHash = this.memoryFingerprint();
    const rootMoves = board.moves({ verbose: true });
    const chosenMove = rootMoves.find(move =>
      move.from + move.to + (move.promotion ?? '') === review.chosen);
    assert.ok(chosenMove, 'Chosen move is not legal in the bound root context');
    const child = new Chess(); child.loadPgn(review.context.pgn);
    child.move(chosenMove);
    const childMoves = child.moves({ verbose: true });
    const predictionContext = { root: { fen: board.fen(), pgn: board.pgn(), actor: review.actor },
      child: { fen: child.fen(), pgn: child.pgn(), sideToMove: child.turn() }, memoryHash,
      valueIdentity: this.valueIdentity, valueConfig: structuredClone(this.valueConfig) };
    // There is no action-based state estimate after a terminal move. Do not
    // spend root/child graph evaluations or invent a proxy for known terminal
    // semantics; the certificate/engine evidence remains separately recorded.
    if (!childMoves.length) return { schema: 'stockfish-value-feedback-receipt-v2', grade,
      taskEvidence, skipped: true, learningApplied: false, reason: 'Terminal child has no neural action-value estimate.',
      rootLegalMoves: rootMoves.length, childLegalMoves: 0, requiredPresentations: 0,
      predictionContext, memoryHash, valueIdentity: this.valueIdentity,
      scope: 'Terminal task truth does not become an invented neural value target.' };
    const requiredPresentations = rootMoves.length + childMoves.length + 1;
    if (rootMoves.length > this.maxLegalMoves || childMoves.length > this.maxLegalMoves
      || this.presentations + requiredPresentations > this.maxPresentations)
      return { schema: 'stockfish-value-feedback-receipt-v2', skipped: true,
        taskEvidence, learningApplied: false, reason: 'Same-position prediction exceeds legal-action or presentation budget.',
        rootLegalMoves: rootMoves.length, childLegalMoves: childMoves.length,
        requiredPresentations, remainingPresentations: this.maxPresentations - this.presentations,
        predictionContext, memoryHash, valueIdentity: this.valueIdentity,
        scope: 'Budget exhaustion supplies no neural feedback event.' };
    const rootAssessment = await this.assess(board, rootMoves, review.context.task);
    assert.equal(rootAssessment.memoryFingerprint, memoryHash, 'Root ranking used stale or changed memory');
    const chosen = rootAssessment.rows.find(row => row.move === review.chosen);
    assert.ok(chosen, 'Chosen move missing from fresh neural ranking');
    const actionPreference = provisionalMBONValue(chosen, this.valueConfig.valueScale);

    // The engine target describes the child position after the chosen move.
    // Compare it to a neural estimate of that same child, oriented to the root
    // actor.  The root MBON score is an action preference and is recorded
    // separately; subtracting it from a position outcome mixed two quantities.
    const childAssessment = await this.assess(child, childMoves, review.context.task);
    assert.equal(childAssessment.memoryFingerprint, memoryHash,
      'Child value used stale or changed memory');
    const childValues = childAssessment.rows.map(row => provisionalMBONValue(row, this.valueConfig.valueScale));
    // Do not replace a silent neural output with zero; that would be a fabricated
    // target-bearing prediction.
    const childStateValue = childValues.length && childValues.every(Number.isFinite)
      ? Math.max(...childValues) : null;
    const prediction = childStateValue === null ? null
      : (child.turn() === review.actor ? childStateValue : -childStateValue);
    const error = prediction === null ? { available: false, error: 0,
      reason: 'No neural child-position value is available for this terminal or silent position.' }
      : grade ? conservativeValueError(grade, prediction) : { available: false, error: 0,
        reason: 'Outcome-only condition does not use Stockfish value error.' };
    // Shuffle the entire signed magnitude from a precomputed, pinned schedule.
    if (condition === 'shuffled' && error.available)
      assert.ok(shuffle && shuffle.schema === 'matched-stockfish-error-shuffle-v1'
        && /^[a-f0-9]{64}$/.test(shuffle.scheduleSha256 ?? '')
        && Number.isSafeInteger(shuffle.eventIndex) && shuffle.eventIndex >= 0
        && Number.isFinite(shuffle.error) && Math.abs(shuffle.error) <= 2
        && shuffle.error !== 0 && Math.sign(shuffle.error) === -Math.sign(error.error),
      'Require frozen schedule-bound nonzero error with reversed assignment');
    if (condition === 'shuffled' && !error.available)
      return { schema: 'stockfish-value-feedback-receipt-v2', grade, taskEvidence,
        skipped: true, learningApplied: false, reason: 'Cannot shuffle an unavailable or zero value error.',
        memoryHash, valueIdentity: this.valueIdentity,
        scope: 'Matched shuffling is defined only for a teachable signed value error.' };
    const valueSignalAvailable = error.available && condition !== 'outcome-only';
    const deliveredError = !valueSignalAvailable || condition === 'no-channel' ? 0
      : condition === 'shuffled' ? shuffle.error : error.error;
    const outcomeChannel = taskEvidence.status === 'success' ? 'PAM02' : 'PPL103';
    const channel = condition === 'outcome-only' ? outcomeChannel
      : deliveredError > 0 ? 'PAM02' : deliveredError < 0 ? 'PPL103' : null;
    const current = condition === 'outcome-only' ? this.valueConfig.maxReinforcementCurrent
      : this.valueConfig.maxReinforcementCurrent * Math.abs(deliveredError) / 2;
    if (!valueSignalAvailable && condition !== 'outcome-only' && condition !== 'no-channel') return { grade, rootAssessment, childAssessment, actionPreference,
      taskEvidence, childStateValue, prediction, predictionPerspective: review.actor, error, deliveredError: 0,
      predictionContext, valueIdentity: this.valueIdentity, skipped: true, learningApplied: false,
      scope: 'No value teaching when a same-child, same-perspective provisional neural estimate is unavailable.' };
    const cue = this.encoder.encode(board, review.chosen, review.context.task);
    const presentation = createDualValenceInterface(this.mapping, current || this.valueConfig.maxReinforcementCurrent)
      .present(cue.stimulation, channel);
    if (!channel) presentation.reinforcementCurrent = 0;
    const before = this.memory.snapshot();
    const fixedBefore = fixedStateHash(this.model, this.memory.edges);
    assert.equal(digest(before), rootAssessment.memoryFingerprint, 'Memory changed before feedback');
    const response = await this.evoke(presentation.stimulation);
    const activityTrace = captureActivityTrace
      ? mappedActivityTrace(this.model, this.rest, this.mapping) : null;
    const h = this.model.h[this.model.steps], scale = this.memory.config.activityScale;
    const kc = this.mapping.groups.flatMap(group => group.kc.map(index => Math.max(0, h[index] - this.rest[index]) / scale));
    const update = condition === 'disabled' ? { events: this.memory.events, changedEdges: 0, factors: [] }
      : this.memory.observe(this.rest);
    const fixedAfter = fixedStateHash(this.model, this.memory.edges);
    assert.equal(fixedAfter, fixedBefore, 'Graded teaching changed fixed wiring/parameters');
    return { schema: 'stockfish-value-feedback-receipt-v2', taskEvidence, grade,
      rootAssessment, childAssessment, actionPreference, childStateValue, prediction,
      predictionPerspective: review.actor, predictionContext, error,
      shuffle: condition === 'shuffled' ? structuredClone(shuffle) : null,
      context: structuredClone(review.context), teacherReview: structuredClone(review),
      valueIdentity: this.valueIdentity, valueConfig: this.valueConfig,
      condition, teachingSignal: condition === 'outcome-only' ? 'verified-task-valence' : 'stockfish-value-error',
      outcomeChannel, deliveredError, channel, current, cue, presentation, response,
      before, after: this.memory.snapshot(), fixedBefore, fixedAfter,
      local: { kc, factors: update.factors }, activityTrace, update,
      plasticityEnabled: condition !== 'disabled', learningApplied: update.changedEdges > 0,
      scope: 'Experimental full-game engine-target value learning via existing local physiology; not certified reasoning, calibrated evaluation or validated graded dose.' };
  }
}
