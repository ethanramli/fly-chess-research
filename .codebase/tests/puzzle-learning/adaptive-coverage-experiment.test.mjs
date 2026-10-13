import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { runAdaptiveCoverage } from '../../src/puzzle-learning/adaptive-coverage-experiment.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';

test('adaptive experiment resumes pending updates exactly once and matches control experiences', async () => {
  const row = { id: 'numeric', group: 'fixture', split: 'fixture', objective: 'forced-mate', plies: 1,
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1' };
  const p = { maxPuzzles: 1, attemptsPerPuzzle: 2, seed: 9,
    conditions: ['adaptive', 'fixed', 'absent', 'shuffled', 'disabled'], fixedPlans: [{ path: 'fixed' }],
    verification: { maxNodes: 4096, milliseconds: 2000 },
    search: { simulations: 1, maxEvaluations: 1, maxDepth: 1, maxNodes: 128, milliseconds: 2000 } };
  let value = 0, updates = 0;
  const brain = { presentations: 0,
    memory: { snapshot: () => ({ value }), restore: s => { value = s.value; } },
    memoryFingerprint: () => String(value),
    assess: async (board, moves) => {
      brain.presentations += moves.length;
      assert.equal(moves.length, board.moves().length);
      return { choice: value ? 'f7h7' : 'f7f6', memoryFingerprint: String(value),
        rows: moves.map(m => ({ move: m.from + m.to, score: 0 })) };
    },
    replay: async (experience, { channel, plasticityEnabled }) => {
      updates++; brain.presentations++;
      if (channel && plasticityEnabled) value++;
      return { experience, channel, plasticityEnabled };
    },
    evaluate: async (board, moves) => ({ priors: moves.map(() => 1 / moves.length), value: 0 }),
  };
  const storage = new Map();
  storage.set('fixed', { experiences: [reviewCommittedChoice(new Chess(row.fen), 'f7h7', row)] });
  let state = { naive: { value: 0 }, memory: { value: 0 }, presentations: 0,
    conditionIndex: 0, totalAttempts: 0, active: null, results: [] };
  let saved, interrupt = true;
  const save = async s => {
    saved = structuredClone(s);
    if (interrupt && s.active?.phase === 'receipt') { interrupt = false; throw Error('simulated interruption after update'); }
  };
  const publish = async (path, data) => { storage.set(path, structuredClone(data)); return { path }; };
  const load = async ref => structuredClone(storage.get(ref.path));
  await assert.rejects(runAdaptiveCoverage({ brain, rows: [row], protocol: p, state, save, publish, load }), /simulated interruption/);
  assert.equal(updates, 1); assert.equal(saved.active.phase, 'receipt');
  state = saved; brain.memory.restore(state.memory); brain.presentations = state.presentations;
  const result = await runAdaptiveCoverage({ brain, rows: [row], protocol: p, state, save, publish, load });
  assert.equal(result.complete, true); assert.equal(updates, 10); assert.equal(state.totalAttempts, 10);
  assert.equal(state.shuffleIdentifiable, true);
  const adaptive = await Promise.all(state.results[0].eventRefs.map(load));
  assert.deepEqual(adaptive.map(e => e.experience.status), ['failure', 'success']);
  for (const condition of ['absent', 'shuffled', 'disabled']) {
    const events = await Promise.all(state.results.find(r => r.condition === condition).eventRefs.map(load));
    assert.deepEqual(events.map(e => e.experience), adaptive.map(e => e.experience));
  }
  assert.equal((await load(state.baselineRefs[0])).assessment.choice, 'f7f6');
  assert.equal((await load(state.results[0].panelRefs[0])).after.assessment.choice, 'f7h7');
  assert.equal((await load(state.results.find(r => r.condition === 'disabled').panelRefs[0])).after.assessment.choice, 'f7f6');
});
