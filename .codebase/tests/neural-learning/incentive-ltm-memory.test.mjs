import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { IncentiveLtmMemory, mapIncentiveLtm, readIncentiveMBON } from '../../src/neural-learning/incentive-ltm-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';

// Neurons: 0,1 KCs; 2 DAN; 3 restrained MBON; 4 LTM MBON. Edges 0,1 KC->3; 2,3 KC->4.
function fixture(ltmRatio = 0.3) {
  const g = { row: Int32Array.from([0, 0, 0, 0, 2, 4]), col: Int32Array.from([0, 1, 0, 1]), sign: Int8Array.from([1, 1, 1, 1]),
    initial: Float32Array.from([1, 1, 1, 1]), input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(g, { inputDim: 1, outputs: 1 });
  const mapping = { groups: [{ edges: [0, 1], kc: [0, 1], dan: [{ index: 2 }] }] };
  const ltm = { schema: 'incentive-ltm-mapping-v1', readyForCandidateExperiment: true, groups: [{ edges: [2, 3], kc: [0, 1], dan: [{ index: 2 }] }] };
  return { model, mapping, ltm, memory: new IncentiveLtmMemory(model, mapping, ltm, { ltmRatio }), rest: new Float32Array(5) };
}

test('restrained part is exactly ReversalMemory; LTM potentiates active cues and leaves untouched cues at rest', () => {
  const f = fixture(), reference = new ReversalMemory(new SparseTrainer(f.model.graph, { inputDim: 1, outputs: 1 }), f.mapping);
  const invariant = fixedStateHash(f.model, f.memory.edges);
  for (const state of [[1.5, 0, 1.5, 0, 0], [0, 1.5, 1.5, 0, 0]]) {
    f.model.h[f.model.steps].set(state); f.memory.observe(f.rest);
    reference.model.h[reference.model.steps].set(state); reference.observe(new Float32Array(5));
    assert.deepEqual([...f.memory.restrained.gains], [...reference.gains]);
  }
  // Step 1: delta = 0.3, KC0 active: 1 + 0.5*0.3*(1+1-1) = 1.15; KC1 inactive at rest: unchanged.
  // Step 2: KC1 active: 1.15; KC0 inactive above rest saturates: 1.15 + 0.15*0.15.
  assert.ok(Math.abs(f.memory.ltmGains[0] - (1.15 + 0.15 * 0.15)) < 1e-12);
  assert.ok(Math.abs(f.memory.ltmGains[1] - 1.15) < 1e-12);
  assert.equal(fixedStateHash(f.model, f.memory.edges), invariant);
  assert.ok(Math.abs(f.model.params.magnitude[2] - f.memory.ltmBase[0] * f.memory.ltmGains[0]) < 1e-6);
});

test('a later lesson on other cues does not lower an earlier LTM trace, unlike restrained recovery', () => {
  const f = fixture();
  f.model.h[f.model.steps].set([1.5, 0, 1.5, 0, 0]); f.memory.observe(f.rest);
  const restrainedAfterLesson = f.memory.restrained.gains[0], ltmAfterLesson = f.memory.ltmGains[0];
  for (let i = 0; i < 10; i++) { f.model.h[f.model.steps].set([0, 1.5, 1.5, 0, 0]); f.memory.observe(f.rest); }
  assert.ok(f.memory.restrained.gains[0] > restrainedAfterLesson, 'restrained trace recovers toward rest');
  assert.ok(f.memory.ltmGains[0] >= ltmAfterLesson, 'LTM trace is kept');
  assert.ok(f.memory.ltmGains.every(v => v >= 1 && v <= 1.8));
});

test('absent DAN changes nothing; snapshot restore reproduces the next update and rejects corruption', () => {
  const a = fixture(), b = fixture();
  a.model.h[a.model.steps].set([0, 1.5, 0, 0, 0]); a.memory.observe(a.rest);
  assert.deepEqual(a.memory.snapshot().gains, [1, 1, 1, 1]);
  a.model.h[a.model.steps].set([1.5, 0, 1.5, 0, 0]); a.memory.observe(a.rest);
  b.memory.restore(JSON.parse(JSON.stringify(a.memory.snapshot())));
  for (const f of [a, b]) { f.model.h[f.model.steps].set([0, 1.5, 1.5, 0, 0]); f.memory.observe(f.rest); }
  assert.deepEqual(a.memory.snapshot(), b.memory.snapshot());
  const before = b.memory.snapshot();
  assert.throws(() => b.memory.restore({ ...before, gains: [1, 1, 1] }));
  assert.throws(() => b.memory.restore({ ...before, gains: [1, 1, 1, 3] }));
  assert.deepEqual(b.memory.snapshot(), before);
});

test('unstable or nonfinite observations fail before changing either memory', () => {
  const f = fixture(), before = f.memory.snapshot();
  f.model.h[f.model.steps].set([1.5, 0, 10, 0, 0]); assert.throws(() => f.memory.observe(f.rest), /Unstable/);
  assert.deepEqual(f.memory.snapshot(), before);
  f.model.h[f.model.steps].set([1.5, NaN, 1.5, 0, 0]); assert.throws(() => f.memory.observe(f.rest), /Nonfinite/);
  assert.deepEqual(f.memory.snapshot(), before);
  assert.throws(() => new IncentiveLtmMemory(f.model, f.mapping, { ...f.ltm, readyForCandidateExperiment: false }));
  assert.throws(() => new IncentiveLtmMemory(f.model, f.mapping, { ...f.ltm, groups: [{ edges: [0], kc: [0], dan: [{ index: 2 }] }] }), /edge mask/);
});

test('LTM mapping keeps alpha-prime/beta-prime KC inputs per KC hemisphere and the charging DANs', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'ltm-map-'));
  try {
    const types = ['KCg-m', "KCa'b'-ap1", 'KCab-s', "KCa'b'-m", 'MBON02', 'MBON15', 'PAM02', 'PPL103', 'PAM02', 'PPL103'];
    const side = ['left', 'left', 'right', 'right', 'left', 'right', 'left', 'left', 'right', 'right'];
    const ids = BigInt64Array.from(types.map((_, i) => 720575940600000000n + BigInt(i)));
    const path = join(folder, 'annotations.tsv');
    writeFileSync(path, 'root_id\themibrain_type\tcell_class\tside\n' + types.map((t, i) => `${ids[i]}\t${t}\t${i < 4 ? 'Kenyon_Cell' : i < 6 ? 'MBON' : 'DAN'}\t${side[i]}`).join('\n'));
    // MBON02 (4) <- KC 0,1,2,3; MBON15 (5) <- KC 1,3.
    const g = { row: Int32Array.from([0, 0, 0, 0, 0, 4, 6, 6, 6, 6, 6]), col: Int32Array.from([0, 1, 2, 3, 1, 3]), sign: new Int8Array(6).fill(1) };
    const mapped = await mapIncentiveLtm(g, ids, path);
    assert.equal(mapped.readyForCandidateExperiment, true);
    assert.deepEqual(mapped.groups.map(x => [x.side, x.mbonType, x.danType, x.kc]),
      [['left', 'MBON02', 'PAM02', [1]], ['left', 'MBON15', 'PPL103', [1]], ['right', 'MBON02', 'PAM02', [3]], ['right', 'MBON15', 'PPL103', [3]]]);
    assert.equal(mapped.groups[0].dan[0].rootId, ids[6].toString());
    assert.deepEqual(mapped.readouts.MBON15, [{ index: 5, rootId: ids[5].toString() }]);
    assert.equal(mapped.excluded.unsupportedKCType, 2);
  } finally { rmSync(folder, { recursive: true }); }
});

test('incentive readout adds the LTM attraction-minus-avoidance balance', () => {
  const r = readIncentiveMBON({ MBON12: [0.4, 0.2], MBON01: [0.1], MBON02: [0.5], MBON15: [0.2, 0.4] });
  assert.ok(Math.abs(r.restrainedScore - 0.2) < 1e-12 && Math.abs(r.ltmScore - 0.2) < 1e-12 && Math.abs(r.score - 0.4) < 1e-12);
  assert.throws(() => readIncentiveMBON({ MBON12: [1], MBON01: [1], MBON02: [1] }));
});
