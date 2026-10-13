import test from 'node:test';
import assert from 'node:assert/strict';
import { createDualValenceInterface, dualValenceSchedule } from '../../src/neural-learning/dual-valence-interface.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';

// Numerical identities only; anatomical root verification belongs to the runner.
const mapping = { readyForCandidateExperiment: true, groups: ['left', 'right'].flatMap((side, i) =>
  ['PAM02', 'PPL103'].map((danType, j) => ({ side, danType, kc: [i], edges: [i * 2 + j],
    dan: [{ index: 2 + i * 2 + j, rootId: String(100 + i * 2 + j) }] }))) };

test('dual interface stimulates only the selected identified population and preserves cue/mapping', () => {
  const original = JSON.stringify(mapping), cue = [{ index: 0, current: 1.5 }];
  const interface_ = createDualValenceInterface(mapping);
  for (const channel of [null, 'PAM02', 'PPL103']) {
    const r = interface_.present(cue, channel);
    assert.deepEqual(r.stimulation.slice(0, 1), cue);
    assert.deepEqual(r.stimulation.slice(1).map(c => c.index), channel === null ? [] : interface_.populations[channel].map(c => c.index));
    r.stimulation[0].current = 0.1;
    assert.equal(cue[0].current, 1.5);
  }
  assert.equal(JSON.stringify(mapping), original);
  assert.throws(() => interface_.present(cue, 'dopamine'));
  assert.throws(() => interface_.present([{ index: 2, current: 1.5 }], 'PAM02'));
  assert.throws(() => createDualValenceInterface({ ...mapping, groups: mapping.groups.slice(1) }));
});

test('reversal swaps cue valence, both populations are phase-count matched, and controls preserve exposure', () => {
  const config = { seed: 15013, initialPunished: 'A' };
  const schedules = Object.fromEntries(['informative', 'punishment-only', 'absent', 'shuffled', 'disabled']
    .map(condition => [condition, dualValenceSchedule({ ...config, condition })]));
  const exposures = rows => rows.map(({ deliveredChannel, ...row }) => row);
  for (const rows of Object.values(schedules)) assert.deepEqual(exposures(rows), exposures(schedules.informative));
  for (const phase of ['acquisition', 'reversal']) for (const channel of ['PAM02', 'PPL103']) {
    const count = rows => rows.filter(r => r.phase === phase && r.deliveredChannel === channel).length;
    assert.equal(count(schedules.informative), count(schedules.shuffled));
  }
  assert.ok(schedules.absent.every(r => r.deliveredChannel === null));
  assert.ok(schedules['punishment-only'].every(r => r.deliveredChannel === (r.expectedChannel === 'PPL103' ? 'PPL103' : null)));
  assert.deepEqual(schedules.disabled, schedules.informative);
  assert.equal(schedules.informative[0].punished, 'A');
  assert.equal(schedules.informative[4].punished, 'B');
  assert.throws(() => dualValenceSchedule({ ...config, condition: 'informative', reversalTrials: 3 }));
});

test('identified channel activity changes the corresponding local memory and opposite preference directions in a numerical circuit', () => {
  // Eight-cell numerical circuit, no fly anatomical claim.
  const graph = { row: Int32Array.from([0, 0, 0, 0, 0, 0, 0, 2, 4]),
    col: Int32Array.from([0, 1, 0, 1]), sign: Int8Array.from([1, 1, 1, 1]),
    initial: Float32Array.from([1, 1, 1, 1]), input: Int32Array.from([0]), output: Int32Array.from([7]) };
  const groups = ['left', 'right'].flatMap((side, i) => [
    { side, danType: 'PAM02', kc: [i], edges: [2 + i], dan: [{ index: 2 + i * 2, rootId: String(100 + i * 2) }] },
    { side, danType: 'PPL103', kc: [i], edges: [i], dan: [{ index: 3 + i * 2, rootId: String(101 + i * 2) }] }]);
  const mapped = { readyForCandidateExperiment: true, groups }, cue = [{ index: 0, current: 1.5 }];
  for (const channel of ['PAM02', 'PPL103']) {
    const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1 });
    const memory = new ReversalMemory(model, mapped), interface_ = createDualValenceInterface(mapped);
    model.forward([0]); const rest = Float32Array.from(model.h[model.steps]), invariant = fixedStateHash(model, memory.edges);
    model.forward([0], cue); const baseline = model.h[model.steps][6] - model.h[model.steps][7];
    model.forward([0], interface_.present(cue, channel).stimulation);
    memory.observe(rest);
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].danType !== channel) assert.equal(memory.gains[g], 1);
    }
    model.forward([0], cue); const learned = model.h[model.steps][6] - model.h[model.steps][7];
    assert.ok(channel === 'PAM02' ? learned > baseline : learned < baseline);
    assert.equal(fixedStateHash(model, memory.edges), invariant);
  }
});
