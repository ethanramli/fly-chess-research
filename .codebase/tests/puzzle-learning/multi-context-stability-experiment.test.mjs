import test from 'node:test';
import assert from 'node:assert/strict';
import { runMultiContextStability } from '../../src/puzzle-learning/multi-context-stability-experiment.mjs';

function fixture({ forget = false } = {}) {
  const rows = [
    { id: 'right', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', bad: 'f7f6', good: 'f7h7' },
    { id: 'left', fen: 'k7/2Q5/1K6/8/8/8/8/8 w - - 0 1', bad: 'c7c6', good: 'c7a7' },
  ].map(r => ({ ...r, group: 'software-fixture', split: 'fixture', objective: 'forced-mate', plies: 1 }));
  let memory = [], calls = 0; const records = new Map();
  const brain = { presentations: 0,
    memory: { snapshot: () => [...memory], restore: value => { memory = [...value]; } },
    async assess(board, moves) {
      const row = rows.find(r => r.fen === board.fen()); assert.ok(row);
      const choice = memory.includes(row.id) ? row.good : row.bad; brain.presentations += moves.length;
      return { choice, rows: moves.map(m => ({ move: m.from + m.to + (m.promotion ?? ''),
        score: m.from + m.to === choice ? 1 : 0 })) };
    },
    async replay(experience, { channel, plasticityEnabled }) {
      calls++; brain.presentations++;
      if (channel === 'PAM02' && plasticityEnabled && experience.status === 'success') {
        const row = rows.find(r => r.fen === experience.context.fen);
        memory = forget ? [row.id] : [...memory, row.id];
      }
      return { channel, plasticityEnabled };
    },
  };
  return { brain, rows, successMoves: rows.map(r => r.good), calls: () => calls,
    protocol: { conditions: ['informative', 'absent', 'shuffled', 'disabled'], maxContextSlots: 4,
      shuffleSeed: 0, verification: { maxNodes: 4096, milliseconds: 2000 } },
    state: { naive: [], memory: [], conditionIndex: 0, totalEvents: 0, active: null, results: [] },
    publish: async (path, value) => { records.set(path, structuredClone(value)); return { path }; },
    load: async ref => structuredClone(records.get(ref.path)) };
}

test('shared memory learns two contexts, retains the first, and resumes second-context update exactly once', async () => {
  const f = fixture(); let saved, interrupted = false;
  const save = async state => {
    saved = structuredClone(state);
    if (!interrupted && state.active?.phase === 'receipt' && state.active.pending.rowId === 'left') {
      interrupted = true; throw Error('second-context interruption');
    }
  };
  await assert.rejects(runMultiContextStability({ ...f, save }), /second-context interruption/);
  assert.equal(f.calls(), 3);
  const result = await runMultiContextStability({ ...f, state: saved, save });
  assert.equal(result.complete, true); assert.equal(f.calls(), 16);
  const learned = await f.load(saved.results[0].resultRef);
  assert.deepEqual(learned.after.map(p => p.review.status), ['success', 'success']);
  assert.deepEqual(learned.reset.map(p => p.review.status), ['failure', 'failure']);
  assert.equal(learned.stoppedBy, 'pair-budget');
  const informative = await Promise.all(saved.informativeEventRefs.map(f.load));
  assert.deepEqual(informative.map(e => e.rowId), ['right', 'right', 'left', 'left']);
  for (const condition of ['absent', 'shuffled', 'disabled']) {
    const r = saved.results.find(r => r.condition === condition);
    const events = await Promise.all(r.eventRefs.map(f.load));
    assert.deepEqual(events.map(e => [e.rowId, e.experience]), informative.map(e => [e.rowId, e.experience]));
  }
});

test('an unresolved context supplies no teaching event', async () => {
  const f = fixture(); f.rows = f.rows.map(r => ({ ...r, plies: 7 }));
  f.protocol.verification.maxNodes = 1;
  const result = await runMultiContextStability({ ...f, save: async () => {} });
  assert.equal(result.complete, true); assert.equal(f.calls(), 0);
  assert.deepEqual(result.state.memory, []);
});

test('repairing the latest context while forgetting the earlier one never reports joint success', async () => {
  const f = fixture({ forget: true });
  const result = await runMultiContextStability({ ...f, save: async () => {} });
  const learned = await f.load(result.state.results[0].resultRef);
  assert.equal(learned.stoppedBy, 'pair-budget');
  assert.deepEqual(learned.after.map(p => p.review.status), ['failure', 'success']);
  assert.equal(learned.eventRefs.length, 8);
});
