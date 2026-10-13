import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory, mapReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
function fixture() {
  const g = { row: Int32Array.from([0, 0, 0, 0, 2]), col: Int32Array.from([0, 1]), sign: Int8Array.from([1, 1]),
    initial: Float32Array.from([1, 1]), input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(g, { inputDim: 1, outputs: 1 });
  return { model, memory: new ReversalMemory(model, { groups: [{ edges: [0, 1], kc: [0, 1], dan: [{ index: 2 }] }] }), rest: new Float32Array(4) };
}
test('candidate depression and inactive-cue recovery match independent Euler recurrence with fixed wiring', () => {
  const { model, memory, rest } = fixture(), invariant = fixedStateHash(model, memory.edges);
  model.h[model.steps].set([1.5, 0, 1.5, 0]); memory.observe(rest);
  assert.equal(memory.gains[0], 0.5); assert.equal(memory.gains[1], 1);
  assert.deepEqual(model.signedMagnitude, Float32Array.from(model.graph.sign, (s, i) => s * model.params.magnitude[i]));
  // Other cue and DAN active: old inactive cue recovers; this is not omission.
  model.h[model.steps].set([0, 1.5, 1.5, 0]); memory.observe(rest);
  assert.equal(memory.gains[0], 0.75); assert.equal(memory.gains[1], 0.5);
  assert.deepEqual(model.signedMagnitude, Float32Array.from(model.graph.sign, (s, i) => s * model.params.magnitude[i]));
  assert.equal(fixedStateHash(model, memory.edges), invariant);
  assert.equal(model.graph.sign[0], 1);
});
test('absent DAN has no recovery; restored memory reproduces the next update and rejects corruption', () => {
  const a = fixture(), b = fixture();
  a.model.h[a.model.steps].set([1.5, 0, 1.5, 0]); a.memory.observe(a.rest);
  const saved = JSON.parse(JSON.stringify(a.memory.snapshot())); b.memory.restore(saved);
  for (const f of [a, b]) { f.model.h[f.model.steps].set([0, 1.5, 0, 0]); f.memory.observe(f.rest); }
  assert.equal(a.memory.gains[0], 0.5); assert.deepEqual(a.memory.snapshot(), b.memory.snapshot());
  const before = b.memory.snapshot(); assert.throws(() => b.memory.restore({ ...before, gains: [0, 1] }));
  assert.deepEqual(b.memory.snapshot(), before);
});
test('unstable and invalid local observations fail before changing persistent state', () => {
  const { model, memory, rest } = fixture(), before = memory.snapshot();
  model.h[model.steps].set([1.5, 0, 10, 0]); assert.throws(() => memory.observe(rest), /Unstable/);
  assert.deepEqual(memory.snapshot(), before);
  model.h[model.steps][2] = NaN; assert.throws(() => memory.observe(rest), /Nonfinite/);
  assert.deepEqual(memory.snapshot(), before);
});
test('candidate mapping recognizes released alpha-prime notation and excludes gamma inputs from PAM beta-prime mask', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'reversal-map-'));
  try {
    const ids = BigInt64Array.from(Array.from({ length: 12 }, (_, i) => 720575940600000000n + BigInt(i)));
    const types = ['KCg-m', "KCa'b'-ap1", 'KCg-m', "KCa'b'-ap2", 'MBON12', 'MBON12', 'MBON01', 'MBON01', 'PPL103', 'PPL103', 'PAM02', 'PAM02'];
    const side = ['left','left','right','right','left','right','left','right','left','right','left','right'];
    const path = join(folder, 'annotations.tsv');
    writeFileSync(path, 'root_id\themibrain_type\tcell_class\tside\n' + types.map((t,i) => `${ids[i]}\t${t}\t${i < 4 ? 'Kenyon_Cell' : i < 8 ? 'MBON' : 'DAN'}\t${side[i]}`).join('\n'));
    const g = { row: Int32Array.from([0,0,0,0,0,2,4,6,8,8,8,8,8]), col: Int32Array.from([0,1,2,3,0,1,2,3]), sign: new Int8Array(8).fill(1) };
    const mapped = await mapReversalMemory(g, ids, path);
    assert.equal(mapped.readyForCandidateExperiment, true);
    assert.deepEqual(mapped.groups.map(g => g.edges.length), [2,1,2,1]);
    assert.deepEqual(mapped.groups.filter(g => g.mbonType === 'MBON01').flatMap(g => g.kc), [1,3]);
    assert.equal(mapped.groups[0].dan[0].rootId, ids[8].toString());
  } finally { rmSync(folder, { recursive: true }); }
});
