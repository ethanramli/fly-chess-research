import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { AlphaOneMemory, combineAlphaOneMapping } from '../../src/neural-learning/alpha-one-memory.mjs';
import { AlphaLobeMemory, mapAlphaThree, combineAlphaLobeMapping, readAlphaLobeMBON } from '../../src/neural-learning/alpha-lobe-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';

// Neurons: 0,1 restrained KCs; 2 PAM02; 3 restrained MBON; 4,5 alpha/beta KCs; 6 PAM11; 7 MBON07; 8 PPL106; 9 MBON14.
// Edges 0,1: KC0,KC1 -> 3; edges 2,3: KC4,KC5 -> 7; edges 4,5: KC4,KC5 -> 9.
const graph = () => ({ row: Int32Array.from([0, 0, 0, 0, 2, 2, 2, 2, 4, 4, 6]), col: Int32Array.from([0, 1, 4, 5, 4, 5]),
  sign: new Int8Array(6).fill(1), initial: new Float32Array(6).fill(1), input: Int32Array.from([0]), output: Int32Array.from([3]) });
const restrained = { readyForCandidateExperiment: true, groups: [{ mbonType: 'MBON01', danType: 'PAM02', edges: [0, 1], kc: [0, 1], dan: [{ index: 2 }] }] };
const alphaOne = { schema: 'alpha-one-mapping-v1', readyForCandidateExperiment: true, readouts: { MBON07: [{ index: 7 }] },
  groups: [{ mbonType: 'MBON07', danType: 'PAM11', edges: [2, 3], kc: [4, 5], dan: [{ index: 6 }] }] };
const alphaThree = { schema: 'alpha-three-mapping-v1', readyForCandidateExperiment: true, readouts: { MBON14: [{ index: 9 }] },
  groups: [{ mbonType: 'MBON14', danType: 'PPL106', edges: [4, 5], kc: [4, 5], dan: [{ index: 8 }] }] };
function fixture() {
  const model = new SparseTrainer(graph(), { inputDim: 1, outputs: 1 });
  return { model, memory: new AlphaLobeMemory(model, combineAlphaLobeMapping(restrained, alphaOne, alphaThree)), rest: new Float32Array(10) };
}
const set = (model, values) => { model.h[model.steps].fill(0); for (const [i, v] of Object.entries(values)) model.h[model.steps][i] = v; };

test('alpha1 depresses only with PAM11 and alpha3 only with PPL106, each on active KCs; wiring stays fixed', () => {
  const f = fixture(), invariant = fixedStateHash(f.model, f.memory.edges);
  set(f.model, { 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5 }); f.memory.observe(f.rest);
  assert.deepEqual([...f.memory.alphaGains], [0.5, 1, 1, 1]);
  set(f.model, { 5: 1.5, 8: 1.5 }); const update = f.memory.observe(f.rest);
  assert.deepEqual([...f.memory.alphaGains], [0.5, 1, 1, 0.5]);
  assert.deepEqual(update.alphaDanTypes, ['PAM11', 'PPL106']);
  assert.equal(update.alphaChangedEdges, 1);
  assert.equal(fixedStateHash(f.model, f.memory.edges), invariant);
  assert.ok(Math.abs(f.model.params.magnitude[5] - f.memory.alphaBase[3] * 0.5) < 1e-6);
});

test('without PPL106 activity the restrained and alpha1 parts match the pinned AlphaOneMemory exactly', () => {
  const f = fixture(), refModel = new SparseTrainer(graph(), { inputDim: 1, outputs: 1 });
  const reference = new AlphaOneMemory(refModel, combineAlphaOneMapping(restrained, alphaOne)), rest = new Float32Array(10);
  for (const state of [{ 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5 }, { 1: 1.5, 2: 1.5, 5: 1.2, 6: 0.9 }, { 0: 0.4, 4: 0.7 }]) {
    set(f.model, state); f.memory.observe(f.rest); set(refModel, state); reference.observe(rest);
  }
  assert.deepEqual([...f.memory.restrained.gains], [...reference.restrained.gains]);
  assert.deepEqual([...f.memory.alphaGains.subarray(0, 2)], [...reference.alphaGains]);
  assert.deepEqual([...f.memory.alphaGains.subarray(2)], [1, 1]);
});

test('an alpha3 trace is not recovered by later PPL106 pulses on other KCs; repeats reach the floor', () => {
  const f = fixture();
  set(f.model, { 4: 1.5, 8: 1.5 }); f.memory.observe(f.rest);
  for (let i = 0; i < 10; i++) { set(f.model, { 5: 1.5, 8: 1.5 }); f.memory.observe(f.rest); }
  assert.equal(f.memory.alphaGains[2], 0.5);
  assert.equal(f.memory.alphaGains[3], 0.2);
});

test('snapshot restore reproduces the next update; corrupt or unstable input changes nothing', () => {
  const a = fixture(), b = fixture();
  set(a.model, { 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5, 8: 1.5 }); a.memory.observe(a.rest);
  b.memory.restore(JSON.parse(JSON.stringify(a.memory.snapshot())));
  for (const f of [a, b]) { set(f.model, { 1: 1.5, 2: 1.5, 5: 1.5, 8: 1.5 }); f.memory.observe(f.rest); }
  assert.deepEqual(a.memory.snapshot(), b.memory.snapshot());
  const before = b.memory.snapshot();
  assert.throws(() => b.memory.restore({ ...before, gains: before.gains.slice(1) }));
  assert.throws(() => b.memory.restore({ ...before, gains: [...before.gains.slice(0, 5), 0.1] }));
  set(b.model, { 4: 1.5, 8: 10 }); assert.throws(() => b.memory.observe(b.rest), /Unstable/);
  set(b.model, { 4: NaN, 8: 1.5 }); assert.throws(() => b.memory.observe(b.rest), /Nonfinite/);
  assert.deepEqual(b.memory.snapshot(), before);
});

test('alpha3 mapping keeps same-side alpha/beta KC inputs to MBON14 with PPL106; combine rejects bad input', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'alpha-three-map-'));
  try {
    const types = ['KCab-s', "KCa'b'-m", 'KCab-m', 'KCg-m', 'MBON14', 'MBON14', 'PPL106', 'PPL106'];
    const side = ['left', 'left', 'right', 'right', 'left', 'right', 'left', 'right'];
    const ids = BigInt64Array.from(types.map((_, i) => 720575940600000000n + BigInt(i)));
    const path = join(folder, 'annotations.tsv');
    writeFileSync(path, 'root_id\themibrain_type\tcell_class\tside\n' + types.map((t, i) => `${ids[i]}\t${t}\t${i < 4 ? 'Kenyon_Cell' : i < 6 ? 'MBON' : 'DAN'}\t${side[i]}`).join('\n'));
    const g = { row: Int32Array.from([0, 0, 0, 0, 0, 2, 4, 4, 4]), col: Int32Array.from([0, 1, 2, 3]), sign: new Int8Array(4).fill(1) };
    const mapped = await mapAlphaThree(g, ids, path);
    assert.equal(mapped.schema, 'alpha-three-mapping-v1');
    assert.equal(mapped.readyForCandidateExperiment, true);
    assert.deepEqual(mapped.groups.map(x => [x.side, x.mbonType, x.danType, x.kc, x.dan.map(c => c.index)]),
      [['left', 'MBON14', 'PPL106', [0], [6]], ['right', 'MBON14', 'PPL106', [2], [7]]]);
    assert.equal(mapped.excluded.unsupportedKCType, 2);
    assert.throws(() => combineAlphaLobeMapping(restrained, alphaOne, { ...alphaThree, schema: 'alpha-one-mapping-v1' }), /Incomplete/);
    assert.throws(() => combineAlphaLobeMapping({ ...restrained, groups: alphaThree.groups }, alphaOne, alphaThree), /already/);
    assert.throws(() => combineAlphaLobeMapping(restrained, alphaOne, { ...alphaThree, groups: alphaOne.groups }), /Mislabelled/);
    assert.throws(() => new AlphaLobeMemory(new SparseTrainer(graph(), { inputDim: 1, outputs: 1 }), combineAlphaOneMapping(restrained, alphaOne)), /Missing/);
  } finally { rmSync(folder, { recursive: true }); }
});

test('alpha-lobe readout subtracts MBON07 and adds MBON14', () => {
  const r = readAlphaLobeMBON({ MBON12: [0.4], MBON01: [0.1], MBON07: [0.2, 0.4], MBON14: [0.5] });
  assert.ok(Math.abs(r.restrainedScore - 0.3) < 1e-12 && Math.abs(r.score - 0.5) < 1e-12);
  assert.throws(() => readAlphaLobeMBON({ MBON12: [1], MBON01: [1], MBON07: [1] }));
});
