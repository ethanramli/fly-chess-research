// Actual pipeline functions on the existing six-neuron software fixture. No full graph load.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, copyFileSync, writeFileSync, renameSync, openSync, closeSync,
  fsyncSync, writeSync, statSync, truncateSync, mkdtempSync, rmSync} from 'node:fs';
import {join, dirname, resolve, basename} from 'node:path';
import {tmpdir, freemem} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {compileFunction} from 'node:vm';
import {streamRows} from '../../src/runtime/storage.mjs';
import {validateGraph} from '../../src/runtime/graph.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {createG0Table, createG0Encoder, G0FeedbackSession} from '../../src/neural-learning/curriculum-g0.mjs';
import {readConsequenceValue} from '../../src/neural-learning/consequence-value-readout.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {verifyLessonPair} from '../../scripts/evaluation-and-performance/audit-training-latency.mjs';

test('actual pipeline replays original six-neuron lessons exactly in every control and both informative valences',
  {skip: freemem() < 896 * 2 ** 20 ? 'Keep headroom for the parallel curriculum session' : false}, async () => {
  const fixtureRun = 'runs/g0-history-fixture-v1-uninterrupted';
  const p = JSON.parse(readFileSync(join(fixtureRun, 'protocol.json'), 'utf8'));
  assert.equal(p.fixture, true); assert.equal(p.fixtureGraph.row.length - 1, 6);
  const mapping = JSON.parse(readFileSync(p.mappingPath, 'utf8'));
  const graph = validateGraph(Object.fromEntries(Object.entries(p.fixtureGraph).map(([key, value]) =>
    [key, key === 'initial' ? Float32Array.from(value) : key === 'sign' ? Int8Array.from(value) : Int32Array.from(value)])));
  const model = new SparseTrainer(graph, p.model); model.forward([0]);
  const memory = new RateTimingMemory(model, mapping, Float32Array.from(model.h[model.steps]), p.memory);
  const fixed = fixedStateHash(model, memory.edges), table = createG0Table();
  const encoder = createG0Encoder(mapping, {...p.encoder, seed: p.projectionSeeds[0]});
  const recorded = new Map(), units = [];
  for await (const row of streamRows(join(fixtureRun, 'receipts.jsonl'))) {
    if (!row.stageId?.startsWith('acquisition:prefix:')) continue;
    const selected = row.lesson === 0 || (row.lesson === 1 && row.stageId.endsWith(':informative'));
    if (!selected || !['lesson-start', 'frame', 'lesson'].includes(row.kind)) continue;
    recorded.set(row.sequence, row);
    if (row.kind === 'lesson-start') {
      const parent = join(fixtureRun, `checkpoint-${String(row.sequence * 2 + 1).padStart(6, '0')}.json.gz`);
      units.push({stageId: row.stageId, condition: row.options.condition, lesson: row.lesson,
        parent, parentSha256: createHash('sha256').update(readFileSync(parent)).digest('hex'),
        firstReceipt: row.sequence, receiptCount: 21});
    }
  }
  assert.equal(units.length, 7); assert.equal(recorded.size, 147);
  const source = readFileSync(new URL('../../scripts/evaluation-and-performance/profile-g0-training-pipeline.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function timed(name, fn)'), end = source.indexOf('const setupSeconds =');
  assert(start > 0 && end > start, 'Locate actual staged pipeline functions');
  const directory = mkdtempSync(join(tmpdir(), 'fly-pipeline-fixture-'));
  let passed = false;
  try {
    const context = {assert, process, performance, setTimeout, Buffer, p, mapping, model, memory, fixed, table, encoder,
      recorded, units, a: {out: directory}, registration: {recordedReceipts: join(fixtureRun, 'receipts.jsonl')},
      guard() {assert.equal(model.n, 6); assert(process.memoryUsage().rss < 256 * 2 ** 20);},
      hash: async path => createHash('sha256').update(readFileSync(path)).digest('hex'),
      join, readFileSync, mkdirSync, copyFileSync, writeFileSync, renameSync, openSync, closeSync,
      fsyncSync, writeSync, statSync, truncateSync, gzipSync, encodeNativeCheckpoint, decodeCheckpoint,
      G0FeedbackSession, digest, fixedStateHash, readConsequenceValue, console: {log() {}}};
    const results = await compileFunction(`return (async () => {
      let phases = null, presentations = 0;
      ${source.slice(start, end)}
      const results = [];
      for (const unit of units) {
        const before = await runUnit(unit, 'json6', 0), after = await runUnit(unit, 'nativeZstd1', 0);
        assert.equal(before.finalStateHash, after.finalStateHash);
        assert.equal(before.finalMemoryHash, after.finalMemoryHash);
        results.push({stageId: unit.stageId, lesson: unit.lesson, receipts: before.receipts});
      }
      assert.equal(presentations, 294);
      return results;
    })()`, Object.keys(context))(...Object.values(context));
    assert.equal(results.length, 7); assert(results.every(row => row.receipts === 21));
    for (const unit of units) {
      const prefix = join(directory, `1-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-`);
      const options = {sourceReceipts: join(fixtureRun, 'receipts.jsonl'), steps: p.model.steps,
        guard: context.guard, pace: async () => {}};
      const expected = Array.from({length: 21}, (_, i) => recorded.get(unit.firstReceipt + i));
      const verified = await verifyLessonPair(prefix + 'json6', prefix + 'nativeZstd1', unit, expected, options);
      assert.equal(verified.checkpointPairs, 42);
    }
    // Re-sign a changed physiological state: matching checksums cannot hide changed values.
    const unit = units[0], prefix = join(directory, `1-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-`);
    const baseline = prefix + 'json6', native = prefix + 'nativeZstd1';
    const pending = join(native, `checkpoint-${String(2 * unit.firstReceipt + 2).padStart(6, '0')}.checkpoint`);
    const original = readFileSync(pending), changed = decodeCheckpoint(original);
    changed.session.episode.state[0] += .001; writeFileSync(pending, encodeNativeCheckpoint(changed));
    const expected = Array.from({length: 21}, (_, i) => recorded.get(unit.firstReceipt + i));
    const options = {sourceReceipts: join(fixtureRun, 'receipts.jsonl'), steps: p.model.steps,
      guard: context.guard, pace: async () => {}};
    await assert.rejects(verifyLessonPair(baseline, native, unit, expected, options));
    writeFileSync(pending, original);
    const log = join(native, 'receipts.jsonl'), logBytes = readFileSync(log), altered = Buffer.from(logBytes);
    altered[altered.length - 1] ^= 1; writeFileSync(log, altered);
    await assert.rejects(verifyLessonPair(baseline, native, unit, expected, options), /Changed original receipt prefix/);
    writeFileSync(log, logBytes);
    passed = true;
  } catch (error) {
    error.message += `; preserved fixture artifacts: ${directory}`;
    throw error;
  } finally {
    if (passed) {
      assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
      assert(basename(directory).startsWith('fly-pipeline-fixture-'));
      rmSync(directory, {recursive: true});
    }
  }
});
