// Exact historical teaching lessons, including their durable evidence and original pacing.
import assert from 'node:assert/strict';
import {readFileSync, createReadStream, mkdirSync, copyFileSync, writeFileSync, renameSync,
  openSync, closeSync, fsyncSync, writeSync, statSync, truncateSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {gzipSync, gunzipSync} from 'node:zlib';
import os from 'node:os';
import {loadGraph} from '../../src/runtime/graph.mjs';
import {streamRows} from '../../src/runtime/storage.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {readConsequenceValue} from '../../src/neural-learning/consequence-value-readout.mjs';
import {createG0Table, createG0Encoder, G0FeedbackSession} from '../../src/neural-learning/curriculum-g0.mjs';
import {encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

const {values: a} = parseArgs({options: {out: {type: 'string'}, protocol: {type: 'string'}, 'cpu-duty': {type: 'string'}}});
assert(a.out && a.protocol && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const processes = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
  "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
  {encoding: 'utf8', windowsHide: true, timeout: 15000}));
assert(!(Array.isArray(processes) ? processes : [processes]).some(p => p.ProcessId !== process.pid &&
  (!p.CommandLine || /(?:--cpu-duty\b|\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run[^\\/]*|benchmark|audit[^\\/]*)\.mjs)/i.test(p.CommandLine))),
  'Another experiment is live; preserve serial graph work');
const registration = json(a.protocol), p = json(registration.baseProtocol), mapping = json(p.mappingPath);
assert.equal(registration.schema, 'training-latency-v1');
assert.equal(registration.rounds, 2); assert.equal(registration.units.length, 12);
assert.equal(registration.duty, .5); assert.equal(registration.maxPresentations, 1200);
assert.deepEqual(registration.gates, {minPerConditionElapsedReduction: .4, minPooledElapsedReduction: .45, exactReceiptsAndStates: true});
const started = performance.now(), cpuStart = process.cpuUsage();
let peakRss = 0, presentations = 0, phases = null;
function guard() {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  assert(peakRss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
  assert(presentations <= registration.maxPresentations);
}
async function hash(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) {h.update(chunk); guard();}
  return h.digest('hex');
}
for (const [path, expected] of Object.entries({...p.sources, ...p.dependencies, ...registration.sources}))
  assert.equal(await hash(path), expected, path);
assert.equal(await hash(p.graphPath), mapping.inputs.graph);
assert.equal(await hash(p.annotationPath), mapping.inputs.annotations);
const protocolHash = await hash(a.protocol);
mkdirSync(a.out, {recursive: false}); copyFileSync(a.protocol, join(a.out, 'protocol.json'));
for (const path of Object.keys({...p.sources, ...registration.sources})) {
  const target = join(a.out, 'sources', path); mkdirSync(dirname(target), {recursive: true}); copyFileSync(path, target);
}
const recorded = new Map();
const needed = new Set(registration.units.flatMap(u => Array.from({length: u.receiptCount}, (_, i) => u.firstReceipt + i)));
for await (const row of streamRows(registration.recordedReceipts)) if (needed.has(row.sequence)) recorded.set(row.sequence, row);
assert.equal(recorded.size, 252);
const graph = loadGraph(p.graphPath); guard();
const model = new SparseTrainer(graph, p.model); model.forward([0]); guard();
const memory = new RateTimingMemory(model, mapping, Float32Array.from(model.h[model.steps]), p.memory);
const fixed = fixedStateHash(model, memory.edges), table = createG0Table();
const encoder = createG0Encoder(mapping, {...p.encoder, seed: p.projectionSeeds[0]});

// Nested timers expose neural/copy/plasticity costs without adding their durations twice.
function timed(name, fn) {const start = performance.now(); try {return fn();} finally {
  if (phases) {const row = phases[name] ??= {ms: 0, count: 0}; row.ms += performance.now() - start; row.count++;}
}}
function instrument(object, method, name) {
  const original = object[method].bind(object);
  object[method] = (...args) => timed(name, () => original(...args));
}
instrument(model, 'forward', 'forward');
instrument(model.sparseAccumulator, 'prepare', 'csrCopies');
instrument(model.sparseAccumulator, 'accumulate', 'csrAccumulation');
instrument(memory, 'observeTrajectory', 'localPlasticity');
instrument(memory, 'snapshot', 'memorySnapshot');
async function pace(fn) {
  guard(); const before = process.cpuUsage(), value = fn(), cpu = process.cpuUsage(before); presentations++;
  const start = performance.now();
  await new Promise(resolve => setTimeout(resolve, Math.max(1, (cpu.user + cpu.system) / 1000)));
  const row = phases.sleep ??= {ms: 0, count: 0}; row.ms += performance.now() - start; row.count++;
  guard(); return value;
}
async function assess(cue, baselines) {
  const before = digest(memory.snapshot()), rows = [];
  for (const action of ['A', 'B']) {
    const encoded = timed('encoding', () => encoder.encode({cue, action}));
    await pace(() => model.forward([0], encoded.stimulation));
    const rates = Object.fromEntries(Object.entries(p.readout.cells).map(([type, cells]) =>
      [type, cells.map(c => model.h[model.steps][c.index])]));
    const prior = baselines[cue.join('')].rows.find(row => row.action === action).rates;
    const row = {action, cueHash: digest(encoded), rates, ...readConsequenceValue(rates, prior, p.readout.scale)};
    row.score = row.value; rows.push(row);
  }
  assert.equal(digest(memory.snapshot()), before);
  return {cue, encoderIdentity: encoder.identity, memoryHash: before, rows,
    choice: rows[0].score === rows[1].score ? null : rows[0].score > rows[1].score ? 'A' : 'B'};
}
const samples = [];
async function runUnit(unit, variant, round) {
  const setupStart = performance.now();
  assert.equal(await hash(unit.parent), unit.parentSha256);
  const state = decodeCheckpoint(readFileSync(unit.parent));
  const expected = Array.from({length: unit.receiptCount}, (_, i) => recorded.get(unit.firstReceipt + i));
  const first = expected[0]; assert.equal(first.kind, 'lesson-start');
  assert.equal(state.pendingReceipt, null); assert.equal(state.receiptCount, unit.firstReceipt);
  memory.restore(state.session.memory);
  const session = new G0FeedbackSession({model, memory, mapping, table, encoder, timing: p.timing, identity: state.session.identity});
  session.restore(state.session);
  const directory = join(a.out, `${round + 1}-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-${variant}`);
  mkdirSync(directory); const log = join(directory, 'receipts.jsonl');
  copyFileSync(registration.recordedReceipts, log); truncateSync(log, state.logBytes);
  const setupMs = performance.now() - setupStart;
  phases = {};
  instrument(session, 'verify', 'planVerification'); instrument(session, 'snapshot', 'sessionSnapshot');
  instrument(session.episode, 'snapshot', 'episodeSnapshot');
  const emitted = []; let lastCheckpoint;
  function save() {
    state.sequence++;
    timed('checkpointPublication', () => {
      const bytes = timed('checkpointEncoding', () => variant === 'json6'
        ? gzipSync(JSON.stringify(state) + '\n') : encodeNativeCheckpoint(state));
      assert(bytes.length <= 16 * 2 ** 20);
      const target = join(directory, `checkpoint-${String(state.sequence).padStart(6, '0')}.${variant === 'json6' ? 'json.gz' : 'checkpoint'}`);
      const fd = openSync(target + '.partial', 'wx');
      try {writeFileSync(fd, bytes); fsyncSync(fd);} finally {closeSync(fd);}
      renameSync(target + '.partial', target); lastCheckpoint = target;
    });
  }
  function publish(kind, value) {
    assert.equal(state.pendingReceipt, null);
    const receipt = {sequence: state.receiptCount, previousChainHash: state.chainHash, kind, ...value};
    state.pendingReceipt = receipt; save();
    timed('receiptPublication', () => {
      const line = JSON.stringify(receipt) + '\n'; assert(Buffer.byteLength(line) <= 65536);
      assert.equal(statSync(log).size, state.logBytes);
      const fd = openSync(log, 'a');
      try {assert.equal(writeSync(fd, line), Buffer.byteLength(line)); fsyncSync(fd);} finally {closeSync(fd);}
      state.logBytes += Buffer.byteLength(line); state.receiptCount++; state.chainHash = digest(receipt);
      state.pendingReceipt = null;
    });
    save(); emitted.push(receipt);
  }
  const before = performance.now(), cpuBefore = process.cpuUsage();
  const assessment = await assess(first.experience.publicInput.cue, state.baselines[p.projectionSeeds[0]]);
  timed('lessonStart', () => session.start(first.experience, assessment, first.options));
  state.session = session.snapshot();
  publish('lesson-start', {stageId: unit.stageId, lesson: state.lesson, experience: first.experience,
    options: first.options, binding: session.pending.binding, plan: session.pending.plan});
  while (session.pending.cursor < session.pending.plan.frames.length) {
    const frame = await pace(() => timed('sessionStep', () => session.step()));
    state.session = session.snapshot();
    const localHash = timed('trajectoryHash', () => digest(model.h.slice(1).map(h =>
      memory.kc.map((index, i) => [h[index], h[memory.dan[i]]]))));
    publish('frame', {stageId: unit.stageId, lesson: state.lesson, frame, localHash});
  }
  const receipt = timed('lessonFinish', () => session.finish()); state.lesson++; state.session = session.snapshot();
  publish('lesson', {stageId: unit.stageId, lesson: state.lesson - 1, receipt});
  guard();
  const elapsedMs = performance.now() - before, cpu = process.cpuUsage(cpuBefore), measurements = phases;
  phases = null;
  assert.deepEqual(emitted, expected, 'Changed recorded certificate, assessment, neural trajectory, update or receipt');
  assert.deepEqual(decodeCheckpoint(readFileSync(lastCheckpoint)), state, 'Checkpoint changed state');
  assert.equal(fixedStateHash(model, memory.edges), fixed, 'Changed fixed wiring/parameters');
  const sample = {stageId: unit.stageId, condition: unit.condition, lesson: unit.lesson, variant, round,
    elapsedMs, cpuUs: cpu.user + cpu.system, cpuFraction: (cpu.user + cpu.system) / (elapsedMs * 1000), setupMs,
    phases: measurements, finalStateHash: digest(state), finalMemoryHash: digest(memory.snapshot()), receipts: emitted.length,
    lastCheckpoint, exactHistoricalReceipts: true, exactCheckpointState: true};
  writeFileSync(join(directory, 'sample.json'), JSON.stringify(sample, null, 2) + '\n');
  console.log(JSON.stringify({unit: unit.stageId, lesson: unit.lesson, variant, round, elapsedMs, exact: true}));
  return sample;
}
const setupSeconds = (performance.now() - started) / 1000;
for (const variant of ['json6', 'nativeZstd1']) await runUnit(registration.units[0], variant, -1);
for (let round = 0; round < registration.rounds; round++) for (const [index, unit] of registration.units.entries()) {
  const order = (round + index) % 2 ? ['nativeZstd1', 'json6'] : ['json6', 'nativeZstd1'];
  for (const variant of order) samples.push(await runUnit(unit, variant, round));
}
const median = values => {const s = values.toSorted((a, b) => a - b), n = s.length;
  return (s[Math.floor((n - 1) / 2)] + s[Math.ceil((n - 1) / 2)]) / 2;};
const paired = samples.filter(s => s.variant === 'json6').map(before => {
  const after = samples.find(s => s.variant === 'nativeZstd1' && s.stageId === before.stageId && s.lesson === before.lesson && s.round === before.round);
  assert.equal(after.finalStateHash, before.finalStateHash); assert.equal(after.finalMemoryHash, before.finalMemoryHash);
  return {stageId: before.stageId, lesson: before.lesson, round: before.round, elapsedReduction: 1 - after.elapsedMs / before.elapsedMs};
});
const perCondition = Object.fromEntries([...new Set(paired.map(row => row.stageId))].map(stage =>
  [stage, median(paired.filter(row => row.stageId === stage).map(row => row.elapsedReduction))]));
const sum = variant => samples.filter(s => s.variant === variant).reduce((n, s) => n + s.elapsedMs, 0);
const pooledReduction = 1 - sum('nativeZstd1') / sum('json6');
const gates = {exactReceiptsAndStates: true,
  perCondition: Object.values(perCondition).every(value => value > registration.gates.minPerConditionElapsedReduction),
  pooled: pooledReduction > registration.gates.minPooledElapsedReduction};
const report = {schema: registration.schema, scope: registration.scope, passedTimingAndEquality: Object.values(gates).every(Boolean),
  gates, perCondition, pooledReduction, paired, samples, setupSeconds, graphSha256: mapping.inputs.graph, neurons: model.n,
  protocolHash, command: {argv: process.argv, execArgv: process.execArgv}, node: process.version,
  sources: registration.sources, presentations, peakRssMiB: peakRss / 2 ** 20,
  elapsedSeconds: (performance.now() - started) / 1000, cpu: process.cpuUsage(cpuStart),
  limitations: ['Nested phase timers overlap; do not sum them.', 'Original callback pacing excludes later checkpoint CPU.',
    'Historical synthetic association lessons; no measured time to successful chess learning.',
    'Two repetitions per workload do not establish stable tail latency.', 'Pending-publication process recovery must pass before adoption.']};
writeFileSync(join(a.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passedTimingAndEquality: report.passedTimingAndEquality, gates, perCondition,
  pooledReduction, presentations, peakRssMiB: report.peakRssMiB, report: join(a.out, 'report.json')}));
