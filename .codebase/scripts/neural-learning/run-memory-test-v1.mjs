// Memory test v1 (2026-11-03, researcher-approved): can verified feedback teach the fly an arbitrary preference between two seen boards
// through the γ4 rule on MBON05? Choices are scored from unchanged memory; learning happens only after each choice.
// Not chess learning.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { choiceTemperature, chooseMove } from '../../src/neural-learning/move-chooser-v1.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
assert(args.config, 'Missing --config');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const sha = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (path, body) => { writeFileSync(path + '.partial', JSON.stringify(body) + '\n'); renameSync(path + '.partial', path); };
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 7200000, 'Resource guard');
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

guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'memory-test-v1-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 7200, passes: 9000 },
  scope: 'read-only choices and tests; learning only after each choice; not chess learning' };
atomic(`${out}/manifest.json`, manifest);

const records = `${out}/records.jsonl`;
writeFileSync(records, '');
const log = record => appendFileSync(records, JSON.stringify(record) + '\n');

try {
  // Pairs from the seeing test: 4 items plus 16 distractor boards.
  const pairs = readFileSync(config.paths.pairs, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  assert(pairs.length >= 20, 'Need 20 pairs');

  // Graph, annotations and eyes, loaded as in the seeing test.
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const kcs = [], dans = new Map(), reader = {};
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]), cls = fields[header.indexOf('cell_class')], type = fields[header.indexOf('hemibrain_type')];
    if (index === undefined) continue;
    if (cls === 'Kenyon_Cell') kcs.push(index);
    if (cls === 'DAN') { if (!dans.has(type)) dans.set(type, []); dans.get(type).push(index); }
  }
  for (const cell of neuronReaderCells.cells) (reader[cell.type] ??= []).push(cell.index);
  const kcSet = new Set(kcs), pam = dans.get('PAM08'), mbonCells = reader.MBON05;
  assert(pam?.length && mbonCells?.length, 'Missing PAM08 or MBON05 cells');
  const eyes = createEyesV2(loadRetina('.cache/full.npz'));

  // Items: knight board = candidate 0, bishop board = candidate 1.
  const items = pairs.slice(0, 4).map(p => ({ move: p.move, cand: [eyes.encode(p.knight, p.move).stimulation, eyes.encode(p.bishop, p.move).stimulation] }));
  const distractors = pairs.slice(4, 20).map(p => eyes.encode(p.knight, p.move).stimulation);

  // gamma4 group: positive KC-to-MBON05 edges, PAM08 as the DAN population.
  const edges = [], kc = [];
  for (const j of mbonCells) for (let e = graph.row[j]; e < graph.row[j + 1]; e++) if (kcSet.has(graph.col[e]) && graph.sign[e] === 1) { edges.push(e); kc.push(graph.col[e]); }
  const mapping = { groups: [{ edges, kc, dan: pam.map(index => ({ index })) }] };
  const tonic = (level = .75) => pam.map(index => ({ index, current: level }));

  const ARMS = ['informative', 'absent', 'shuffled', 'disabled'], SEEDS = [4101, 4102, 4103];
  const BLOCKS = [
    { phase: 'B0', item: 0, correct: 0 }, { phase: 'B1', item: 1, correct: 0 }, { phase: 'B2', item: 2, correct: 0 }, { phase: 'B3', item: 3, correct: 0 },
    { phase: 'REV', item: 0, correct: 1 },
  ];
  const rows = [], yoked = new Map();
  let passes = 0;

  for (const seed of SEEDS) for (const arm of ARMS) {
    guard();
    const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
    const rawForward = model.forward.bind(model);
    model.forward = (...values) => {
      passes++;
      if (passes > 9000) throw Error('Pass budget exceeded');
      guard(); const result = rawForward(...values); pace(); return result;
    };
    const memory = new ReversalMemory(model, mapping, { eta: 0.5 });
    const fingerprint = () => {
      const h = createHash('sha256');
      h.update(Buffer.from(memory.gains.buffer, memory.gains.byteOffset, memory.gains.byteLength));
      const m = model.params.magnitude;
      h.update(Buffer.from(m.buffer, m.byteOffset, m.byteLength));
      return h.digest('hex');
    };

    model.forward([0], tonic());
    const rest = Float32Array.from(model.h[model.steps]);
    const mbon05 = stim => {
      model.forward([0], [...tonic(.75), ...stim]);
      const h = model.h[model.steps];
      return mbonCells.reduce((sum, i) => sum + h[i] - rest[i], 0) / mbonCells.length;
    };
    const score = stim => -mbon05(stim);
    const temperature = choiceTemperature(items.flatMap(x => x.cand.map(mbon05)));

    const tests = {}, blockSeqs = [];
    let trial = 0;
    const test = (phase, correctOf) => {
      const before = fingerprint();
      tests[phase] = items.map((item, j) => {
        const c = correctOf(j), scores = frozenScores([0, 1], k => score(item.cand[k]), fingerprint);
        const correct = scores[c] > scores[1 - c];
        log({ kind: 'test', arm, seed, phase, item: j, scores, correct });
        return correct;
      });
      assert.equal(fingerprint(), before);
    };
    const runBlock = (blockIndex, { phase, item: j, correct: c }) => {
      const seq = [], yokedPhase = arm === 'shuffled' ? yoked.get(seed)[blockIndex] : null;
      let cursor = 0;
      for (let t = 0; t < 24; t++) {
        trial++;
        const result = chooseMove({ moves: ['0', '1'], score: k => score(items[j].cand[Number(k)]), fingerprint, temperature, seed, trial });
        const choice = Number(result.move), actual = choice === c ? 1 : -1;
        const delivered = arm === 'absent' ? null : arm === 'shuffled' ? yokedPhase[cursor++] : actual;
        if (delivered !== null) seq.push(delivered);
        const level = delivered === null ? .75 : .75 + .75 * delivered;
        model.forward([0], [...tonic(level), ...items[j].cand[choice]]);
        if (arm !== 'disabled') memory.observe(rest, 1);
        log({ kind: 'trial', arm, seed, trial, phase, item: j, correct: c, choice, scores: result.scores, actual, delivered });
      }
      blockSeqs.push(seq);
    };

    for (let b = 0; b < 4; b++) { runBlock(b, BLOCKS[b]); test(`T${b}`, () => 0); }
    for (let step = 0; step < 16; step++) {
      model.forward([0], [...tonic(.75), ...distractors[step]]);
      if (arm !== 'disabled') memory.observe(rest, 1);
    }
    test('Delay', () => 0);
    runBlock(4, BLOCKS[4]);
    test('Rev', j => (j === 0 ? 1 : 0));

    if (arm === 'informative') {
      // Shuffled controls reuse this arm's realized sequence per block.
      yoked.set(seed, blockSeqs.map((values, blockIndex) => {
        const copy = [...values], rng = mulberry32((seed ^ 0x77 ^ blockIndex) >>> 0);
        for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
        return copy;
      }));
    }

    rows.push({ arm, seed, tests, jointPass: ['T3', 'Delay', 'Rev'].every(p => tests[p].every(Boolean)),
      changedGains: [...memory.gains].filter(g => g !== 1).length });
  }

  const informative = rows.filter(r => r.arm === 'informative');
  const informativeAllPass = informative.length === SEEDS.length && informative.every(r => r.jointPass);
  const controlsAllFail = rows.filter(r => r.arm !== 'informative').every(r => !r.jointPass);
  const summary = { schema: 'memory-test-v1', rows, informativeAllPass, controlsAllFail,
    outcome: informativeAllPass && controlsAllFail ? 'memory works' : 'memory does not pass',
    rule: 'informative jointPass in all 3 seeds and every control fails in every seed',
    passes, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) };
  atomic(`${out}/summary.json`, summary);
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
