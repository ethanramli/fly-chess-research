// Counterfactual diagnosis only. Historical activity masks must never allocate learner synapses.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { replayFrame } from './audit-eye-memory.mjs';
import { compareRestScores } from './inspect-eye-readout-offset.mjs';
import { hashState } from './eye-memory-recovery.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { neuronReaderCells, readNeurons } from '../../src/neural-learning/neuron-reader.mjs';

const sha = x => createHash('sha256').update(x).digest('hex');
const json = p => JSON.parse(readFileSync(p));
const atomic = (p, x) => { writeFileSync(p + '.partial', JSON.stringify(x, null, 2) + '\n'); renameSync(p + '.partial', p); };
const SPEC = 'research/reports/memory-interference-diagnosis-2026-11-01/synaptic-conflict-diagnostic-spec.md';
const KINDS = ['shared', 'oldOnly', 'notOldActive'];

export function edgeCategories(mapping, oldActive, reversalActive) {
  return mapping.groups.flatMap(g => g.kc.map(k => oldActive.has(k) ? reversalActive.has(k) ? 'shared' : 'oldOnly' : 'notOldActive'));
}

export function hybridState(after, before, categories, category) {
  assert(KINDS.includes(category));
  assert.equal(after.identity, before.identity);
  assert.equal(after.gains.length, categories.length);
  assert.equal(before.gains.length, categories.length);
  const result = structuredClone(after);
  for (let i = 0; i < categories.length; i++) if (categories[i] === category) {
    result.gains[i] = before.gains[i]; result.traces[i] = before.traces[i];
    for (let k = 0; k < 4; k++) result.states[4 * i + k] = before.states[4 * i + k];
  }
  return result;
}

function movement(before, after) {
  const result = {};
  for (const key of ['gains', 'traces', 'states']) {
    assert.equal(before[key].length, after[key].length);
    let changed = 0, aboveTolerance = 0, l1 = 0, maxAbs = 0;
    for (let i = 0; i < before[key].length; i++) {
      const d = Math.abs(after[key][i] - before[key][i]);
      changed += d !== 0; aboveTolerance += d > 1e-12; l1 += d; maxAbs = Math.max(maxAbs, d);
    }
    result[key] = { changed, aboveTolerance, l1, maxAbs };
  }
  return result;
}

async function main() {
  const { values: a } = parseArgs({ options: { run: { type: 'string' }, audit: { type: 'string' }, offset: { type: 'string' }, out: { type: 'string' }, 'cpu-duty': { type: 'string' } } });
  assert(a.run && a.audit && a.offset && a.out && a['cpu-duty'] === '0.5');
  const sourceManifest = json(`${a.run}/manifest.json`), audit = json(a.audit), offsetManifest = json(`${a.offset}/manifest.json`), offset = json(`${a.offset}/result.json`);
  assert.equal(sourceManifest.status, 'complete'); assert.equal(audit.status, 'audit-passed');
  for (const key of ['records', 'summary']) assert.equal(audit.sources[key], sha(readFileSync(`${a.run}/${key === 'records' ? 'records.jsonl' : 'summary.json'}`)));
  assert.equal(offsetManifest.status, 'complete'); assert.equal(offset.status, 'complete'); assert.equal(offset.passes, 27);
  assert.equal(offsetManifest.resultSha256, sha(readFileSync(`${a.offset}/result.json`)));
  assert.equal(offsetManifest.sourceAudit.sha256, sha(readFileSync(a.audit)));
  for (const phase of Object.values(offset.phases)) { assert(phase.parametersUnchanged); assert.equal(phase.memoryHashBefore, phase.memoryHashAfter); }
  for (const [p, expected] of Object.entries(sourceManifest.pins)) assert.equal(sha(readFileSync(p)), expected, `Changed source ${p}`);
  assert(!existsSync(a.out), 'Preserve existing output');
  const summary = json(`${a.run}/summary.json`), rows = readFileSync(`${a.run}/records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(summary.seeds, [4101, 4102, 4103, 4104, 4105, 4106]); assert.equal(rows.length, 24);
  const inputs = [SPEC, a.audit, `${a.offset}/manifest.json`, `${a.offset}/result.json`, `${a.run}/manifest.json`, `${a.run}/records.jsonl`, `${a.run}/summary.json`, `${a.run}/frames-4102-informative.jsonl`,
    '.cache/full.npz', '.codebase/scripts/neural-learning/inspect-eye-synaptic-conflict.mjs', '.codebase/scripts/neural-learning/audit-eye-memory.mjs',
    '.codebase/scripts/neural-learning/inspect-eye-readout-offset.mjs', '.codebase/scripts/neural-learning/eye-memory-recovery.mjs',
    ...Object.keys(sourceManifest.pins)];
  const phases = ['T0', 'T1', 'T2', 'T3', 'Delay', 'Rev'];
  for (const r of rows) for (const phase of phases) inputs.push(`${a.run}/snapshot-${r.seed}-${r.arm}-${phase}.json`);
  const pins = Object.fromEntries([...new Set(inputs)].map(p => [p, sha(readFileSync(p))]));
  mkdirSync(a.out, { recursive: true });
  const started = performance.now();
  let graphStarted = null;
  const guard = () => assert(performance.now() - started <= 300000 && (graphStarted === null || performance.now() - graphStarted <= 180000) && process.memoryUsage().rss <= 2048 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
  let manifest = { schema: 'eye-synaptic-conflict-diagnostic-v1', status: 'running', argv: process.argv, pins, limits: { wallSeconds: 300, graphWallSeconds: 180, graphPasses: 54, heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5 } };
  atomic(`${a.out}/manifest.json`, manifest);
  try {
    const allItems = rows.map(r => {
      guard();
      const saved = Object.fromEntries(phases.map(p => [p, json(`${a.run}/snapshot-${r.seed}-${r.arm}-${p}.json`)]));
      for (const p of phases) { assert.equal(hashState(saved[p].snapshot), saved[p].localHash); assert.deepEqual(saved[p].tests, r.tests[p]); }
      return { seed: r.seed, arm: r.arm, items: Array.from({ length: 4 }, (_, j) => ({ item: j, acquisition: r.tests[`T${j}`][j].mNorm, phases: Object.fromEntries(phases.map(p => [p, r.tests[p][j].mNorm])) })),
        transitions: phases.slice(1).map((p, i) => ({ from: phases[i], to: p, ...movement(saved[phases[i]].snapshot, saved[p].snapshot) })) };
    });
    const sourceFrames = `${a.run}/frames-4102-informative.jsonl`, oldActive = new Set(), reversalActive = new Set(), frames = [];
    let header, lastTrial = null;
    for await (const line of createInterface({ input: createReadStream(sourceFrames), crlfDelay: Infinity })) {
      guard(); const r = JSON.parse(line);
      if (r.kind === 'start') header = r;
      if (r.kind === 'trial') lastTrial = r;
      if (r.kind !== 'frame') continue;
      if (r.context.phase === 'B3' && r.context.step === 'choice' && r.dt === 1) for (const [k] of r.ks) oldActive.add(k);
      if (r.context.phase === 'REV') {
        assert(frames.length < 200); for (const [k] of r.ks) reversalActive.add(k);
        frames.push({ frame: r, teacher: r.context.step === 'feedback' && lastTrial?.context.trial === r.context.trial ? lastTrial.valence : null,
          unknown: lastTrial?.context.trial === r.context.trial && lastTrial.unknown });
      }
    }
    assert(header && frames.length === 168); assert.equal(header.seed, 4102); assert.equal(header.arm, 'informative');
    const categories = edgeCategories(header.mapping, oldActive, reversalActive), cells = header.mapping.groups.flatMap(g => g.kc);
    const countByCategory = Object.fromEntries(KINDS.map(k => [k, categories.filter(x => x === k).length]));
    assert.equal(Object.values(countByCategory).reduce((x, y) => x + y, 0), header.initial.gains.length);
    const saved = Object.fromEntries(['T2', 'T3', 'Delay', 'Rev'].map(p => [p, json(`${a.run}/snapshot-4102-informative-${p}.json`).snapshot]));
    const state = structuredClone(saved.Delay), metrics = {}, oldDelta = saved.T3.gains.map((v, i) => v - saved.T2.gains[i]);
    let ordinal = 0;
    for (const entry of frames) {
      guard(); const f = entry.frame, beforeGains = [...state.gains], beforeStates = [...state.states];
      const stage = f.dt === 4 && f.ks.length === 0 ? 'gap' : entry.teacher ? 'teacher' : f.context.step === 'feedback' && entry.unknown ? 'unknownExposure' : 'presentation';
      replayFrame(state, header.config, header.mapping, f);
      const k = new Map(f.ks), aggregate = metrics[stage] ??= Object.fromEntries(KINDS.map(kind => [kind, { frames: 0, activeEdgeFrames: 0, eligibleEdgeFrames: 0, eligibleAboveTolerance: 0, changedEdgeFrames: 0, changedAboveTolerance: 0, oppositeToOldLearning: 0, gainL1: 0, stateL1: 0, eligibilitySum: 0 }]));
      for (const row of Object.values(aggregate)) row.frames++;
      for (let i = 0; i < categories.length; i++) {
        const m = aggregate[categories[i]], delta = state.gains[i] - beforeGains[i];
        m.activeEdgeFrames += (k.get(cells[i]) ?? 0) > header.config.theta;
        m.eligibleEdgeFrames += state.traces[i] > 0; m.eligibleAboveTolerance += state.traces[i] > 1e-12;
        m.changedEdgeFrames += delta !== 0; m.changedAboveTolerance += Math.abs(delta) > 1e-12;
        m.oppositeToOldLearning += Math.abs(delta) > 1e-12 && delta * oldDelta[i] < 0;
        m.gainL1 += Math.abs(delta); m.eligibilitySum += state.traces[i];
        for (let q = 0; q < 4; q++) m.stateL1 += Math.abs(state.states[4 * i + q] - beforeStates[4 * i + q]);
      }
      appendFileSync(`${a.out}/update-observations.jsonl`, JSON.stringify({ ordinal: ordinal++, frame: f.frame, stage, context: f.context, teacher: entry.teacher, unknown: entry.unknown, dt: f.dt, dan: f.ds, before: f.before, after: f.after }) + '\n');
    }
    assert.equal(hashState(state), hashState(saved.Rev));
    graphStarted = performance.now(); guard();
    const model = new SparseTrainer(loadGraph('.cache/full.npz'), { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
    const memory = new LocalCubicReservoirMemory(model, header.mapping, { eta: 2, V0: 1.2 });
    assert.equal(memory.identity, header.identity);
    const tonic = header.mapping.groups.flatMap(g => g.dan.map(({ index }) => ({ index, current: .75 })));
    const parameterHash = () => { const h = createHash('sha256'); for (const [k, v] of Object.entries(model.params)) h.update(k).update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); return h.update(Buffer.from(model.signedMagnitude.buffer)).digest('hex'); };
    const sleepWord = new Int32Array(new SharedArrayBuffer(4)); let passes = 0;
    const measure = (condition, item, candidate, code) => {
      guard(); assert(passes < 54); const t = performance.now(); model.forward([0], [...tonic, ...code]);
      const obs = readNeurons(model.h[8], { roster: neuronReaderCells, config: model.config, memoryIdentity: memory.identity });
      const raw = obs.means.MBON05 + obs.means.MBON07;
      appendFileSync(`${a.out}/graph-observations.jsonl`, JSON.stringify({ pass: ++passes, condition, item, candidate, raw, memoryHash: hashState(memory.snapshot()) }) + '\n');
      Atomics.wait(sleepWord, 0, 0, performance.now() - t); guard(); return raw;
    };
    const initial = hashState(memory.snapshot()), params = parameterHash(), originalRest = measure('naive', null, null, []);
    const naive = header.items.map((x, j) => x.images.map((code, k) => measure('naive', j, k, code) - originalRest));
    assert.equal(initial, hashState(memory.snapshot())); assert.equal(params, parameterHash()); assert.equal(originalRest, offset.originalRest);
    const conditions = {};
    for (const name of ['Delay', 'Rev', ...KINDS.map(k => `restore-${k}`)]) {
      memory.restore(saved[name] ?? hybridState(saved.Rev, saved.Delay, categories, name.slice(8)));
      const before = hashState(memory.snapshot()), parameters = parameterHash(), currentRest = measure(name, null, null, []);
      const items = header.items.map((x, j) => {
        const raw = x.images.map((code, k) => measure(name, j, k, code)), good = name !== 'Delay' && j === 0 ? 1 : 0;
        const scores = compareRestScores(raw, naive[j], originalRest, currentRest, good);
        if (offset.phases[name]) for (const key of ['originalMargin', 'currentRestMargin']) assert(Math.abs(scores[key] - offset.phases[name].items[j][key]) <= 1e-10, 'Saved behavior failed to reproduce');
        return { item: j, raw, naive: naive[j], ...scores };
      });
      assert.equal(before, hashState(memory.snapshot())); assert.equal(parameters, parameterHash());
      conditions[name] = { currentRest, memoryHash: before, memoryUnchanged: true, parametersUnchanged: true, items };
    }
    assert.equal(passes, 54); guard();
    for (const [p, expected] of Object.entries(pins)) assert.equal(sha(readFileSync(p)), expected, `Input changed ${p}`);
    const result = { schema: manifest.schema, status: 'complete', scope: 'post-hoc causal state decomposition; no learned repair, biological validation or confirmation test', allItems, primary: { seed: 4102, oldItem: 3, reversedItem: 0, oldActiveKcs: oldActive.size, reversalActiveKcs: reversalActive.size, countByCategory, replayedFrames: frames.length, replayExact: true, metrics, originalRest, conditions }, passes, teachingEvents: 0, learnerUpdates: 0, wallSeconds: (performance.now() - started) / 1000, graphWallSeconds: (performance.now() - graphStarted) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024 };
    atomic(`${a.out}/result.json`, result);
    manifest = { ...manifest, status: 'complete', resultSha256: sha(readFileSync(`${a.out}/result.json`)), updatesSha256: sha(readFileSync(`${a.out}/update-observations.jsonl`)), graphSha256: sha(readFileSync(`${a.out}/graph-observations.jsonl`)) };
    atomic(`${a.out}/manifest.json`, manifest);
    console.log(JSON.stringify({ status: 'complete', passes, replayedFrames: frames.length, countByCategory, margins: Object.fromEntries(Object.entries(conditions).map(([k, v]) => [k, v.items.map(x => x.currentRestMargin)])) }));
  } catch (e) { atomic(`${a.out}/manifest.json`, { ...manifest, status: 'failed', error: e.message }); throw e; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.stack); process.exitCode = 1; });
