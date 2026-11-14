import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { BOARD_IDS, ETA, PASSES, VALENCE, runBoard } from '../../src/neural-learning/three-board-feedback-v1.mjs';
import { OLD_SCALE, PULSES, buildReport, captureReadings, protocolLessons, replayGains, smallestPassingScale, validateRecording, worstKept } from '../../src/neural-learning/pulse-readings-v1.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const PACKET_PATH = join(root, 'research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/inputs/boards.jsonl');
const packetBytes = readFileSync(PACKET_PATH), PACKET_HASH = createHash('sha256').update(packetBytes).digest('hex');
const PACKET = packetBytes.toString('utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

// Tiny circuit, as in three-board-feedback-v1.test.mjs: Kenyon cells 0-2, MBON11 (3), MBON05 (4), one cell per dopamine type (5-9).
const KC_DRIVE = { a: [0.012, 0.004, 0.001], b: [0.006, 0.010, 0.002], c: [0.002, 0.001, 0.016] };
const DAN = { PAM07: [5], PAM02: [6], PAM03: [7], PPL101: [8], PPL103: [9] };
function tinySetup() {
  const incoming = [[], [], [], [0, 1], [0, 2], [], [], [], [], []], row = [0], col = [];
  for (const sources of incoming) { col.push(...sources); row.push(col.length); }
  const graph = { row: Int32Array.from(row), col: Int32Array.from(col), sign: Int8Array.from(col, () => 1), initial: Float32Array.from(col, () => 1), input: Int32Array.from([0]), output: Int32Array.from([4]) };
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, saturation: 1.5 });
  model.params.bias.fill(0);
  const pulses = { reward: [5, 6], punish: [8, 9] };
  const forward = (fen, move, pulse) => {
    model.forward(new Float32Array(1), [...KC_DRIVE[move].map((current, index) => ({ index, current })), ...(pulse ? pulses[pulse].map(index => ({ index, current: 0.75 })) : [])], null);
    return model.h[model.steps];
  };
  const board = { boardId: 'tiny', fen: 'unused', legal: ['a', 'b', 'c'], outcomes: { a: true, b: false, c: false },
    experiences: [{ move: 'a', pulse: true }, { move: 'a', pulse: true }, { move: 'c', pulse: false }, { move: 'c', pulse: false }] };
  const digest = () => createHash('sha256').update(Buffer.from(model.params.magnitude.buffer)).update(Buffer.from(model.signedMagnitude.buffer)).update(Buffer.from(model.params.bias.buffer)).digest('hex');
  return { model, forward, board, digest, cells: [0, 1, 2], scoreOf: h => h[3] - h[4] };
}

test('capture: every move with each pulse, weights bit-identical afterwards, pulses reach their own dopamine cells', () => {
  const { model, forward, board, digest, cells, scoreOf } = tinySetup();
  const magnitudes = Float32Array.from(model.params.magnitude), written = [];
  const out = captureReadings({ boards: [board], forward, cells, danCells: DAN, scoreOf, weightsDigest: digest, write: r => written.push(r) });
  assert.equal(out.records, 9); assert.equal(written.length, 9); assert.equal(out.weightsUnchanged, true);
  assert.deepEqual(model.params.magnitude, magnitudes);
  assert.deepEqual(written.map(r => `${r.move} ${r.pulse}`), board.legal.flatMap(m => PULSES.map(p => `${m} ${p}`)));
  const of = (m, p) => written.find(r => r.move === m && r.pulse === p);
  assert(of('a', 'reward').danMean.PAM07 > 0 && of('a', 'reward').danMean.PPL101 === 0);
  assert(of('a', 'punish').danMean.PPL101 > 0 && of('a', 'punish').danMean.PAM07 === 0);
  assert(of('a', 'none').danMean.PAM07 === 0 && of('a', 'none').danMean.PPL101 === 0);
  assert(written.every(r => r.rates.length === 3 && Object.keys(r.D).length === VALENCE.size));
});

test('capture: a forward that changes a weight is caught', () => {
  const { model, forward, board, digest, cells, scoreOf } = tinySetup();
  let calls = 0;
  const leaky = (...a) => { if (++calls === 5) model.setMagnitude(0, model.params.magnitude[0] * 1.01); return forward(...a); };
  assert.throws(() => captureReadings({ boards: [board], forward: leaky, cells, danCells: DAN, scoreOf, weightsDigest: digest, write: () => {} }), /weights changed during capture/);
});

test('protocol comparisons reproduce the probe\'s own learning-off cap check exactly', () => {
  const { forward, board, digest, cells, scoreOf, model } = tinySetup(), written = [];
  captureReadings({ boards: [board], forward, cells, danCells: DAN, scoreOf, weightsDigest: digest, write: r => written.push(r) });
  const entry = { board, reading: (m, p) => written.find(r => r.move === m && r.pulse === p) };
  const weights = [2, 1, 1], scale = 0.004; // low enough that the cap bites in the tiny circuit
  const mask = [0, 1, 2, 3];
  const probe = runBoard({ record: board, condition: 'off', kcScale: scale, forward, setMagnitude: (e, v) => model.setMagnitude(e, v), base: Float64Array.from(mask, e => model.params.magnitude[e]),
    mask, maskType: ['MBON11', 'MBON11', 'MBON05', 'MBON05'], maskPre: [0, 1, 0, 2], cells, weights, danCells: DAN, scoreOf });
  const mine = protocolLessons(entry, 'correct').map(l => worstKept(l.pairs, weights, scale));
  assert(mine.some(x => x < 0.99), 'the cap bites in this check');
  for (const lesson of probe.lessons) assert.equal(mine[lesson.index], lesson.cap.worstKept);
});

test('scale boundary: smallest passing scale in 0.000001 steps, edge-weighted, checked from both sides', () => {
  // One cell: 0 against 0.0100005 keeps min(s, 0.0100005) / 0.0100005, so 99% needs s >= 0.00990005, i.e. 0.009901 on the grid.
  const one = smallestPassingScale([{ a: [0], b: [0.0100005] }], [1]);
  assert.equal(one.scale, 0.009901); assert(one.worstKept >= 0.99);
  assert.equal(one.oneStepBelow.scale, 0.0099); assert(one.oneStepBelow.worstKept < 0.99);
  // Two cells, weights 3 and 1: 99% of 0.0600015 needs 0.0300015 + s >= 0.05940149, i.e. 0.029400. Unweighted it would be 0.029600.
  const two = smallestPassingScale([{ a: [0, 0], b: [0.0100005, 0.03] }], [3, 1]);
  assert.equal(two.scale, 0.0294); assert(worstKept([{ a: [0, 0], b: [0.0100005, 0.03] }], [3, 1], 0.029399) < 0.99);
  assert.equal(smallestPassingScale([{ a: [0, 0], b: [0.0100005, 0.03] }], [1, 1]).scale, 0.0296);
  assert.equal(smallestPassingScale([{ a: [0.01], b: [0.01] }], [1]), null); // identical moves give nothing to keep
});

test('replay: one lesson changes each gain by 0.5 x signal x reading, the probe\'s rule', () => {
  const mapping = { edge: [10, 11], type: ['MBON05', 'MBON11'], cell: [0, 1] };
  const D = Object.fromEntries([...VALENCE.keys()].map(m => [m, 0])); D.MBON05 = -0.4; D.MBON11 = 0.2;
  const { byPass } = replayGains([{ rates: [0.007, 0.05], D }], mapping, 0.014);
  assert.equal(byPass.length, PASSES);
  assert.equal(byPass[0][0], 1 + ETA * -0.4 * 0.5); // reading 0.007 / 0.014
  assert.equal(byPass[0][1], 1 + ETA * 0.2 * 1); // reading capped at 1
});

// A synthetic recording on the real board packet: 4 learnable cells with edge weights 2, 1, 2, 1 across the six output types.
// Without a pulse every rate is below 0.0105. Reward pushes cell 0 to 0.05 and punishment pushes cell 2 to 0.04, so a lesson differs from
// every unpulsed move mainly in a cell the old cap flattens.
const ZERO_D = () => Object.fromEntries([...VALENCE.keys()].map(m => [m, 0]));
const SIGNAL = { none: ZERO_D(), reward: { ...ZERO_D(), MBON05: -0.4, MBON01: -0.3, MBON02: 0.09 }, punish: { ...ZERO_D(), MBON11: -0.4, MBON12: -0.52, MBON15: -0.28 } };
function syntheticRecording() {
  const mapping = { maskEdges: 6, cells: [100, 101, 102, 103], cellRootIds: ['1', '2', '3', '4'], weights: [2, 1, 2, 1],
    edge: [0, 1, 2, 3, 4, 5], type: ['MBON05', 'MBON11', 'MBON01', 'MBON12', 'MBON02', 'MBON15'], cell: [0, 0, 1, 2, 2, 3], base: [1, 1, 1, 1, 1, 1] };
  const records = [];
  for (const id of BOARD_IDS) {
    const board = PACKET.find(r => r.boardId === id);
    board.legal.forEach((move, i) => {
      const quiet = [0.002 + 0.0001 * (i % 7), 0.004 + 0.0003 * (i % 5), 0.001 + 0.0002 * (i % 3), 0.009 + 0.00015 * (i % 11)];
      for (const pulse of PULSES) {
        const rates = [...quiet];
        if (pulse === 'reward') rates[0] = 0.05; if (pulse === 'punish') rates[2] = 0.04;
        records.push({ boardId: id, move, pulse, score: 0, danMean: { PAM07: pulse === 'reward' ? 0.3 : 0, PAM02: pulse === 'reward' ? 0.3 : 0, PAM03: 0, PPL101: pulse === 'punish' ? 0.3 : 0, PPL103: pulse === 'punish' ? 0.3 : 0 }, D: SIGNAL[pulse], rates });
      }
    });
  }
  return { manifest: { status: 'complete', pins: { 'runs/replay-calibration-inputs/boards.jsonl': PACKET_HASH } }, summary: { records: records.length, weightsUnchanged: true }, mapping, records, packet: PACKET, expectedPacketHash: PACKET_HASH, maskEdges: 6 };
}

test('incomplete or mismatched recordings are rejected; a complete one is accepted', () => {
  const good = syntheticRecording();
  assert.equal(validateRecording(good).size, 3);
  const cases = {
    'readings missing': r => { r.records.splice(5, 1); r.summary.records--; },
    'recorded twice': r => { r.records[6] = r.records[5]; },
    'not complete': r => { r.manifest.status = 'running'; },
    'did not pin this board packet': r => { r.manifest.pins = { 'boards.jsonl': 'f'.repeat(64) }; },
    'confirm unchanged weights': r => { r.summary.weightsUnchanged = false; },
    'the file holds': r => { r.records.pop(); },
    'learnable connections': r => { r.mapping.edge.pop(); },
    'number of learnable connections': r => { r.mapping.weights[0] = 3; },
    'wrong length or invalid': r => { r.records[0].rates = r.records[0].rates.slice(1); },
    'feedback signals missing': r => { r.records[0].D = {}; },
    'unexpected record': r => { r.records[0].move = 'a1a1'; },
  };
  for (const [message, spoil] of Object.entries(cases)) {
    const r = structuredClone(good); spoil(r);
    assert.throws(() => validateRecording(r), new RegExp(message), message);
  }
  assert.throws(() => buildReport({ ...structuredClone(good), records: good.records.slice(0, -1), summary: { records: good.records.length - 1, weightsUnchanged: true } }), /Recording rejected/);
});

test('a larger scale can pass 99% while producing smaller and less different updates', () => {
  const report = buildReport(syntheticRecording());
  const protocol = report.sets['protocol, correct labels'];
  assert.equal(report.sets['same pulse: none'].atOldScale.failing, 0, 'without a pulse the old scale keeps 99%');
  assert(protocol.atOldScale.worstKept < 0.99 && protocol.failingLessonsAtOldScale === 72, 'the old scale fails every lesson, as on the graph machine');
  const candidate = protocol.smallestPassing.scale;
  assert(candidate > OLD_SCALE);
  const old = report.replay.find(r => r.scale === OLD_SCALE), next = report.replay.find(r => r.scale === candidate);
  assert.equal(old.passes99['protocol, correct labels'], false); assert.equal(next.passes99['protocol, correct labels'], true);
  for (let b = 0; b < BOARD_IDS.length; b++) {
    assert(next.boards[b].correct.meanAbsChange < old.boards[b].correct.meanAbsChange, 'smaller updates');
    assert(next.boards[b].divergence.meanAbs < old.boards[b].divergence.meanAbs, 'correct and swapped gains diverge less');
  }
});

test('report and recorder scripts: end to end on synthetic files; refusals before any graph work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pulse-readings-')), rec = join(dir, 'recording');
  try {
    const r = syntheticRecording();
    mkdirSync(rec);
    writeFileSync(join(rec, 'manifest.json'), JSON.stringify(r.manifest)); writeFileSync(join(rec, 'summary.json'), JSON.stringify(r.summary));
    writeFileSync(join(rec, 'records.jsonl'), r.records.map(x => JSON.stringify(x)).join('\n'));
    // The report pins 6,046 connections, so this 6-connection recording must be refused with that reason.
    writeFileSync(join(rec, 'mapping.json'), JSON.stringify(r.mapping));
    const report = join(root, '.codebase/scripts/neural-learning/report-pulse-scale-v1.mjs');
    const refused = spawnSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r1.json')], { encoding: 'utf8' });
    assert.notEqual(refused.status, 0); assert.match(refused.stderr, /does not list 6046 learnable connections/); assert(!existsSync(join(dir, 'r1.json')));
    // Pad the mapping to 6,046 connections (extra ones on cell 3) and the report runs.
    const pad = 6046 - 6, m = r.mapping;
    writeFileSync(join(rec, 'mapping.json'), JSON.stringify({ ...m, maskEdges: 6046, weights: [2, 1, 2, 1 + pad], edge: [...m.edge, ...Array.from({ length: pad }, (_, i) => 6 + i)],
      type: [...m.type, ...Array(pad).fill('MBON15')], cell: [...m.cell, ...Array(pad).fill(3)], base: [...m.base, ...Array(pad).fill(1)] }));
    const stdout = execFileSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r2.json'), '--scales', '0.03'], { encoding: 'utf8' });
    assert.match(stdout, /protocol, correct labels: .* lessons failing 72 of 72/);
    const out = JSON.parse(readFileSync(join(dir, 'r2.json'), 'utf8'));
    assert(out.replay.some(x => x.scale === 0.03) && out.replay.some(x => x.scale === OLD_SCALE));
    assert.throws(() => execFileSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r2.json')], { stdio: 'pipe' }), /exists/);
    assert(out.replay.every(x => x.boards.every(b => b.pulseShareOfReading > 0 && b.pulseShareOfReading < 1)));
    // A learning-off run of the probe: 6 passes repeating the lesson cap records, starting scores equal to the no-pulse readings.
    const offRun = (tweak = () => {}) => {
      const lessons = id => out.sets['protocol, correct labels'].boards.find(b => b.boardId === id).lessons;
      const result = { circuit: 'quiet', condition: 'off', boards: BOARD_IDS.map(id => ({ boardId: id,
        lessons: Array.from({ length: PASSES }, (_, p) => lessons(id).map(l => ({ pass: p + 1, index: l.index, cap: { worstKept: l.worstKeptAtOldScale } }))).flat(),
        checkpoints: [{ pass: 0, scores: Object.fromEntries(PACKET.find(b => b.boardId === id).legal.map(m => [m, 0])) }] })) };
      tweak(result);
      const runDir = mkdtempSync(join(dir, 'off-')); writeFileSync(join(runDir, 'result.json'), JSON.stringify(result)); return runDir;
    };
    const exact = execFileSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r3.json'), '--learning-off-run', offRun()], { encoding: 'utf8' });
    assert.match(exact, /matches: learning-off run: lessons whose worst share kept at 0.014047 is bit-identical: recorded 72, earlier 72/);
    assert.match(exact, /matches: learning-off run: starting move scores bit-identical .*recorded 106, earlier 106/);
    const off = execFileSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r4.json'), '--learning-off-run', offRun(r => { r.boards[1].lessons[7].cap.worstKept += 1e-12; })], { encoding: 'utf8' });
    assert.match(off, /DIFFERS: learning-off run: lessons .*recorded 71, earlier 72/);
    const wrong = spawnSync(process.execPath, [report, '--recording', rec, '--packet', PACKET_PATH, '--out', join(dir, 'r5.json'), '--learning-off-run', offRun(r => { r.condition = 'correct'; })], { encoding: 'utf8' });
    assert.match(wrong.stderr, /not quiet off/); assert(!existsSync(join(dir, 'r5.json')));
    // Recorder: a wrong pin stops the run before the graph is read, and the manifest says so; a used folder is refused.
    const recorder = join(root, '.codebase/scripts/neural-learning/record-pulse-readings-v1.mjs'), pinned = join(dir, 'pinned.txt'), config = join(dir, 'config.json');
    writeFileSync(pinned, 'x'); writeFileSync(config, JSON.stringify({ paths: { graph: join(dir, 'no-graph.npz') }, model: {}, pins: { [pinned]: '0'.repeat(64) } }));
    const run = spawnSync(process.execPath, [recorder, '--config', config, '--out', join(dir, 'run')], { encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    const manifest = JSON.parse(readFileSync(join(dir, 'run', 'manifest.json'), 'utf8'));
    assert.equal(manifest.status, 'failed'); assert.match(manifest.error, /Pin mismatch/); assert.equal(manifest.circuit, 'quiet'); assert(!existsSync(join(dir, 'run', 'records.jsonl')));
    const again = spawnSync(process.execPath, [recorder, '--config', config, '--out', join(dir, 'run')], { encoding: 'utf8' });
    assert.match(again.stderr, /already holds a run/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
