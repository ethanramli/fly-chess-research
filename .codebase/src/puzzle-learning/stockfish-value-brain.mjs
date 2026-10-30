import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DualValencePuzzleBrain } from './dual-valence-puzzle-brain.mjs';
import { createDualValenceInterface } from '../neural-learning/dual-valence-interface.mjs';
import { gradeStockfishChoice, conservativeValueError } from '../search-and-feedback/stockfish-feedback-rubric.mjs';
import { provisionalMBONValue } from '../search-and-feedback/stockfish-target.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';
import { fixedStateHash } from '../neural-learning/association-validation.mjs';
import { mappedActivityTrace } from '../neural-learning/mapped-activity-trace.mjs';

function checkDecisionBinding(review,memoryHash,rootMoves,taskEvidence){
  const decision=review.decision;
  if(decision===undefined)return null;
  assert.equal(decision.memoryHash,memoryHash,'Pre-feedback choice used stale learner memory');
  assert.equal(decision.choice,review.chosen,'Engine review differs from the Fly choice');
  assert.equal(decision.taskProofSha256,taskEvidence.certificateSha256,
    'Pre-feedback choice is bound to another task certificate');
  assert(Array.isArray(decision.rows),'Missing pre-feedback all-legal ranking');
  const rows=[...decision.rows].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(rows.map(row=>row.move),rootMoves.map(move=>move.from+move.to+(move.promotion??'')).sort(),
    'Pre-feedback choice does not cover every legal action');
  assert(rows.every(row=>Number.isFinite(row.score)),'Invalid pre-feedback learner score');
  const best=Math.max(...rows.map(row=>row.score));
  const tied=rows.filter(row=>row.score===best).map(row=>row.move).sort();
  assert.equal(tied.length,1,'A tied learner ranking cannot bind a unique Stockfish teaching action');
  assert.equal(tied[0],decision.choice,'Pre-feedback choice does not match its ranking');
  return rows;
}

function verifyFreshDecision(rows,rootAssessment){
  if(rows===null)return;
  const fresh=[...rootAssessment.rows].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(fresh,rows,'Feedback replay ranking differs from the recorded unaided choice');
}

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
  async replayValue(review, { condition = 'informative', shuffle = null, shuffledStatus = null,
    captureActivityTrace = false } = {}) {
    assert.ok(['informative', 'outcome-only', 'outcome-shuffled', 'no-channel', 'shuffled', 'disabled'].includes(condition));
    if(condition==='outcome-shuffled')assert(['success','failure'].includes(shuffledStatus));
    else assert.equal(shuffledStatus,null,'Unexpected shuffled task label');
    assert.equal(typeof captureActivityTrace, 'boolean');
    const board = new Chess(); board.loadPgn(review.context.pgn);
    assert.equal(board.fen(), review.context.fen);
    const taskEvidence = this.verifyExperience(board, review.chosen, review.context.task, review.taskProof);
    if (!taskEvidence.learningAllowed) return { schema: 'stockfish-value-feedback-receipt-v2',
      taskEvidence, skipped: true, learningApplied: false,
      reason: 'Independent task consequence is unknown; no Stockfish-value event is taught.',
      memoryHash: this.memoryFingerprint(), valueIdentity: this.valueIdentity,
      scope: 'Engine estimate cannot replace the required independently checked task consequence.' };
    assert.equal(review.actor, board.turn(), 'Teacher actor mismatch');
    const memoryHash = this.memoryFingerprint();
    const rootMoves = board.moves({ verbose: true });
    const boundDecision=checkDecisionBinding(review,memoryHash,rootMoves,taskEvidence);
    if (condition === 'outcome-only' || condition === 'outcome-shuffled') {
      // A checked root-action consequence needs no child-action value proxy,
      // including when the chosen move ends the game.
      const requiredPresentations = rootMoves.length + 1;
      if (rootMoves.length > this.maxLegalMoves
          || this.presentations + requiredPresentations > this.maxPresentations)
        return { schema: 'task-consequence-feedback-receipt-v1', taskEvidence,
          skipped: true, learningApplied: false, memoryHash,
          rootLegalMoves: rootMoves.length, requiredPresentations,
          reason: 'Root-action task feedback exceeds the registered presentation budget.' };
      const fixedBefore = fixedStateHash(this.model, this.memory.edges);
      const rootAssessment = await this.assess(board, rootMoves, review.context.task);
      assert.equal(rootAssessment.memoryFingerprint, memoryHash, 'Stale root ranking');
      verifyFreshDecision(boundDecision,rootAssessment);
      const outcome = await super.replay({ ...taskEvidence,
        context: structuredClone(review.context), proof: review.taskProof },
      { current: this.valueConfig.maxReinforcementCurrent,
        ...(condition==='outcome-shuffled'?{channel:shuffledStatus==='success'?'PAM02':'PPL103'}:{}) });
      assert.equal(digest(outcome.before), memoryHash, 'Memory changed before task feedback');
      const fixedAfter = fixedStateHash(this.model, this.memory.edges);
      assert.equal(fixedAfter, fixedBefore, 'Task teaching changed fixed wiring/parameters');
      const top = Math.max(...rootAssessment.rows.map(row => row.score));
      const tiedTopMoves = rootAssessment.rows.filter(row => row.score === top).map(row => row.move);
      return { ...outcome, schema: 'task-consequence-feedback-receipt-v1',
        taskEvidence, condition, teachingSignal: condition==='outcome-shuffled'?'matched-shuffled-task-valence':'verified-task-valence', grade: null,
        ...(condition==='outcome-shuffled'?{deliveredTaskStatus:shuffledStatus}:{}),
        rootAssessment, rootLegalMoves: rootMoves.length, requiredPresentations,
        reviewRole: tiedTopMoves.length > 1 ? 'candidate-review-after-tie'
          : rootAssessment.choice === review.chosen ? 'chosen-action-review' : 'alternative-action-review',
        tiedTopMoves, channel: outcome.event.channel,
        current: outcome.presentation.reinforcementCurrent, deliveredError: 0,
        fixedBefore, fixedAfter, activityTrace: captureActivityTrace
          ? mappedActivityTrace(this.model, this.rest, this.mapping) : null,
        scope: 'Certified root-action task feedback; no position-value estimate or demonstrated learning efficacy.' };
    }
    const grade = gradeStockfishChoice(review);
    // `grade.teachingAllowed` governs action-regret shaping. Value teaching has
    // its own conservative target-minus-prediction test, so a valid target may
    // be used even when the chosen move is near-best and regret shaping is zero.
    if (!grade.selectedExpectedScore) return { schema: 'stockfish-value-feedback-receipt-v2', grade,
      taskEvidence, skipped: true, learningApplied: false, reason: 'Teacher value target is incomplete or unavailable.',
      memoryHash: this.memoryFingerprint(), valueIdentity: this.valueIdentity,
      scope: 'Unavailable teacher evidence supplies no neural feedback event.' };
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
    verifyFreshDecision(boundDecision,rootAssessment);
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
      : conservativeValueError(grade, prediction);
    // Shuffle the entire signed magnitude from a precomputed, pinned schedule.
    let shuffledError=null;
    if (condition === 'shuffled' && error.available){
      assert.ok(shuffle && shuffle.schema === 'matched-stockfish-error-shuffle-v1'
        && /^[a-f0-9]{64}$/.test(shuffle.scheduleSha256 ?? '')
        && Number.isSafeInteger(shuffle.eventIndex) && shuffle.eventIndex >= 0,
      'Require frozen schedule identity and event index');
      shuffledError=shuffle.errorSign===-1&&shuffle.error===undefined?-error.error:shuffle.error;
      assert.ok(Number.isFinite(shuffledError)&&Math.abs(shuffledError)<=2&&shuffledError!==0
        &&Math.sign(shuffledError)===-Math.sign(error.error),
      'Require nonzero schedule-bound feedback with reversed assignment');
    }
    if (condition === 'shuffled' && !error.available)
      return { schema: 'stockfish-value-feedback-receipt-v2', grade, taskEvidence,
        skipped: true, learningApplied: false, reason: 'Cannot shuffle an unavailable or zero value error.',
        memoryHash, valueIdentity: this.valueIdentity,
        scope: 'Matched shuffling is defined only for a teachable signed value error.' };
    const valueSignalAvailable = error.available;
    const deliveredError = !valueSignalAvailable || condition === 'no-channel' ? 0
      : condition === 'shuffled' ? shuffledError : error.error;
    const outcomeChannel = taskEvidence.status === 'success' ? 'PAM02' : 'PPL103';
    const channel = deliveredError > 0 ? 'PAM02' : deliveredError < 0 ? 'PPL103' : null;
    const current = this.valueConfig.maxReinforcementCurrent * Math.abs(deliveredError) / 2;
    if (!valueSignalAvailable && condition !== 'no-channel') return { grade, rootAssessment, childAssessment, actionPreference,
      taskEvidence, childStateValue, prediction, predictionPerspective: review.actor, error, deliveredError: 0,
      predictionContext, valueIdentity: this.valueIdentity, skipped: true, learningApplied: false,
      scope: 'No value teaching when a same-child, same-perspective provisional neural estimate is unavailable.' };
    const cue = this.encoder.encode(board, review.chosen, review.context.task);
    if (condition !== 'disabled' && channel) this.assertMemoryChannels([channel]);
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
      : this.observeMemory(channel ? [channel] : []);
    const fixedAfter = fixedStateHash(this.model, this.memory.edges);
    assert.equal(fixedAfter, fixedBefore, 'Graded teaching changed fixed wiring/parameters');
    return { schema: 'stockfish-value-feedback-receipt-v2', taskEvidence, grade,
      rootAssessment, childAssessment, actionPreference, childStateValue, prediction,
      predictionPerspective: review.actor, predictionContext, error,
      shuffle: condition === 'shuffled' ? {...structuredClone(shuffle),error:shuffledError} : null,
      context: structuredClone(review.context), teacherReview: structuredClone(review),
      valueIdentity: this.valueIdentity, valueConfig: this.valueConfig,
      condition, teachingSignal: 'stockfish-value-error',
      outcomeChannel, deliveredError, channel, current, cue, presentation, response,
      before, after: this.memory.snapshot(), fixedBefore, fixedAfter,
      local: { kc, factors: update.factors }, activityTrace, update,
      plasticityEnabled: condition !== 'disabled', learningApplied: update.changedEdges > 0,
      scope: 'Experimental full-game engine-target value learning via existing local physiology; not certified reasoning, calibrated evaluation or validated graded dose.' };
  }
}
