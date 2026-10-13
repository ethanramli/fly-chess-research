import test from 'node:test';
import assert from 'node:assert/strict';
import { runContrastiveCoverage } from '../../src/puzzle-learning/contrastive-coverage-experiment.mjs';

function fixture({ plies = 1, maxNodes = 4096 } = {}) {
  const row = { id: 'software-fixture', group: 'fixture', split: 'fixture',
    objective: 'forced-mate', plies, fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1' };
  const protocol = { conditions: ['informative', 'absent', 'shuffled', 'disabled'],
    maxPairs: 3, shuffleSeed: 0, verification: { maxNodes, milliseconds: 2000 } };
  let memory = { reviewed: [], positive: 0 }, replayCalls = 0;
  const wrong = ['f7f6', 'f7e7'];
  const brain = { presentations: 0,
    memory: { snapshot: () => structuredClone(memory), restore: value => { memory = structuredClone(value); } },
    assess: async (board, moves) => {
      assert.equal(moves.length, board.moves().length, 'Every legal move stays available');
      const choice = wrong.find(move => !memory.reviewed.includes(move))
        ?? (memory.positive >= 2 ? 'f7h7' : wrong[0]);
      brain.presentations += moves.length;
      return { choice, rows: moves.map(move => ({ move: move.from + move.to + (move.promotion ?? ''),
        score: move.from + move.to === choice ? 1 : 0 })) };
    },
    replay: async (experience, { channel, plasticityEnabled }) => {
      replayCalls++; brain.presentations++;
      assert.equal(experience.learningAllowed, true);
      if (plasticityEnabled && channel === 'PPL103' && experience.status === 'failure')
        memory.reviewed.push(experience.move);
      if (plasticityEnabled && channel === 'PAM02' && experience.status === 'success') memory.positive++;
      return { channel, plasticityEnabled };
    },
  };
  const storage = new Map();
  const publish = async (path, value) => { storage.set(path, structuredClone(value)); return { path }; };
  const load = async ref => structuredClone(storage.get(ref.path));
  const state = { naive: brain.memory.snapshot(), memory: brain.memory.snapshot(),
    conditionIndex: 0, totalEvents: 0, active: null, results: [] };
  return { brain, row, protocol, state, publish, load, storage,
    successMove: 'f7h7', replayCalls: () => replayCalls };
}

test('current all-legal failures are reviewed in paired feedback and controls replay the exact adaptive sequence', async () => {
  const f = fixture(); let saved, interrupted = false;
  const save = async state => {
    saved = structuredClone(state);
    if (!interrupted && state.active?.phase === 'receipt') {
      interrupted = true; throw Error('interrupted after persistent update');
    }
  };
  await assert.rejects(runContrastiveCoverage({ ...f, save }), /interrupted after persistent update/);
  assert.equal(f.replayCalls(), 1); assert.equal(saved.active.phase, 'receipt');
  const result = await runContrastiveCoverage({ ...f, state: saved, save });
  assert.equal(result.complete, true); assert.equal(f.replayCalls(), 16);
  assert.equal(saved.totalEvents, 16); assert.equal(saved.shuffleIdentifiable, true);
  const informative = await Promise.all(saved.informativeEventRefs.map(f.load));
  assert.deepEqual(informative.map(e => [e.experience.move, e.experience.status]), [
    ['f7f6', 'failure'], ['f7h7', 'success'], ['f7e7', 'failure'], ['f7h7', 'success'],
  ]);
  for (const condition of ['absent', 'shuffled', 'disabled']) {
    const current = saved.results.find(r => r.condition === condition);
    const events = await Promise.all(current.eventRefs.map(f.load));
    assert.deepEqual(events.map(e => e.experience), informative.map(e => e.experience));
  }
  const learned = await f.load(saved.results[0].resultRef);
  assert.equal(learned.after.review.status, 'success');
  assert.equal(learned.stoppedBy, 'verified-unaided-success');
  assert.equal(learned.rankingRefs.length, 4);
  const disabled = await f.load(saved.results.find(r => r.condition === 'disabled').resultRef);
  assert.deepEqual(disabled.learned, saved.naive); assert.equal(disabled.after.review.status, 'failure');
});

test('unknown current-choice verification stops without supplying any teaching event', async () => {
  const f = fixture({ plies: 7, maxNodes: 1 });
  const result = await runContrastiveCoverage({ ...f, save: async () => {} });
  assert.equal(result.complete, true); assert.equal(f.replayCalls(), 0);
  assert.equal(result.state.shuffleIdentifiable, false);
  assert.equal((await f.load(result.state.results[0].resultRef)).stoppedBy, 'unknown-current-choice');
  assert.deepEqual(result.state.memory, result.state.naive);
});
