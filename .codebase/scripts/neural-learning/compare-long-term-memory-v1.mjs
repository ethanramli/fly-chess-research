// Isolated live integration pilot. Existing graph/memory sources remain unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { EpisodicConsequenceMemory } from '../../src/neural-learning/episodic-consequence-memory.mjs';
import { memoryBackedScore, policyChoice } from '../../src/neural-learning/memory-backed-policy-v1.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^\uFEFF/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const sha = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (path, body) => { writeFileSync(path + '.partial', JSON.stringify(body) + '\n'); renameSync(path + '.partial', path); };
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
const resources = []; let forwards = 0;
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 5400000, 'Resource guard');
  assert(forwards <= 3318, 'Forward-count guard');
  resources.push({ rssMiB, freeMiB, elapsedSeconds: (performance.now() - started) / 1000 });
}
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);
assert.equal(JSON.parse(readFileSync(config.paths.sourceAudit, 'utf8')).status, 'audit-passed');
let items;
for await (const line of createInterface({ input: createReadStream(config.paths.fixtures), crlfDelay: Infinity })) {
  const r = JSON.parse(line); assert.equal(r.kind, 'start'); assert.equal(r.seed, 4102); items = r.items; break;
}
assert.equal(items.length, 4);
const fixtureHash = sha(items), COMPARTMENTS = [['MBON05', 'PAM08'], ['MBON07', 'PAM11']];
guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'long-term-memory-v1-live-comparison-pilot-v1', status: 'running', pid: process.pid,
  processCreatedApprox: new Date(Date.now() - performance.now()).toISOString(), argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins, fixtureHash, seed: 4102,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 5400, forwards: 3318 },
  scope: 'one-seed live arbitrary-association pilot, frozen graph-derived cues; no reasoning/biological-clock claim' };
atomic(`${out}/manifest.json`, manifest);
const localHash = memory => {
  const h = createHash('sha256');
  for (const a of [memory.gains, memory.traces, memory.states]) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.update(JSON.stringify([memory.time, memory.pulses])).digest('hex');
};
try {
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i])), kcs = [], dans = new Map(), reader = {};
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]), cls = fields[header.indexOf('cell_class')], type = fields[header.indexOf('hemibrain_type')];
    if (index === undefined) continue;
    if (cls === 'Kenyon_Cell') kcs.push(index);
    if (cls === 'DAN') { if (!dans.has(type)) dans.set(type, []); dans.get(type).push(index); }
  }
  for (const cell of neuronReaderCells.cells) (reader[cell.type] ??= []).push(cell.index);
  const kcSet = new Set(kcs), rows = [], conditions = [
    ['fly-memory', 'informative'], ['memory-only', 'informative'], ['fly-only', 'informative'],
    ['fly-memory', 'absent'], ['fly-memory', 'shuffled'], ['fly-memory', 'disabled'],
  ];
  let yoked;
  for (const [system, arm] of conditions) {
    guard(); const armStarted = performance.now(), forwardStart = forwards;
    const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
    const rawForward = model.forward.bind(model);
    model.forward = (...values) => { guard(); const result = rawForward(...values); forwards++; pace(); return result; };
    const groups = COMPARTMENTS.map(([m, d]) => {
      const edges = [], kc = [];
      for (const j of reader[m]) for (let e = graph.row[j]; e < graph.row[j + 1]; e++) if (kcSet.has(graph.col[e]) && graph.sign[e] === 1) { edges.push(e); kc.push(graph.col[e]); }
      return { mbonType: m, danType: d, edges, kc, dan: dans.get(d).map(index => ({ index })) };
    });
    const memory = new LocalCubicReservoirMemory(model, { groups }, { eta: 2, V0: 1.2 }), episodic = new EpisodicConsequenceMemory();
    const tonic = (level = .75) => COMPARTMENTS.flatMap(([, d]) => dans.get(d).map(index => ({ index, current: level })));
    model.forward([0], tonic()); const rest = Float32Array.from(model.h[8]);
    const read = code => {
      model.forward([0], [...tonic(), ...code]);
      return COMPARTMENTS.map(([m]) => reader[m].map(i => model.h[8][i] - rest[i]));
    };
    const means = values => values.map(group => group.reduce((a, b) => a + b, 0) / group.length);
    const naive = new Map(); for (const code of items.flatMap(x => x.images)) naive.set(code, read(code));
    const peek = code => {
      const response = read(code), baseline = naive.get(code), r = means(response), n = means(baseline), denominator = n[0] + n[1];
      assert(Number.isFinite(denominator) && denominator !== 0);
      const neuralValue = .8 * (1 - (r[0] + r[1]) / denominator) - .32, recalled = episodic.query(code);
      return { neuralValue, recalled, score: memoryBackedScore(system, neuralValue, recalled), response, baseline };
    };
    const key = `${system}-${arm}`, file = `${out}/frames-${key}.jsonl`, tests = {}, realized = {}, online = {};
    const log = record => appendFileSync(file, JSON.stringify(record) + '\n');
    const staticParams = () => Object.fromEntries(Object.entries(model.params).filter(([name]) => name !== 'magnitude').map(([name, a]) => [name, sha(Buffer.from(a.buffer, a.byteOffset, a.byteLength))]));
    const initialParams = staticParams(), initialNeural = localHash(memory), initialEpisodic = episodic.snapshot().checksum;
    log({ kind: 'start', system, arm, seed: 4102, items, fixtureHash, config: memory.config, modelConfig: model.config,
      mapping: memory.mapping, initial: memory.snapshot(), episodic: episodic.snapshot(), localHash: initialNeural,
      naive: items.map(x => x.images.map(c => naive.get(c))), initialParams });
    let frame = 0, trial = 0, context = { phase: 'initial' };
    const observe = dt => {
      if (arm === 'disabled') return;
      const h = model.h[8], scale = memory.config.activityScale, before = localHash(memory);
      const local = [...new Set(groups.flatMap(g => g.kc))];
      const ks = local.map(i => [i, Math.min(1, Math.max(0, h[i] - rest[i]) / scale)]).filter(([, k]) => k > memory.config.theta);
      const ds = groups.map(g => ({ excess: g.dan.reduce((s, d) => s + Math.max(0, h[d.index] - rest[d.index]) / scale, 0) / g.dan.length,
        deficit: g.dan.reduce((s, d) => s + Math.max(0, rest[d.index] - h[d.index]) / scale, 0) / g.dan.length }));
      memory.observe(rest, dt);
      log({ kind: 'frame', frame: frame++, context, dt, ks, ds, before, after: localHash(memory) });
    };
    const gap = () => { model.h[8].set(rest); observe(4); };
    const checkpoint = pending => {
      atomic(`${out}/checkpoint.json`, { schema: manifest.schema, registrationSha256: manifest.registrationSha256,
        fixtureHash, system, arm, trial, frame, context, tests, realized, online, completedRows: rows,
        neural: memory.snapshot(), episodic: episodic.snapshot(), pendingReceipt: pending,
        recoveryScope: 'published boundary; unattended recovery runner not implemented' });
      atomic(`${out}/progress.json`, { system, arm, trial, frame, phase: context.phase, completedArms: rows.length,
        forwards, elapsedSeconds: (performance.now() - started) / 1000 });
    };
    const test = phase => {
      context = { phase, step: 'read-only-test' };
      const before = localHash(memory), externalBefore = episodic.snapshot().checksum;
      tests[phase] = items.map((item, j) => {
        const candidates = item.images.map(peek), good = phase === 'Rev' && j === 0 ? 1 : 0;
        const margin = candidates[good].score - candidates[1 - good].score;
        return { item: j, candidates, margin, correct: margin > 0 };
      });
      assert.equal(localHash(memory), before); assert.equal(episodic.snapshot().checksum, externalBefore);
      const publication = { system, arm, phase, tests: tests[phase], neural: memory.snapshot(), episodic: episodic.snapshot(), localHash: before };
      atomic(`${out}/snapshot-${key}-${phase}.json`, publication); log({ kind: 'test', phase, tests: tests[phase], localHash: before, episodicChecksum: externalBefore });
      checkpoint(null);
    };
    const block = (phase, item, good) => {
      realized[phase] = []; online[phase] = { choices: [], correct: 0, knownTrials: 0 }; let cursor = 0;
      for (let t = 0; t < 24; t++) {
        trial++; context = { phase, trial, item, step: 'choice' };
        const candidates = items[item].images.map(code => { const observed = peek(code); observe(1); gap(); return observed; });
        const draw = mulberry32((4102 ^ 0x7919 ^ trial) >>> 0)(), choice = policyChoice(candidates.map(x => x.score), draw), code = items[item].images[choice];
        const unknown = trial % 8 === 0, actual = choice === good ? 1 : -1;
        const certificate = { criterion: 'assigned-action-association-v1', scope: 'arbitrary association only; no chess consequence',
          fen: items[item].fen, moves: items[item].moves, chosenMove: items[item].moves[choice], known: !unknown, goodMove: items[item].moves[good] };
        // Independent binding against the registered fixture before any event is delivered.
        assert.equal(certificate.chosenMove, items[item].moves[choice]); assert.equal(certificate.goodMove, items[item].moves[phase === 'REV' ? 1 : 0]);
        const delivered = unknown || arm === 'absent' ? null : arm === 'shuffled' ? yoked[phase][cursor++] : actual;
        if (delivered !== null) realized[phase].push(delivered);
        context = { ...context, step: 'chosen', choice };
        const chosen = peek(code); observe(1);
        const scale = delivered === null ? 0 : Math.min(1, Math.max(0, (1.2 - delivered * chosen.neuralValue) / 2.4));
        const level = .75 + (delivered ?? 0) * .75 * scale;
        context = { ...context, step: 'feedback' };
        model.forward([0], [...tonic(level), ...code]); observe(1); gap();
        const externalStatus = delivered !== null && arm !== 'disabled' && system !== 'fly-only' ? 'verified' : 'unknown';
        const evidenceHash = sha(certificate), receipt = episodic.commit(code, { status: externalStatus, sequence: trial, value: delivered, evidenceHash });
        const record = { kind: 'trial', trial, phase, item, choice, draw, unknown, candidates, chosen, actual, delivered, scale, level,
          certificate, evidenceHash, externalStatus, receipt, localHash: localHash(memory), episodicChecksum: episodic.snapshot().checksum };
        online[phase].choices.push(choice); online[phase].correct += Number(choice === good); online[phase].knownTrials += Number(!unknown);
        checkpoint(record); log(record);
        if (trial % 8 === 0) { guard(); pace(); }
      }
    };
    for (let j = 0; j < 4; j++) { block(`B${j}`, j, 0); test(`T${j}`); }
    const noise = mulberry32((4102 ^ 0x6a09e667) >>> 0), pool = [...new Set(items.flatMap(x => x.images).flat().map(x => x.index))];
    for (let step = 0; step < 16; step++) {
      context = { phase: 'Delay', step };
      const code = pool.filter(() => noise() < .1).map(index => ({ index, current: .9 + .6 * noise() }));
      const dan = COMPARTMENTS.flatMap(([, d]) => { const jitter = .1 * (2 * noise() - 1); return dans.get(d).map(index => ({ index, current: .75 * (1 + jitter) })); });
      model.forward([0], [...dan, ...code]); observe(4); checkpoint(null);
    }
    test('Delay'); block('REV', 0, 1); test('Rev');
    assert.deepEqual(staticParams(), initialParams, 'Non-magnitude parameters changed');
    if (arm === 'disabled') { assert.equal(localHash(memory), initialNeural); assert.equal(episodic.snapshot().checksum, initialEpisodic); }
    if (arm === 'absent' || system === 'fly-only') assert.equal(episodic.snapshot().checksum, initialEpisodic);
    const used = process.cpuUsage(cpuStarted);
    const row = { system, arm, seed: 4102, tests, online, realized, frames: frame, forwards: forwards - forwardStart,
      jointPass: ['T3', 'Delay', 'Rev'].every(p => tests[p].every(x => x.correct)),
      neuralUnchanged: localHash(memory) === initialNeural, externalEntries: episodic.snapshot().entries.length,
      finalNeuralHash: localHash(memory), finalEpisodicHash: episodic.snapshot().checksum,
      elapsedSeconds: (performance.now() - armStarted) / 1000, cumulativeCpuSeconds: (used.user + used.system) / 1e6 };
    assert.equal(row.forwards, 553); rows.push(row);
    log({ kind: 'end', frames: frame, neural: row.finalNeuralHash, episodic: row.finalEpisodicHash, forwards: row.forwards, finalParams: staticParams() });
    appendFileSync(`${out}/records.jsonl`, JSON.stringify(row) + '\n');
    atomic(`${out}/completed.json`, { system, arm, completedArms: rows.length, finalNeuralHash: row.finalNeuralHash, finalEpisodicHash: row.finalEpisodicHash });
    if (rows.length === 1) yoked = Object.fromEntries(Object.entries(realized).map(([phase, values], blockIndex) => {
      const copy = [...values], rng = mulberry32((4102 ^ 0x77 ^ blockIndex) >>> 0);
      for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
      return [phase, copy];
    }));
    console.log(JSON.stringify({ system, arm, completedArms: rows.length, jointPass: row.jointPass, elapsedSeconds: row.elapsedSeconds }));
  }
  for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Input changed ${path}`);
  assert.equal(sha(readFileSync(args.config)), manifest.registrationSha256); assert.equal(forwards, 3318); guard();
  const summary = { schema: manifest.schema, status: 'complete', scope: manifest.scope, rows, forwards, resources, elapsedSeconds: (performance.now() - started) / 1000 };
  atomic(`${out}/summary.json`, summary);
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete', summarySha256: await fileHash(`${out}/summary.json`), recordsSha256: await fileHash(`${out}/records.jsonl`) });
  console.log(JSON.stringify({ status: 'complete', arms: rows.length, forwards, elapsedSeconds: summary.elapsedSeconds }));
} catch (error) { atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: String(error) }); throw error; }
