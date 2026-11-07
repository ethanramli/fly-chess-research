import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { mapFlyConnectionsMemory, actualTeachingInputs } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';

const CONFIG = { eta: 0.5, minGain: 0.2, maxGain: 1.8, activityScale: 1.5 };
const HEADER = 'root_id\themibrain_type\tcell_class\tside';
// Roots above 2^53: neighbouring IDs collapse to one JS Number, so the crosswalk must stay BigInt.
const BASE = 720575940621164720n;
const rootOf = i => BASE + BigInt(i + 1);
// Node index = position. Node 9 is a graph input absent from the annotation.
const NODES = [
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'right' },      // 0 gamma KC, right
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },       // 1 gamma KC, left
  { type: "KCa'b'-ap1", cls: 'Kenyon_Cell', side: 'right' }, // 2 non-gamma KC
  { type: 'MBON05', cls: 'MBON', side: 'left' },             // 3 soma left, so receives right
  { type: 'MBON05', cls: 'MBON', side: 'right' },            // 4 soma right, so receives left
  { type: 'PAM07', cls: 'DAN', side: 'right' },              // 5
  { type: 'PAM08', cls: 'DAN', side: 'right' },              // 6
  { type: 'PAM07', cls: 'DAN', side: 'left' },               // 7
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },       // 8 gamma KC, left
  { type: '', cls: '', side: '' },                           // 9 unannotated
];
// Incoming edges per post node as [pre, sign]; listing order is edge order.
const INCOMING = { 3: [[0, 1], [1, 1], [2, 1], [9, 1]], 4: [[1, -1], [8, 1]] };
const READERS = [
  { type: 'MBON05', index: 3, rootId: String(rootOf(3)), receivingSide: 'right' },
  { type: 'MBON05', index: 4, rootId: String(rootOf(4)), receivingSide: 'left' },
];

function makeGraph() {
  const row = [], col = [], sign = [];
  for (let post = 0; post < NODES.length; post++) {
    row.push(col.length);
    for (const [pre, s] of INCOMING[post] ?? []) { col.push(pre); sign.push(s); }
  }
  row.push(col.length);
  return { row: Int32Array.from(row), col: Int32Array.from(col), sign: Int8Array.from(sign),
    initial: Float32Array.from(col, () => 1), input: Int32Array.from([0]), output: Int32Array.from([NODES.length - 1]) };
}

function annotationLines(skip = []) {
  const rows = NODES.flatMap((node, i) => (node.cls && !skip.includes(i) ? [`${rootOf(i)}\t${node.type}\t${node.cls}\t${node.side}`] : []));
  return [...rows, '7\tPAM07\tDAN\tright']; // root absent from graph: counted, never selected
}

async function build(folder, { lines = annotationLines(), header = HEADER, readers = READERS, edit = () => {} } = {}) {
  const annotationPath = join(folder, 'annotation.tsv');
  writeFileSync(annotationPath, [header, ...lines].join('\n') + '\n');
  const graph = makeGraph();
  edit(graph);
  const rootIds = BigInt64Array.from(NODES, (_, i) => rootOf(i));
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, annotationPath, readers);
  const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1 });
  return { graph, rootIds, annotationPath, mapping, model };
}

async function inTempFolder(run) {
  const folder = mkdtempSync(join(tmpdir(), 'fly-connections-teaching-'));
  try { await run(folder); } finally { rmSync(folder, { recursive: true, force: true }); }
}

function setEndpoint(model, rates) {
  const endpoint = model.h[model.steps];
  endpoint.fill(0);
  for (const [node, rate] of Object.entries(rates)) endpoint[Number(node)] = rate;
}

const gainOf = (memory, edge) => memory.gains[memory.edges.indexOf(edge)];

test('exact BigInt identities select contralateral gamma KCs and PAM07 DAN only', async () => {
  assert.equal(Number(rootOf(0)), Number(rootOf(9))); // precondition: Number would merge these roots
  await inTempFolder(async folder => {
    const { mapping } = await build(folder);
    assert.equal(mapping.schema, 'fly-connections-gamma4-pam07-mapping-v1');
    assert.equal(mapping.readyForCandidateExperiment, true);
    assert.deepEqual(mapping.groups.map(g => g.side), ['left', 'right']);
    const [left, right] = mapping.groups;
    // Right receiving side: gamma KC 0 only. Left KC 1, KCa'b' 2 and unannotated 9 are excluded.
    assert.equal(right.mbonType, 'MBON05');
    assert.equal(right.danType, 'PAM07');
    assert.deepEqual(right.mbon, { index: 3, rootId: String(rootOf(3)) });
    assert.deepEqual(right.dan, [{ index: 5, rootId: String(rootOf(5)), type: 'PAM07', side: 'right' }]);
    assert.deepEqual(right.edges, [0]);
    assert.deepEqual(right.kc, [0]);
    assert.deepEqual(right.kcRootIds, [String(rootOf(0))]);
    // Left receiving side: positive gamma KC 8 only. Negative KC 1 is excluded.
    assert.deepEqual(left.mbon, { index: 4, rootId: String(rootOf(4)) });
    assert.deepEqual(left.dan, [{ index: 7, rootId: String(rootOf(7)), type: 'PAM07', side: 'left' }]);
    assert.deepEqual(left.edges, [5]);
    assert.deepEqual(left.kc, [8]);
    assert.deepEqual(left.kcRootIds, [String(rootOf(8))]);
    assert.deepEqual(mapping.excluded, { nonKenyonOrUnannotated: 1, kenyonNotGammaOrOtherSide: 2, negativeSign: 1 });
    assert.equal(mapping.annotationRowsOutsideGraph, 1);
  });
});

test('wrong type, side, identity, sign and duplicate identities are rejected', async () => {
  await inTempFolder(async folder => {
    const reader = (i, patch) => ({ ...READERS[i], ...patch });
    await assert.rejects(build(folder, { readers: [reader(0, { type: 'PAM07' }), READERS[1]] }), /Invalid MBON05 reader/);
    await assert.rejects(build(folder, { readers: [reader(0, { receivingSide: 'unknown' }), READERS[1]] }), /Invalid MBON05 reader/);
    // Supplied receiving side contradicting the annotation soma side is rejected, not inferred.
    await assert.rejects(build(folder, { readers: [reader(0, { receivingSide: 'left' }), reader(1, { receivingSide: 'right' })] }), /Missing or inconsistent MBON05/);
    await assert.rejects(build(folder, { readers: [reader(0, { receivingSide: 'right' }), reader(1, { receivingSide: 'right' })] }), /Duplicate MBON05 reader/);
    await assert.rejects(build(folder, { readers: [reader(0, { rootId: Number(rootOf(3)) }), READERS[1]] }), /Invalid root identity/);
    await assert.rejects(build(folder, { readers: [reader(0, { rootId: String(rootOf(4)) }), READERS[1]] }), /identity mismatch/);
    await assert.rejects(build(folder, { readers: [reader(0, { rootId: '5' }), READERS[1]] }), /identity mismatch/);
    await assert.rejects(build(folder, { readers: [READERS[0]] }), /Expected one MBON05 reader/);
    await assert.rejects(build(folder, { lines: annotationLines([3]) }), /Missing or inconsistent MBON05/);
    const duplicate = annotationLines();
    duplicate.push(duplicate[5]); // second row for PAM07 root 5
    await assert.rejects(build(folder, { lines: duplicate }), /Duplicate annotation root/);
    await assert.rejects(build(folder, { header: 'root_id\themibrain_type\tcell_class' }), /Missing annotation column side/);
    // Wrong sign value on a gamma KC edge into MBON05: only +1 and -1 are valid.
    await assert.rejects(build(folder, { edit: g => { g.sign[0] = 2; } }), /Invalid graph sign/);
  });
});

test('an incomplete PAM07 group is not ready and cannot back ReversalMemory', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder, { lines: annotationLines([5]) });
    assert.equal(mapping.readyForCandidateExperiment, false);
    assert.deepEqual(mapping.groups.find(g => g.side === 'right').dan, []);
    assert.throws(() => new ReversalMemory(model, mapping, CONFIG), /Incomplete mapped candidate/);
    assert.throws(() => actualTeachingInputs(model, mapping), /Incomplete or unknown mapping/);
  });
});

test('mapping and extraction are read-only and mapping is deterministic', async () => {
  await inTempFolder(async folder => {
    const { graph, rootIds, annotationPath, mapping, model } = await build(folder);
    const snapshot = () => JSON.stringify({ row: [...graph.row], col: [...graph.col], sign: [...graph.sign],
      roots: [...rootIds].map(String), magnitude: [...model.params.magnitude], endpoint: [...model.h[model.steps]], mapping });
    const before = snapshot();
    assert.equal(JSON.stringify(await mapFlyConnectionsMemory(graph, rootIds, annotationPath, READERS)), JSON.stringify(mapping));
    assert.equal(snapshot(), before);
    setEndpoint(model, { 0: 0.75, 5: 2.25, 8: 1.5, 7: 0.75 });
    const beforeExtract = snapshot();
    const teaching = actualTeachingInputs(model, mapping);
    teaching[0].kcRates.fill(99);
    teaching[1].danRates[0] = 5;
    teaching[1].k[0] = 7;
    assert.equal(snapshot(), beforeExtract);
  });
});

test('endpoint extraction copies rates, follows mapping order and rejects invalid inputs', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder);
    setEndpoint(model, { 0: 0.75, 5: 2.25, 8: 1.5, 7: 0.75 });
    const endpoint = model.h[model.steps];
    const before = Array.from(endpoint);
    const teaching = actualTeachingInputs(model, mapping);
    assert.deepEqual(teaching.map(g => g.side), ['left', 'right']);
    const [left, right] = teaching;
    assert.deepEqual(Array.from(left.kcRates), [1.5]);
    assert.deepEqual(Array.from(left.danRates), [0.75]);
    assert.deepEqual(Array.from(left.k), [1]);
    assert.equal(left.factor, -0.5);
    assert.deepEqual(Array.from(right.kcRates), [0.75]);
    assert.deepEqual(Array.from(right.danRates), [2.25]);
    assert.deepEqual(Array.from(right.k), [0.5]);
    assert.equal(right.factor, -1.5);
    right.kcRates[0] = 99; right.danRates[0] = 99; right.k[0] = 99;
    assert.deepEqual(Array.from(endpoint), before);

    for (const rates of [{ 5: -1 }, { 0: NaN }, { 5: 11 }]) {
      setEndpoint(model, rates);
      assert.throws(() => actualTeachingInputs(model, mapping), /Invalid endpoint rate/);
    }
    setEndpoint(model, { 0: 0.75 });
    assert.throws(() => actualTeachingInputs(model, mapping, { activityScale: 0 }), /Invalid activity scale/);
    assert.throws(() => actualTeachingInputs(model, mapping, { activityScale: NaN }), /Invalid activity scale/);
    const badEdge = structuredClone(mapping);
    badEdge.groups[0].kc = [1]; // edge 5 starts at KC 8
    assert.throws(() => actualTeachingInputs(model, badEdge), /does not match/);
    const badIndex = structuredClone(mapping);
    badIndex.groups[1].dan[0].index = 99;
    assert.throws(() => actualTeachingInputs(model, badIndex), /Invalid mapped index/);
    assert.throws(() => actualTeachingInputs(model, { ...mapping, readyForCandidateExperiment: false }), /Incomplete or unknown mapping/);
  });
});

test('unchanged ReversalMemory applies the source equation to actual endpoint rates', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder);
    const memory = new ReversalMemory(model, mapping, CONFIG);
    const rest = new Float32Array(model.n);
    const baseRight = model.params.magnitude[0], baseLeft = model.params.magnitude[5];
    // Active cue and DAN: g' = 1 + 0.5*D*(k) with k = h/1.5 and D = -mean(DAN)/1.5.
    setEndpoint(model, { 0: 0.75, 5: 2.25, 8: 1.5, 7: 0.75 });
    const teaching = actualTeachingInputs(model, mapping);
    const first = memory.observe(rest);
    assert.deepEqual(first.factors, [-0.5, -1.5]);
    assert.deepEqual(first.factors, teaching.map(g => g.factor));
    assert.equal(gainOf(memory, 0), 0.625);
    assert.equal(gainOf(memory, 5), 0.75);
    assert.equal(model.params.magnitude[0], Math.fround(baseRight * 0.625));
    assert.equal(model.params.magnitude[5], Math.fround(baseLeft * 0.75));
    // Inactive right cue with right DAN on: the depressed gain recovers toward 1.
    setEndpoint(model, { 5: 0.75 });
    const second = memory.observe(rest);
    assert.equal(second.factors[1], -0.5);
    assert.equal(gainOf(memory, 0), 0.71875);
    assert.equal(gainOf(memory, 5), 0.75);
    assert.equal(model.params.magnitude[0], Math.fround(baseRight * 0.71875));
  });
});

test('spontaneous DAN activity with no external pulse still drives actual-rate updates', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder);
    const memory = new ReversalMemory(model, mapping, CONFIG);
    model.forward(new Float32Array(1)); // endogenous only: no stimulation argument
    const endpoint = model.h[model.steps];
    assert.ok(endpoint[0] > 0 && endpoint[8] > 0 && endpoint[5] > 0 && endpoint[7] > 0);
    const teaching = actualTeachingInputs(model, mapping);
    const result = memory.observe(new Float32Array(model.n));
    assert.deepEqual(result.factors, teaching.map(g => g.factor));
    assert.ok(result.changedEdges > 0);
    // Independent scalar form of g' = clip(g + eta*D*(k + g - 1)) with g = 1.
    const step = (D, k) => Math.min(CONFIG.maxGain, Math.max(CONFIG.minGain, 1 + CONFIG.eta * D * (k + 1 - 1)));
    assert.equal(gainOf(memory, 0), step(teaching[1].factor, teaching[1].k[0]));
    assert.equal(gainOf(memory, 5), step(teaching[0].factor, teaching[0].k[0]));
  });
});

test('zero actual DAN produces no update', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder);
    const memory = new ReversalMemory(model, mapping, CONFIG);
    setEndpoint(model, { 0: 1.5, 8: 1.5 });
    const result = memory.observe(new Float32Array(model.n));
    assert.equal(result.changedEdges, 0);
    assert.deepEqual(Array.from(memory.gains), [1, 1]);
    assert.ok(result.factors.every(f => f === 0));
  });
});

test('Euler-unstable input is rejected before any persistent or model state changes', async () => {
  await inTempFolder(async folder => {
    const { model, mapping } = await build(folder);
    const memory = new ReversalMemory(model, mapping, CONFIG);
    const state = () => JSON.stringify({ gains: [...memory.gains], events: memory.events,
      magnitude: [...model.params.magnitude], signed: [...model.signedMagnitude] });
    const before = state();
    setEndpoint(model, { 0: 1.5, 5: 10 }); // right factor -6.67: eta*(-D) > 1
    assert.throws(() => memory.observe(new Float32Array(model.n)), /Unstable candidate Euler step/);
    assert.equal(state(), before);
  });
});

test('restored memory reproduces the next update and rejects corrupt gains', async () => {
  await inTempFolder(async folder => {
    const a = await build(folder), b = await build(folder);
    const memoryA = new ReversalMemory(a.model, a.mapping, CONFIG);
    const memoryB = new ReversalMemory(b.model, b.mapping, CONFIG);
    const rest = new Float32Array(a.model.n);
    setEndpoint(a.model, { 0: 0.75, 5: 2.25, 8: 1.5, 7: 0.75 });
    memoryA.observe(rest);
    const saved = JSON.parse(JSON.stringify(memoryA.snapshot()));
    memoryB.restore(saved);
    setEndpoint(a.model, { 5: 0.75 });
    setEndpoint(b.model, { 5: 0.75 });
    memoryA.observe(rest);
    memoryB.observe(rest);
    assert.deepEqual(memoryB.snapshot(), memoryA.snapshot());
    assert.equal(gainOf(memoryA, 0), 0.71875);
    assert.deepEqual(Array.from(b.model.params.magnitude), Array.from(a.model.params.magnitude));
    const before = memoryB.snapshot();
    assert.throws(() => memoryB.restore({ ...before, gains: [0, 1] }), /Incompatible candidate state/);
    assert.deepEqual(memoryB.snapshot(), before);
  });
});
