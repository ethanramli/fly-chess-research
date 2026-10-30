import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { AlphaOneMemory, mapAlphaOne, combineAlphaOneMapping, readAlphaOneMBON } from '../../src/neural-learning/alpha-one-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';

// Neurons: 0,1 restrained KCs; 2 PAM02; 3 restrained MBON; 4,5 alpha/beta KCs; 6 PAM11; 7 MBON07.
// Edges 0,1: KC0,KC1 -> 3; edges 2,3: KC4,KC5 -> 7.
function fixture() {
  const g = { row: Int32Array.from([0, 0, 0, 0, 2, 2, 2, 2, 4]), col: Int32Array.from([0, 1, 4, 5]), sign: Int8Array.from([1, 1, 1, 1]),
    initial: Float32Array.from([1, 1, 1, 1]), input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(g, { inputDim: 1, outputs: 1 });
  const restrained = { readyForCandidateExperiment: true, groups: [{ mbonType: 'MBON01', danType: 'PAM02', edges: [0, 1], kc: [0, 1], dan: [{ index: 2 }] }] };
  const alpha = { schema: 'alpha-one-mapping-v1', readyForCandidateExperiment: true, readouts: { MBON07: [{ index: 7 }] },
    groups: [{ mbonType: 'MBON07', danType: 'PAM11', edges: [2, 3], kc: [4, 5], dan: [{ index: 6 }] }] };
  const mapping = combineAlphaOneMapping(restrained, alpha);
  return { model, restrained, mapping, memory: new AlphaOneMemory(model, mapping), rest: new Float32Array(8) };
}
const set = (f, values) => { f.model.h[f.model.steps].fill(0); for (const [i, v] of Object.entries(values)) f.model.h[f.model.steps][i] = v; };

test('restrained part is exactly ReversalMemory on the restrained groups; alpha1 depresses only active KCs with PAM11', () => {
  const f = fixture(), reference = new ReversalMemory(new SparseTrainer(f.model.graph, { inputDim: 1, outputs: 1 }), f.restrained);
  const invariant = fixedStateHash(f.model, f.memory.edges);
  for (const state of [{ 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5 }, { 1: 1.5, 2: 1.5, 5: 1.5, 6: 1.5 }]) {
    set(f, state); f.memory.observe(f.rest);
    reference.model.h[reference.model.steps].set(f.model.h[f.model.steps].subarray(0, 8)); reference.observe(new Float32Array(8));
    assert.deepEqual([...f.memory.restrained.gains], [...reference.gains]);
  }
  // D = -1, k = 1, eta 0.5: each alpha1 edge depressed once to 0.5 and never recovered.
  assert.deepEqual([...f.memory.alphaGains], [0.5, 0.5]);
  assert.equal(fixedStateHash(f.model, f.memory.edges), invariant);
  assert.ok(Math.abs(f.model.params.magnitude[2] - f.memory.alphaBase[0] * 0.5) < 1e-6);
});

test('later PAM11 pulses on other KCs leave an alpha1 trace intact while the restrained trace recovers', () => {
  const f = fixture();
  set(f, { 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5 }); f.memory.observe(f.rest);
  const restrainedTrace = f.memory.restrained.gains[0];
  for (let i = 0; i < 10; i++) { set(f, { 1: 1.5, 2: 1.5, 5: 1.5, 6: 1.5 }); f.memory.observe(f.rest); }
  assert.ok(f.memory.restrained.gains[0] > restrainedTrace);
  assert.equal(f.memory.alphaGains[0], 0.5);
  assert.equal(f.memory.alphaGains[1], 0.2, 'repeated pulses on one cue depress it to the floor');
});

test('without PAM11 activity alpha1 does not change, even when PAM02 teaches', () => {
  const f = fixture();
  set(f, { 0: 1.5, 2: 1.5, 4: 1.5 }); f.memory.observe(f.rest);
  assert.deepEqual([...f.memory.alphaGains], [1, 1]);
  assert.equal(f.memory.restrained.gains[0], 0.5);
});

test('snapshot restore reproduces the next update; corrupt or unstable input changes nothing', () => {
  const a = fixture(), b = fixture();
  set(a, { 0: 1.5, 2: 1.5, 4: 1.5, 6: 1.5 }); a.memory.observe(a.rest);
  b.memory.restore(JSON.parse(JSON.stringify(a.memory.snapshot())));
  for (const f of [a, b]) { set(f, { 1: 1.5, 2: 1.5, 5: 1.5, 6: 1.5 }); f.memory.observe(f.rest); }
  assert.deepEqual(a.memory.snapshot(), b.memory.snapshot());
  const before = b.memory.snapshot();
  assert.throws(() => b.memory.restore({ ...before, gains: before.gains.slice(1) }));
  assert.throws(() => b.memory.restore({ ...before, gains: [...before.gains.slice(0, 3), 0.1] }));
  set(b, { 0: 1.5, 6: 10 }); assert.throws(() => b.memory.observe(b.rest), /Unstable/);
  set(b, { 0: 1.5, 4: NaN, 6: 1.5 }); assert.throws(() => b.memory.observe(b.rest), /Nonfinite/);
  assert.deepEqual(b.memory.snapshot(), before);
});

test('mapping keeps same-side alpha/beta KC inputs to MBON07 with PAM11; combine rejects duplicates', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'alpha-one-map-'));
  try {
    const types = ['KCab-s', "KCa'b'-m", 'KCab-m', 'KCg-m', 'MBON07', 'MBON07', 'PAM11', 'PAM11'];
    const side = ['left', 'left', 'right', 'right', 'left', 'right', 'left', 'right'];
    const ids = BigInt64Array.from(types.map((_, i) => 720575940600000000n + BigInt(i)));
    const path = join(folder, 'annotations.tsv');
    writeFileSync(path, 'root_id\themibrain_type\tcell_class\tside\n' + types.map((t, i) => `${ids[i]}\t${t}\t${i < 4 ? 'Kenyon_Cell' : i < 6 ? 'MBON' : 'DAN'}\t${side[i]}`).join('\n'));
    // MBON07 left (4) <- KC0, KC1; MBON07 right (5) <- KC2, KC3.
    const g = { row: Int32Array.from([0, 0, 0, 0, 0, 2, 4, 4, 4]), col: Int32Array.from([0, 1, 2, 3]), sign: new Int8Array(4).fill(1) };
    const mapped = await mapAlphaOne(g, ids, path);
    assert.equal(mapped.readyForCandidateExperiment, true);
    assert.deepEqual(mapped.groups.map(x => [x.side, x.kc, x.dan.map(c => c.index)]), [['left', [0], [6]], ['right', [2], [7]]]);
    assert.equal(mapped.excluded.unsupportedKCType, 2);
    assert.equal(mapped.readouts.MBON07.length, 2);
    const restrained = { readyForCandidateExperiment: true, groups: [] };
    assert.throws(() => combineAlphaOneMapping({ ...restrained, groups: mapped.groups }, mapped), /already/);
  } finally { rmSync(folder, { recursive: true }); }
});

test('alpha1 readout subtracts the reward-depressed MBON07 drive', () => {
  const r = readAlphaOneMBON({ MBON12: [0.4], MBON01: [0.1], MBON07: [0.2, 0.4] });
  assert.ok(Math.abs(r.restrainedScore - 0.3) < 1e-12 && Math.abs(r.score - 0) < 1e-12);
  assert.throws(() => readAlphaOneMBON({ MBON12: [1], MBON01: [1] }));
});
