// Engineered memory test v1 (2026-11-03): same task as memory-test-v1 with a balanced candidate set and a no-op no-feedback arm.
// Brain connections never change. Each choice is scored read-only from an engineered store of feature patterns with verified outcomes.
// Not chess learning; not transfer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { chooseMove } from '../../src/neural-learning/move-chooser-v1.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { KcEpisodicMemory, randomProjection } from '../../src/neural-learning/kc-episodic-memory-v1.mjs';

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
const manifest = { schema: 'engineered-memory-test-v1-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 7200, passes: 2000 },
  scope: 'read-only choices and tests; brain connections never change; not chess learning' };
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
  const kcs = [], dans = new Map();
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]), cls = fields[header.indexOf('cell_class')], type = fields[header.indexOf('hemibrain_type')];
    if (index === undefined) continue;
    if (cls === 'Kenyon_Cell') kcs.push(index);
    if (cls === 'DAN') { if (!dans.has(type)) dans.set(type, []); dans.get(type).push(index); }
  }
  const pam = dans.get('PAM08');
  assert(pam?.length && kcs.length, 'Missing PAM08 or Kenyon cells');
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina), retinaIdx = retina.retina_idx;
  const tonic = (level = .75) => pam.map(index => ({ index, current: level }));

  // Items: knight board = candidate 0, bishop board = candidate 1.
  const items = pairs.slice(0, 4).map(p => ({ move: p.move, cand: [eyes.encode(p.knight, p.move).stimulation, eyes.encode(p.bishop, p.move).stimulation] }));
  const distractors = pairs.slice(4, 20).map(p => eyes.encode(p.knight, p.move).stimulation);

  // Balanced: items 0 and 2 reward the knight (0), items 1 and 3 reward the bishop (1).
  const std = j => (j % 2 === 0 ? 0 : 1);
  const BLOCKS = [0, 1, 2, 3].map(j => ({ phase: `B${j}`, item: j, correct: std(j) })).concat([{ phase: 'REV', item: 0, correct: 1 }]);

  const ARMS = ['graph', 'raw', 'random', 'mismatched', 'absent', 'none'], SEEDS = [4101, 4102, 4103];
  const INFORMATIVE = 'graph';
  const rows = [], yoked = new Map();
  let passes = 0, rePassChecked = false;

  for (const seed of SEEDS) for (const arm of ARMS) {
    guard();
    const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
    const rawForward = model.forward.bind(model);
    model.forward = (...values) => {
      passes++;
      if (passes > 2000) throw Error('Pass budget exceeded');
      guard(); const result = rawForward(...values); pace(); return result;
    };
    const magnitudeHash = () => { const m = model.params.magnitude; return sha(Buffer.from(m.buffer, m.byteOffset, m.byteLength)); };
    const magnitudeBefore = magnitudeHash();

    model.forward([0], tonic());
    const rest = Float32Array.from(model.h[model.steps]);
    const kind = arm === 'raw' ? 'raw' : arm === 'random' ? 'random' : 'graph';
    // Features of one stimulus after a single brain pass. The brain is unchanged, so one pass per board is enough.
    const measure = stim => {
      model.forward([0], [...tonic(.75), ...stim]);
      if (kind === 'raw') {
        const byIndex = new Map(stim.map(x => [x.index, x.current]));
        return Float64Array.from(retinaIdx, i => byIndex.get(i) ?? 0);
      }
      const h = model.h[model.steps];
      const kcAct = Float64Array.from(kcs, i => h[i] - rest[i]);
      return kind === 'random' ? randomProjection(kcAct) : kcAct;
    };
    const vectors = new Map();
    const vectorOf = (key, stim) => { if (!vectors.has(key)) vectors.set(key, measure(stim)); return vectors.get(key); };
    items.forEach((item, j) => item.cand.forEach((stim, k) => vectorOf(`i${j}-${k}`, stim)));
    distractors.forEach((stim, s) => vectorOf(`d${s}`, stim));
    if (!rePassChecked) {
      assert.deepEqual(measure(items[0].cand[0]), vectors.get('i0-0'), 'Brain pass is not deterministic');
      rePassChecked = true;
    }

    const memory = new KcEpisodicMemory();
    const fingerprint = () => memory.fingerprint();
    // The none arm never reads the store.
    const scoreOf = arm === 'none' ? () => 0 : v => memory.score(v);
    const writes = arm !== 'absent' && arm !== 'none';

    const tests = {}, blockSeqs = [];
    let trial = 0;
    const test = (phase, correctOf) => {
      const before = fingerprint();
      tests[phase] = items.map((item, j) => {
        const c = correctOf(j), scores = frozenScores([0, 1], k => scoreOf(vectors.get(`i${j}-${k}`)), fingerprint);
        const correct = scores[c] > scores[1 - c];
        log({ kind: 'test', arm, seed, phase, item: j, scores, correct });
        return correct;
      });
      assert.equal(fingerprint(), before);
    };
    const runBlock = (blockIndex, { phase, item: j, correct: c }) => {
      const seq = [], yokedValues = arm === 'mismatched' ? yoked.get(seed)[blockIndex] : null;
      for (let t = 0; t < 24; t++) {
        trial++;
        // Scores are -1, 0 or +1, so temperature 0.1 is a fixed choice.
        const result = chooseMove({ moves: ['0', '1'], score: k => scoreOf(vectors.get(`i${j}-${k}`)), fingerprint, temperature: 0.1, seed, trial });
        const choice = Number(result.move), actual = choice === c ? 1 : -1;
        seq.push(actual);
        const value = arm === 'mismatched' ? yokedValues[t] : actual;
        if (writes) memory.write(vectors.get(`i${j}-${choice}`), value, sha({ item: j, choice, correct: c, actual, trial }));
        log({ kind: 'trial', arm, seed, trial, phase, item: j, correct: c, choice, scores: result.scores, actual, delivered: writes ? value : null });
      }
      blockSeqs.push(seq);
    };

    for (let b = 0; b < 4; b++) { runBlock(b, BLOCKS[b]); test(`T${b}`, std); }
    for (let s = 0; s < 16; s++) {
      if (writes) memory.write(vectors.get(`d${s}`), -1, sha({ distractor: s, seed, arm }));
    }
    test('Delay', std);
    runBlock(4, BLOCKS[4]);
    test('Rev', j => (j === 0 ? 1 : std(j)));

    if (arm === INFORMATIVE) {
      // Mismatched controls reuse this arm's realized sequence per block, shuffled within the block.
      yoked.set(seed, blockSeqs.map((values, blockIndex) => {
        const copy = [...values], rng = mulberry32((seed ^ 0x77 ^ blockIndex) >>> 0);
        for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
        return copy;
      }));
    }
    assert.equal(magnitudeHash(), magnitudeBefore, 'Brain connections changed');

    rows.push({ arm, seed, tests, jointPass: ['T3', 'Delay', 'Rev'].every(p => tests[p].every(Boolean)), stored: memory.size });
  }

  const graphRows = rows.filter(r => r.arm === INFORMATIVE);
  const graphPasses = graphRows.length === SEEDS.length && graphRows.every(r => r.jointPass);
  const controlsFail = rows.filter(r => ['mismatched', 'absent', 'none'].includes(r.arm)).every(r => !r.jointPass);
  const holds = graphPasses && controlsFail;
  const summary = { schema: 'engineered-memory-test-v1', rows,
    outcome: holds ? 'engineered memory works on this task' : 'does not pass',
    rule: 'graph passes jointPass in all 3 seeds; mismatched, absent and none fail in every seed; raw and random are reported comparisons',
    passes, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    scope: 'arbitrary knight-vs-bishop association on seen boards; not transfer, not chess learning; rewired-graph comparison not included (no rewired graph exists yet)' };
  atomic(`${out}/summary.json`, summary);
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
