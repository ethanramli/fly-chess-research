// Four-neuron software fixture only; never loads the connectome or starts a study.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, appendFileSync, mkdtempSync, unlinkSync, rmdirSync,
  openSync, closeSync, fsyncSync, renameSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir, freemem} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {createG0Table, createG0Encoder, planG0Schedule, G0FeedbackSession} from '../../src/neural-learning/curriculum-g0.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

function fixture() {
  const graph = {row: Int32Array.of(0, 0, 0, 0, 2), col: Int32Array.of(0, 1),
    sign: Int8Array.of(1, 1), initial: Float32Array.of(1, 1), input: Int32Array.of(0), output: Int32Array.of(3)};
  const model = new SparseTrainer(graph, {steps: 2, inputDim: 1, outputs: 1, seed: 47});
  model.forward([0]);
  const mapping = {schema: 'gamma2-rate-timing-map-v1', groups: [{mbonType: 'MBON12', danType: 'PPL103',
    kc: [0, 1], kcTypes: ['KCg-m', 'KCg-m'], edges: [0, 1], dan: [{index: 2}]}]};
  const memory = new RateTimingMemory(model, mapping, Float32Array.from(model.h[2]), {
    referenceMode: 'fixed-unstimulated-model', tauKC: .4, tauShort: .6, tauLong: 1,
    stepDuration: .1, eta: .5, minGain: .2, maxGain: 1.8, activityScale: 1});
  const table = createG0Table(), encoder = createG0Encoder(mapping, {seed: 20261011, maxCells: 1, totalCurrent: 1.5});
  const session = new G0FeedbackSession({model, memory, mapping, table, encoder,
    timing: {cueFrame: 2, leadFrames: 2, tailFrames: 5, current: 1.5}, identity: 'a'.repeat(64)});
  return {model, memory, table, encoder, session};
}
function start(a) {
  const experience = planG0Schedule(a.table)[0].experience;
  const rows = ['A', 'B'].map(action => {
    const encoded = a.encoder.encode({cue: experience.publicInput.cue, action});
    a.model.forward([0], encoded.stimulation);
    return {action, cueHash: digest(encoded), score: a.model.h[2][3]};
  });
  a.session.start(experience, {cue: experience.publicInput.cue, encoderIdentity: a.encoder.identity,
    memoryHash: digest(a.memory.snapshot()), rows,
    choice: rows[0].score === rows[1].score ? null : rows[0].score > rows[1].score ? 'A' : 'B'});
}
function publish(path, state) {
  const fd = openSync(path + '.partial', 'wx');
  try {writeFileSync(fd, encodeNativeCheckpoint(state)); fsyncSync(fd);} finally {closeSync(fd);}
  renameSync(path + '.partial', path);
}
if (process.argv[2] === '--resume-fixture') {
  const path = process.argv[3], state = decodeCheckpoint(readFileSync(path)), log = join(dirname(path), 'receipts.jsonl');
  const a = fixture(); a.session.restore(state.session);
  const pending = state.pendingReceipt, line = JSON.stringify(pending) + '\n', existing = readFileSync(log);
  if (existing.length === state.logBytes) {
    const fd = openSync(log, 'a');
    try {writeFileSync(fd, line); fsyncSync(fd);} finally {closeSync(fd);}
  } else {
    assert.equal(existing.length, state.logBytes + Buffer.byteLength(line));
    assert.equal(existing.subarray(state.logBytes).toString(), line);
  }
  state.logBytes += Buffer.byteLength(line); state.receiptCount++; state.chainHash = digest(pending);
  state.pendingReceipt = null; state.sequence++; publish(join(dirname(path), 'ack.checkpoint'), state);
  const eventsAfterAck = a.memory.events, remainder = [];
  while (a.session.pending.cursor < a.session.pending.plan.frames.length) remainder.push(a.session.step());
  const lesson = a.session.finish();
  console.log(JSON.stringify({eventsAfterAck, remainder, lesson, memory: a.memory.snapshot(),
    logRows: readFileSync(log, 'utf8').trim().split('\n').length}));
} else {
  test('native pending checkpoint resumes in a fresh process at both receipt acknowledgement crash boundaries',
    {skip: freemem() < 768 * 2 ** 20 ? 'Keep headroom for the parallel curriculum session' : false}, () => {
    const a = fixture(); start(a); const prefix = [], frames = [];
    let chainHash = 'b'.repeat(64);
    for (let i = 0; i < 3; i++) {
      const frame = a.session.step();
      const receipt = {sequence: i, previousChainHash: chainHash, kind: 'frame', frame};
      frames.push(receipt);
      if (i < 2) {prefix.push(JSON.stringify(receipt) + '\n'); chainHash = digest(receipt);}
    }
    const state = {sequence: 5, receiptCount: 2, logBytes: Buffer.byteLength(prefix.join('')), chainHash,
      pendingReceipt: frames[2], session: a.session.snapshot()};
    const remainder = [];
    while (a.session.pending.cursor < a.session.pending.plan.frames.length) remainder.push(a.session.step());
    const lesson = a.session.finish(), memory = a.memory.snapshot();
    for (const alreadyAppended of [false, true]) {
      const directory = mkdtempSync(join(tmpdir(), 'fly-native-recovery-'));
      try {
        const path = join(directory, 'pending.checkpoint'); publish(path, state);
        const log = join(directory, 'receipts.jsonl'); writeFileSync(log, prefix.join(''));
        if (alreadyAppended) appendFileSync(log, JSON.stringify(frames[2]) + '\n');
        const child = spawnSync(process.execPath, ['--max-old-space-size=64', fileURLToPath(import.meta.url), '--resume-fixture', path],
          {encoding: 'utf8', timeout: 20000, windowsHide: true});
        assert.equal(child.status, 0, child.stderr);
        const actual = JSON.parse(child.stdout);
        assert.equal(actual.eventsAfterAck, 3, 'Acknowledgement must not repeat the third update');
        assert.equal(actual.logRows, 3, 'Pending receipt must be acknowledged exactly once');
        assert.deepEqual(actual.remainder, remainder); assert.deepEqual(actual.lesson, lesson);
        assert.deepEqual(actual.memory, memory);
        const acknowledged = decodeCheckpoint(readFileSync(join(directory, 'ack.checkpoint')));
        assert.equal(acknowledged.pendingReceipt, null); assert.equal(acknowledged.receiptCount, 3);
        assert.equal(acknowledged.session.pending.cursor, 3);
      } finally {
        for (const name of ['pending.checkpoint', 'receipts.jsonl', 'ack.checkpoint']) {
          try {unlinkSync(join(directory, name));} catch (error) {if (error.code !== 'ENOENT') throw error;}
        }
        rmdirSync(directory);
      }
    }
  });
}
