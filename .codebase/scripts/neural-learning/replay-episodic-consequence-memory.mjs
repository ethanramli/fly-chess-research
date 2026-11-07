// Preserved-experience engineering replay. No graph execution or changed policy trajectory.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { EpisodicConsequenceMemory } from '../../src/neural-learning/episodic-consequence-memory.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^\uFEFF/, ''));
const out = config.paths.run, source = config.paths.source;
assert(!existsSync(out), 'Fresh output required');
const hash = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (p, x) => { writeFileSync(p + '.partial', JSON.stringify(x) + '\n'); renameSync(p + '.partial', p); };
const started = performance.now(), cpu = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4)), resources = [];
function guard(pace = false) {
  if (pace) {
    const used = process.cpuUsage(cpu), delay = 2 * (used.user + used.system) / 1000 - (performance.now() - started);
    if (delay > 0) Atomics.wait(sleep, 0, 0, Math.min(delay, 1000));
  }
  assert(performance.now() - started <= 180000, 'Elapsed guard');
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= 2048 && freeMiB >= 256, 'Memory guard');
  resources.push({ rssMiB, freeMiB });
}
for (const [p, expected] of Object.entries(config.pins)) assert.equal(await fileHash(p), expected, `Changed input ${p}`);
assert.equal(JSON.parse(readFileSync(config.paths.sourceAudit, 'utf8')).status, 'audit-passed');
guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'episodic-consequence-replay-v1', status: 'running', registrationSha256: hash(registration), pins: config.pins,
  scope: 'exact-cue external memory on preserved development choices; no closed-loop/graph/transfer/biological claim', graphPasses: 0,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 180 } };
atomic(`${out}/manifest.json`, manifest);
const rows = [], evaluations = [], capacities = [2, 4, 8, 128];
try {
  for (let seed = 4101; seed <= 4106; seed++) {
    const path = `${source}/frames-${seed}-informative.jsonl`, blocks = new Map();
    let items;
    for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
      const r = JSON.parse(line);
      if (r.kind === 'start') { assert.equal(r.seed, seed); assert.equal(r.arm, 'informative'); items = r.items; }
      if (r.kind === 'trial' && !r.unknown) {
        const block = blocks.get(r.context.phase) ?? []; block.push(r.valence === 'reward' ? 1 : -1); blocks.set(r.context.phase, block);
      }
    }
    assert.equal(items.length, 4);
    const shuffled = new Map();
    for (const [phase, values] of blocks) {
      const r = mulberry32((seed ^ 0x5eeda11 ^ [...phase].reduce((s, c) => s + c.charCodeAt(0), 0)) >>> 0), copy = [...values];
      for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
      shuffled.set(phase, copy);
    }
    const conditions = [
      ...capacities.map(capacity => ({ arm: 'informative', capacity })),
      ...['absent', 'shuffled', 'disabled'].map(arm => ({ arm, capacity: 128 })),
    ].map(c => ({ ...c, memory: new EpisodicConsequenceMemory({ capacity: c.capacity }), evictions: 0, accepted: 0 }));
    const cursors = new Map(); let trials = 0, known = 0;
    for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
      const r = JSON.parse(line);
      if (r.kind === 'trial') {
        trials++; assert.equal(r.context.trial, trials); assert.equal(r.unknown, trials % 8 === 0);
        const item = r.context.item, fixture = items[item], phase = r.context.phase;
        assert(Number.isInteger(item) && item >= 0 && item < 4 && [0, 1].includes(r.choice));
        assert(phase === `B${item}` || phase === 'REV' && item === 0);
        const good = phase === 'REV' ? 1 : 0, c = r.certificate;
        assert.equal(c.criterion, 'assigned-action-association-v1'); assert.equal(c.fen, fixture.fen);
        assert.deepEqual(c.moves, fixture.moves); assert.equal(c.chosenMove, fixture.moves[r.choice]);
        assert.equal(c.goodMove, fixture.moves[good]); assert.equal(c.known, !r.unknown); assert.equal(r.good, good);
        const value = r.choice === good ? 1 : -1;
        assert.equal(r.valence, r.unknown ? null : value === 1 ? 'reward' : 'punish');
        const evidenceHash = hash(c), cursor = cursors.get(phase) ?? 0;
        if (!r.unknown) { known++; cursors.set(phase, cursor + 1); }
        const pending = [];
        for (const condition of conditions) {
          const { memory, arm, capacity } = condition, before = fixture.images.map(cue => memory.query(cue)), prior = memory.snapshot();
          const status = !r.unknown && (arm === 'informative' || arm === 'shuffled') ? 'verified' : 'unknown';
          const feedback = { status, sequence: trials, value: arm === 'shuffled' && !r.unknown ? shuffled.get(phase)[cursor] : value, evidenceHash };
          const receipt = memory.commit(fixture.images[r.choice], feedback), state = memory.snapshot();
          if (status === 'unknown') assert.deepEqual(state, prior);
          else {
            assert(receipt.accepted); condition.accepted++; if (receipt.evicted) condition.evictions++;
            assert.equal(memory.commit(fixture.images[r.choice], feedback).reason, 'duplicate');
            assert.deepEqual(memory.snapshot(), state);
          }
          const resumed = new EpisodicConsequenceMemory({ capacity }); resumed.restore(JSON.parse(JSON.stringify(state)));
          assert.deepEqual(resumed.snapshot(), state);
          pending.push({ kind: 'trial', seed, arm, capacity, trial: trials, phase, item, choice: r.choice,
            unknown: r.unknown, before, feedback, receipt, stateChecksum: state.checksum });
        }
        // Snapshot and pending receipts publish together before any accepted-event acknowledgement.
        atomic(`${out}/checkpoint.json`, { seed, trial: trials, conditions: conditions.map(c => ({ arm: c.arm, capacity: c.capacity, state: c.memory.snapshot() })), pendingReceipts: pending });
        for (const receipt of pending) appendFileSync(`${out}/receipts.jsonl`, JSON.stringify(receipt) + '\n');
        if (trials % 8 === 0) guard(true);
      }
      if (r.kind === 'test') for (const condition of conditions) {
        const before = condition.memory.snapshot(), phase = r.name;
        const results = items.map((fixture, item) => {
          const candidates = fixture.images.map(cue => condition.memory.query(cue)), good = phase === 'Rev' && item === 0 ? 1 : 0;
          const margin = candidates[good].value - candidates[1 - good].value;
          return { item, candidates, margin, correct: margin > 0 };
        });
        assert.deepEqual(condition.memory.snapshot(), before);
        const publication = { seed, arm: condition.arm, capacity: condition.capacity, phase, results, state: before };
        atomic(`${out}/snapshot-${seed}-${condition.arm}-${condition.capacity}-${phase}.json`, publication);
        evaluations.push({ seed, arm: condition.arm, capacity: condition.capacity, phase, results });
      }
    }
    assert.equal(trials, 120); assert.equal(known, 105);
    for (const condition of conditions) {
      const tests = Object.fromEntries(evaluations.filter(e => e.seed === seed && e.arm === condition.arm && e.capacity === condition.capacity).map(e => [e.phase, e.results]));
      assert.deepEqual(Object.keys(tests), ['T0', 'T1', 'T2', 'T3', 'Delay', 'Rev']);
      rows.push({ seed, arm: condition.arm, capacity: condition.capacity, accepted: condition.accepted, evictions: condition.evictions, tests,
        jointRecallPass: ['T3', 'Delay', 'Rev'].every(p => tests[p].every(x => x.correct)), finalState: condition.memory.snapshot().checksum });
    }
    atomic(`${out}/progress.json`, { seed, completedConditions: rows.length }); guard(true);
  }
  for (const [p, expected] of Object.entries(config.pins)) assert.equal(await fileHash(p), expected, `Input changed during replay ${p}`);
  assert.equal(hash(readFileSync(args.config)), manifest.registrationSha256);
  guard(true);
  const primary = rows.filter(r => r.arm === 'informative' && r.capacity === 128);
  const result = { schema: manifest.schema, status: 'complete', scope: manifest.scope, rows,
    primaryEngineeringPass: primary.every(r => r.jointRecallPass), resources, elapsedSeconds: (performance.now() - started) / 1000, graphPasses: 0 };
  atomic(`${out}/result.json`, result);
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete', resultSha256: await fileHash(`${out}/result.json`), receiptsSha256: await fileHash(`${out}/receipts.jsonl`) });
  console.log(JSON.stringify({ status: 'complete', primaryEngineeringPass: result.primaryEngineeringPass, conditions: rows.length,
    scope: manifest.scope, elapsedSeconds: result.elapsedSeconds }));
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: String(error) }); throw error;
}
