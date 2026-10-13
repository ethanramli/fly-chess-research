import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { planPuzzleExperience, experienceBoard } from '../../src/puzzle-learning/puzzle-experience-plan.mjs';

const row = { id: 'fixture', group: 'fixture-family', split: 'fixture',
  fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', objective: 'forced-mate', plies: 1 };
const options = { search: { simulations: 8, maxDepth: 1, maxEvaluations: 2, milliseconds: 10000 } };
const policy = { memoryFingerprint: () => 'frozen', evaluate: async (_board, moves, task) => {
  assert.deepEqual(Object.keys(task).sort(), ['objective', 'plies']);
  return { priors: moves.map(() => 1), value: 0 };
} };

test('plans use public task only and provide independently checked experiences after commitment', async () => {
  const traces = [];
  const plan = await planPuzzleExperience(policy, { ...row, solution: 'hidden-answer', label: 999 },
    { ...options, onTrace: async t => { traces.push(t); t.moves.length = 0; } });
  assert.equal(plan.policyCalls, 1);
  assert.equal(plan.traces.length, 8);
  assert.ok(plan.traces.every(t => t.moves.length === 1));
  assert.ok(plan.experiences.length > 0);
  assert.ok(plan.experiences.every(e => e.context.task.plies === 1 && e.proof.certificateCheck.verified));
  assert.equal(plan.memoryFingerprint, 'frozen');
  assert.equal(plan.taskProof.status, 'success');
});

test('planning rejects persistent learning and board mutation inside the policy', async () => {
  let memory = 'before';
  await assert.rejects(planPuzzleExperience({ memoryFingerprint: () => memory,
    evaluate: async (_board, moves) => { memory = 'changed'; return { priors: moves.map(() => 1), value: 0 }; }
  }, row, options), /Learning occurred/);
  await assert.rejects(planPuzzleExperience({ ...policy, evaluate: async (board, moves) => {
    board.move(moves[0]); return { priors: moves.map(() => 1), value: 0 };
  } }, row, options), /changed hypothetical/);
});

test('training/fixture boundary, full task history and bounded traces are enforced', async () => {
  for (const split of ['test', 'validation', undefined]) assert.throws(() => experienceBoard({ ...row, split }));
  const b = new Chess(); for (const move of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) b.move(move);
  const restored = experienceBoard({ ...row, fen: b.fen(), pgn: b.pgn() });
  assert.equal(restored.pgn(), b.pgn());
  assert.throws(() => experienceBoard({ ...row, pgn: b.pgn() }), /disagree/);
  await assert.rejects(planPuzzleExperience(policy, row, { ...options, maxTraceRecords: 4 }), /budget/);
});

test('unresolved consequences produce no replay teaching events', async () => {
  const plan = await planPuzzleExperience(policy, { ...row, fen: new Chess().fen(), plies: 3 },
    { ...options, review: { maxProofNodes: 1, nodesPerCandidate: 1 } });
  assert.equal(plan.experiences.length, 0);
  assert.ok(plan.unknownReviewed > 0);
  assert.equal(plan.taskProof.status, 'unknown');
});
