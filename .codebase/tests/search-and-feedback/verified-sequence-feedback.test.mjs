import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { createVerifiedSequenceReplaySchedule } from '../../src/search-and-feedback/verified-sequence-feedback.mjs';

function fixture() {
  const board = new Chess('4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1');
  const task = { objective: 'forced-mate', plies: 3 };
  function experience(move, role) {
    const successor = new Chess(board.fen()); successor.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    const proof = certifyMate(successor, 'w', { plies: 2, maxNodes: 4096, milliseconds: 2000 });
    return { ...verifiedExperience(board, move, task, proof), proof, role,
      context: { fen: board.fen(), pgn: board.pgn(), task } };
  }
  const committed = experience('f1f7', 'committed-choice');
  const alternative = experience('f1f8', 'teacher-counterfactual');
  assert.equal(committed.status, 'failure'); assert.equal(alternative.status, 'success');
  const extraRoots = ['g6f7', 'h5h6'].map(move => experience(move, 'teacher-counterfactual'));
  assert.ok(extraRoots.every(event => event.status === 'failure'));
  return { board, task, committed, alternative,
    plan: { schema: 'puzzle-experience-plan-v1', task: { id: 'fixture', family: 'dev', split: 'fixture',
      fen: board.fen(), pgn: board.pgn(), ...task }, consequence: { chosen: committed.move,
      outcome: { avoidableMiss: true } }, experiences: [committed, alternative, ...extraRoots] } };
}

test('sequence replays replace root reviews within the same fixed experience budget', () => {
  const { plan, task } = fixture();
  const expanded = createVerifiedSequenceReplaySchedule(plan);
  assert.equal(expanded.sequenceFeedback.applied, true);
  assert.equal(expanded.sequenceFeedback.experienceBudget, 4);
  assert.equal(expanded.experiences.length, 4);
  assert.equal(expanded.sequenceFeedback.rootExperienceCount, 2);
  assert.equal(expanded.sequenceFeedback.additionalExperiences, 2);
  assert.deepEqual(expanded.experiences.slice(0, 2).map(event => event.move), ['f1f7', 'f1f8']);
  assert.ok(expanded.experiences.some(event => event.move === 'h5h7'
    && event.role === 'verified-sequence-replay' && event.status === 'success'
    && event.context.task.plies === 1
    && event.sequenceFeedback.precedingMoves.join(' ') === 'f1f8 e8f8'));
  assert.ok(expanded.experiences.some(event => event.move === 'f7f6'
    && event.role === 'verified-sequence-replay' && event.status === 'failure'));
  assert.equal(expanded.sequenceFeedback.omittedRootExperiences.length, 2);
  for (const event of expanded.experiences.slice(2)) {
    const context = new Chess(); context.loadPgn(event.context.pgn);
    const checked = verifiedExperience(context, event.move, event.context.task, event.proof);
    assert.equal(checked.status, event.status); assert.equal(checked.certificateSha256, event.certificateSha256);
    assert.equal(event.actor, 'w');
  }
  assert.equal(plan.experiences.length, 4, 'Planning must not mutate the original record-only plan');
  assert.ok(expanded.experiences.every(event => event.learningAllowed));
});

test('no avoidable verified contrast, unknowns, or malformed bounds produce sequence teaching', () => {
  const { plan } = fixture();
  const noMiss = createVerifiedSequenceReplaySchedule({ ...plan,
    consequence: { ...plan.consequence, outcome: { avoidableMiss: false } } });
  assert.equal(noMiss.sequenceFeedback.applied, false); assert.equal(noMiss.experiences.length, 4);
  const noPositive = createVerifiedSequenceReplaySchedule({ ...plan,
    experiences: [plan.experiences[0], { ...plan.experiences[1], status: 'unknown', learningAllowed: false }] });
  assert.equal(noPositive.sequenceFeedback.applied, false); assert.equal(noPositive.experiences.length, 2);
  assert.throws(() => createVerifiedSequenceReplaySchedule(plan, { maxTotalExperiences: 1 }), /bounds/);
  assert.throws(() => createVerifiedSequenceReplaySchedule(plan, { maxTotalExperiences: 3 }), /budget/);
});
