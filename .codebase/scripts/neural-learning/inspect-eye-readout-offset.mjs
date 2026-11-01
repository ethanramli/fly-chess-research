// One bounded frozen-memory diagnostic; no observe(), teaching, parameter fitting or learning.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { neuronReaderCells, readNeurons } from '../../src/neural-learning/neuron-reader.mjs';
import { hashState } from './eye-memory-recovery.mjs';
const sha = x => createHash('sha256').update(x).digest('hex');
const json = p => JSON.parse(readFileSync(p));
const atomic = (p, value) => { writeFileSync(p + '.partial', JSON.stringify(value, null, 2) + '\n'); renameSync(p + '.partial', p); };
const SPEC = 'research/reports/memory-retention-continuation-2026-11-01/readout-interference-diagnostic.md';

export function compareRestScores(raw, naive, originalRest, currentRest, good) {
  assert(raw.length === 2 && naive.length === 2 && raw.every(Number.isFinite) && naive.every(x => Number.isFinite(x) && x > 0));
  assert([originalRest, currentRest].every(Number.isFinite) && (good === 0 || good === 1));
  const score = (x, i, rest) => .8 * (1 - (x - rest) / naive[i]) - .32;
  const bad = 1 - good, originalMargin = (score(raw[good], good, originalRest) - score(raw[bad], bad, originalRest)) / 1.6;
  const currentRestMargin = (score(raw[good], good, currentRest) - score(raw[bad], bad, currentRest)) / 1.6;
  const commonOffsetComponent = .5 * (currentRest - originalRest) * (1 / naive[bad] - 1 / naive[good]);
  assert(Math.abs(originalMargin - currentRestMargin - commonOffsetComponent) < 1e-10);
  return { originalMargin, currentRestMargin, commonOffsetComponent, originalCorrect: originalMargin > 0, currentRestCorrect: currentRestMargin > 0 };
}

async function main() {
  const { values: a } = parseArgs({ options: { run: { type: 'string' }, audit: { type: 'string' }, out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
  assert(a.run && a.audit && a.out && a['cpu-duty'] === '0.5', 'Require --run DIR --audit SOURCE_AUDIT_JSON --out FRESH_DIR --cpu-duty 0.5');
  const sourceManifest = json(`${a.run}/manifest.json`);
  assert.equal(sourceManifest.status, 'complete', 'Requires completed controlled run; no graph or output created');
  const summary = json(`${a.run}/summary.json`);
  assert.equal(summary.seeds.length, 6); assert.equal(summary.items, 4);
  const records = readFileSync(`${a.run}/records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 24); assert(records.some(r => r.seed === 4102 && r.arm === 'informative'));
  const audit = json(a.audit);
  assert.equal(audit.status, 'audit-passed', 'Source replay audit has not passed');
  assert.equal(audit.sources.records, sha(readFileSync(`${a.run}/records.jsonl`)));
  assert.equal(audit.sources.summary, sha(readFileSync(`${a.run}/summary.json`)));
  assert(!existsSync(a.out), 'Preserve existing diagnostic output');
  for (const [p, expected] of Object.entries(sourceManifest.pins)) assert.equal(sha(readFileSync(p)), expected, `Source changed: ${p}`);
  const sourceText = readFileSync(`${a.run}/frames-4102-informative.jsonl`, 'utf8'), header = JSON.parse(sourceText.slice(0, sourceText.indexOf('\n')));
  assert.equal(header.items.length, 4); assert.equal(header.seed, 4102); assert.equal(header.arm, 'informative');
  const inputFiles = ['.cache/full.npz', '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/runtime/sparse-accumulator.mjs',
    '.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs', '.codebase/src/neural-learning/local-reservoir-memory.mjs',
    '.codebase/src/neural-learning/local-gated-memory.mjs', '.codebase/src/neural-learning/local-supralinear-reservoir-memory.mjs',
    '.codebase/src/neural-learning/mushroom-body.mjs', '.codebase/src/neural-learning/neuron-reader.mjs',
    '.codebase/src/neural-learning/neuron-reader-cells.json', '.codebase/scripts/neural-learning/eye-memory-recovery.mjs', SPEC,
    '.codebase/scripts/neural-learning/inspect-eye-readout-offset.mjs', a.audit, `${a.run}/snapshot-4102-informative-Delay.json`, `${a.run}/snapshot-4102-informative-Rev.json`];
  const pins = Object.fromEntries(inputFiles.map(p => [p, sha(readFileSync(p))]));
  mkdirSync(a.out, { recursive: true });
  const start = performance.now();
  let manifest = { schema: 'eye-readout-offset-v1', status: 'running', argv: process.argv, node: process.version, pins, sourceRun: a.run,
    sourceManifest: sha(readFileSync(`${a.run}/manifest.json`)), sourceAudit: { path: a.audit, sha256: pins[a.audit] }, inputHeader: sha(sourceText.slice(0, sourceText.indexOf('\n'))), limits: { passes: 27, recurrentSteps: 8, cpuDuty: .5, wallSeconds: 180, rssMiB: 2048, freeMiB: 256 } };
  atomic(`${a.out}/manifest.json`, manifest);
  try {
    const guard = () => assert(performance.now() - start <= 180000 && process.memoryUsage().rss <= 2048 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
    guard();
    const model = new SparseTrainer(loadGraph('.cache/full.npz'), { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
    const memory = new LocalCubicReservoirMemory(model, header.mapping, { eta: 2, V0: 1.2 });
    assert.equal(memory.identity, header.identity);
    const tonic = header.mapping.groups.flatMap(g => g.dan.map(({ index }) => ({ index, current: .75 })));
    const parameterHash = () => { const h = createHash('sha256'); for (const [k, v] of Object.entries(model.params)) h.update(k).update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); h.update(Buffer.from(model.signedMagnitude.buffer)); return h.digest('hex'); };
    let passes = 0;
    const sleepWord = new Int32Array(new SharedArrayBuffer(4));
    const measure = (phase, item, candidate, code) => {
      guard(); assert(passes < 27);
      const t = performance.now(); model.forward([0], [...tonic, ...code]);
      const observation = readNeurons(model.h[8], { roster: neuronReaderCells, config: model.config, memoryIdentity: memory.identity });
      const raw = observation.means.MBON05 + observation.means.MBON07;
      appendFileSync(`${a.out}/observations.jsonl`, JSON.stringify({ pass: ++passes, phase, item, candidate, raw, observation, memoryHash: hashState(memory.snapshot()) }) + '\n');
      Atomics.wait(sleepWord, 0, 0, performance.now() - t);
      return raw;
    };
    const initialMemory = hashState(memory.snapshot()), initialParameters = parameterHash();
    const originalRest = measure('naive', null, null, []);
    const naive = header.items.map((x, j) => x.images.map((code, k) => measure('naive', j, k, code) - originalRest));
    assert.equal(hashState(memory.snapshot()), initialMemory); assert.equal(parameterHash(), initialParameters);
    const phases = {};
    for (const phase of ['Delay', 'Rev']) {
      const saved = json(`${a.run}/snapshot-4102-informative-${phase}.json`);
      memory.restore(saved.snapshot); assert.equal(hashState(memory.snapshot()), saved.localHash);
      const before = hashState(memory.snapshot()), parameters = parameterHash(), currentRest = measure(phase, null, null, []);
      const items = header.items.map((x, j) => {
        const raw = x.images.map((code, k) => measure(phase, j, k, code)), good = phase === 'Rev' && j === 0 ? 1 : 0;
        const scores = compareRestScores(raw, naive[j], originalRest, currentRest, good), expected = saved.tests[j].mNorm;
        assert(Math.abs(scores.originalMargin - expected) <= 1e-10, 'Original readout did not reproduce saved margin');
        return { item: j, moves: x.moves, naive: naive[j], raw, expectedOriginalMargin: expected, ...scores };
      });
      assert.equal(hashState(memory.snapshot()), before); assert.equal(parameterHash(), parameters);
      phases[phase] = { currentRest, restShift: currentRest - originalRest, memoryHashBefore: before, memoryHashAfter: hashState(memory.snapshot()), parametersUnchanged: true, items };
    }
    assert.equal(passes, 27); guard();
    for (const [p, expected] of Object.entries(pins)) assert.equal(sha(readFileSync(p)), expected, `Input changed: ${p}`);
    const result = { schema: manifest.schema, status: 'complete', scope: 'single frozen-memory decoder diagnostic; no learning, retention improvement or biological validation established',
      originalRest, phases, passes, teachingEvents: 0, persistentUpdates: 0, wallSeconds: (performance.now() - start) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024 };
    writeFileSync(`${a.out}/result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    manifest = { ...manifest, status: 'complete', resultSha256: sha(readFileSync(`${a.out}/result.json`)), observationsSha256: sha(readFileSync(`${a.out}/observations.jsonl`)) };
    atomic(`${a.out}/manifest.json`, manifest);
    console.log(JSON.stringify({ status: 'complete', passes, persistentUpdates: 0, originalReproduced: true, reversedItems: phases.Rev.items.map(r => ({ item: r.item, original: r.originalMargin, currentRest: r.currentRestMargin })) }));
  } catch (e) { atomic(`${a.out}/manifest.json`, { ...manifest, status: 'failed', error: e.message }); throw e; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.stack); process.exitCode = 1; });
