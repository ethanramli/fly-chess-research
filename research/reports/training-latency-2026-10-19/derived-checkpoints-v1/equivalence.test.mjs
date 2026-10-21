import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {serialize} from 'node:v8';
import {zstdCompressSync} from 'node:zlib';
import {endianness} from 'node:os';
import {SparseTrainer} from '../../../../.codebase/src/supervised-baselines/trainer.mjs';
import {RateTimingMemory} from '../../../../.codebase/src/neural-learning/rate-timing-memory.mjs';
import {createG0Table, createG0Encoder, G0FeedbackSession as Legacy} from '../../../../.codebase/src/neural-learning/curriculum-g0.mjs';
import {G0FeedbackSession as Candidate} from '../../../../.codebase/src/neural-learning/curriculum-g0-derived-candidate.mjs';
import {planG0HistoryDiagnostic} from '../../../../.codebase/src/neural-learning/g0-reversal-history-diagnostic.mjs';
import {readConsequenceValue} from '../../../../.codebase/src/neural-learning/consequence-value-readout.mjs';
import {digest} from '../../../../.codebase/src/neural-learning/mushroom-body.mjs';
import {DerivedNeuralEpisode, neuralStateHash} from '../../../../.codebase/src/neural-learning/derived-neural-episode-candidate.mjs';
import {encodeDerivedCheckpoint, decodeDerivedCheckpoint} from '../../../../.codebase/src/runtime/derived-checkpoint-codec-candidate.mjs';

const base = JSON.parse(readFileSync('runs/g0-history-fixture-v1-uninterrupted/protocol.json', 'utf8'));
const plan = planG0HistoryDiagnostic();
const slots = plan.stages.filter(s => s.phase === 'acquisition').flatMap(s => s.slots.slice(0, s.condition.kind === 'informative' ? 2 : 1));
assert.equal(slots.length, 7);
const hash = bytes => createHash('sha256').update(bytes).digest();
function independentHash(state) {
  let bytes = Buffer.from(state.buffer, state.byteOffset, state.byteLength);
  if (endianness() !== 'LE') { bytes = Buffer.from(bytes); state instanceof Float32Array ? bytes.swap32() : bytes.swap64(); }
  return createHash('sha256').update(JSON.stringify({schema: 'neural-state-le-bytes-v1',
    dtype: state instanceof Float32Array ? 'f32' : 'f64', length: state.length}) + '\n').update(bytes).digest('hex');
}
function fixture(Type = Candidate, precision = 'float32') {
  const graph = Object.fromEntries(Object.entries(base.fixtureGraph).map(([k, v]) =>
    [k, k === 'initial' ? Float32Array.from(v) : k === 'sign' ? Int8Array.from(v) : Int32Array.from(v)]));
  const model = new SparseTrainer(graph, {...base.model, precision}); model.forward([0]);
  const mapping = JSON.parse(readFileSync(base.mappingPath, 'utf8'));
  const memory = new RateTimingMemory(model, mapping, Float32Array.from(model.h[model.steps]), base.memory);
  const table = createG0Table(), encoder = createG0Encoder(mapping, {...base.encoder, seed: base.projectionSeeds[0]});
  const session = new Type({model, memory, mapping, table, encoder, timing: base.timing, identity: 'd'.repeat(64)});
  const rates = () => Object.fromEntries(Object.entries(base.readout.cells).map(([key, cells]) =>
    [key, cells.map(cell => model.h[model.steps][cell.index])]));
  const baselines = new Map();
  for (const {experience} of slots) for (const action of ['A', 'B']) {
    const encoded = encoder.encode({cue: experience.publicInput.cue, action});
    model.forward([0], encoded.stimulation); baselines.set(digest(encoded), rates());
  }
  function assess(experience) {
    const before = digest(memory.snapshot());
    const rows = ['A', 'B'].map(action => {
      const encoded = encoder.encode({cue: experience.publicInput.cue, action}); model.forward([0], encoded.stimulation);
      const response = rates(), value = readConsequenceValue(response, baselines.get(digest(encoded)), base.readout.scale);
      return {action, cueHash: digest(encoded), rates: response, ...value, score: value.value};
    });
    assert.equal(digest(memory.snapshot()), before);
    return {cue: experience.publicInput.cue, encoderIdentity: encoder.identity, memoryHash: before, rows,
      choice: rows[0].score === rows[1].score ? null : rows[0].score > rows[1].score ? 'A' : 'B'};
  }
  return {model, memory, session, assess};
}
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const frameSemantics = value => without(value, ['schema', 'neuralStateHash', 'neuralHashEncoding', 'previousChainHash', 'chainHash']);

test('binary neural evidence covers precision, offsets, signed zero and invalid states independently', () => {
  for (const Type of [Float32Array, Float64Array]) {
    const backing = Type.of(999, -0, .125, 1, 999), state = backing.subarray(1, 4);
    assert.equal(neuralStateHash(state), independentHash(state));
    const positive = state.slice(); positive[0] = 0;
    assert.notEqual(neuralStateHash(positive), neuralStateHash(state));
    for (const invalid of [Type.of(NaN), Type.of(Infinity), new Type(262145)]) assert.throws(() => neuralStateHash(invalid));
  }
  assert.notEqual(neuralStateHash(Float32Array.of(1)), neuralStateHash(Float64Array.of(1)));
  for (const invalid of [[1], new Uint32Array(2), null]) assert.throws(() => neuralStateHash(invalid));
});

test('typed rollback preserves both episode precisions and rejects incompatible state', () => {
  for (const precision of ['float32', 'float64']) {
    const f = fixture(Candidate, precision), episode = f.session.episode;
    assert(episode instanceof DerivedNeuralEpisode); episode.begin();
    episode.present([0], [{index: 0, current: .5}], 'a'.repeat(64));
    const before = episode.snapshot(), metadata = episode.metadata();
    assert(!Object.hasOwn(metadata, 'state')); before.state[0] += 1;
    assert.notEqual(before.state[0], episode.state[0]); before.state.set(episode.state);
    episode.present([0], [], 'b'.repeat(64)); episode.restore(before);
    assert.deepEqual(episode.metadata(), metadata);
    for (const mutate of [s => {s.state = Array.from(s.state);}, s => {s.state[0] = NaN;},
      s => {s.state[0] = -1;}, s => {s.frames = 33;}, s => {s.active = false;}, s => {s.identity = 'b'.repeat(64);},
      s => {s.state = precision === 'float32' ? Float64Array.from(s.state) : Float32Array.from(s.state); }]) {
      const changed = structuredClone(before); mutate(changed); assert.throws(() => episode.restore(changed));
      assert.deepEqual(episode.metadata(), metadata);
    }
  }
});

test('all six actual arms and both informative valences preserve every trajectory and local update', () => {
  for (const precision of ['float32', 'float64']) for (const {experience, options} of slots) {
    const a = fixture(Legacy, precision), b = fixture(Candidate, precision);
    const assessed = a.assess(experience); assert.deepEqual(b.assess(experience), assessed);
    assert.deepEqual(a.session.start(experience, assessed, options), b.session.start(experience, assessed, options));
    const initial = a.memory.snapshot();
    while (a.session.pending.cursor < a.session.pending.plan.frames.length) {
      const oldReceipt = a.session.step(), newReceipt = b.session.step();
      assert.deepEqual(frameSemantics(oldReceipt), frameSemantics(newReceipt));
      assert.deepEqual(a.model.h, b.model.h); assert.deepEqual(a.model.activity, b.model.activity);
      assert.deepEqual(a.session.episode.state, b.session.episode.state);
      assert.deepEqual(a.memory.snapshot(), b.memory.snapshot());
      assert.equal(newReceipt.neuralStateHash, independentHash(a.session.episode.state));
      const compact = b.session.snapshot(); assert(!Object.hasOwn(compact.episode, 'state'));
      assert.equal(compact.episode.stateHash, independentHash(a.session.episode.state));
    }
    assert.deepEqual(without(a.session.finish(), ['schema', 'chainHash']),
      without(b.session.finish(), ['schema', 'chainHash', 'neuralHashEncoding']));
    if (options.condition === 'disabled') assert.deepEqual(b.memory.snapshot(), initial);
  }
});

test('every lesson cursor restores from verified prefix without duplicating persistent updates', async () => {
  for (const {experience, options} of slots) {
    const source = fixture(); source.session.start(experience, source.assess(experience), options);
    const frames = source.session.pending.plan.frames.length;
    for (let cursor = 0; cursor <= frames; cursor++) {
      const published = decodeDerivedCheckpoint(encodeDerivedCheckpoint({session: source.session.snapshot()})).session;
      const restored = fixture(); let paced = 0;
      const result = await restored.session.restore(published, {pace: async fn => {paced++; return fn();}});
      assert.equal(paced, cursor); assert.equal(result.reconstructedFrames, cursor);
      assert.deepEqual(restored.session.snapshot(), published);
      assert.deepEqual(restored.session.episode.state, source.session.episode.state);
      if (cursor < frames) {
        assert.deepEqual(restored.session.step(), source.session.step());
        assert.deepEqual(restored.memory.snapshot(), source.memory.snapshot());
      } else assert.deepEqual(restored.session.finish(), source.session.finish());
    }
    const finished = source.session.snapshot(), restored = fixture();
    const result = await restored.session.restore(finished);
    assert.equal(result.reconstructedFrames, 0); assert.deepEqual(restored.session.snapshot(), finished);
  }
});

test('corrupt/unknown plans, memory, chain, metadata and failed pacing reject with complete rollback', async () => {
  const {experience, options} = slots[0], source = fixture();
  source.session.start(experience, source.assess(experience), options);
  for (let i = 0; i < 3; i++) source.session.step();
  const publication = source.session.snapshot(), target = fixture();
  target.session.start(experience, target.assess(experience), options); target.session.step();
  const before = target.session.snapshot(), beforeState = target.session.episode.state.slice();
  for (const mutate of [s => {s.pending.cursor++;}, s => {s.pending.chainHash = 'a'.repeat(64);},
    s => {s.episode.stateHash = 'a'.repeat(64);}, s => {s.memory.gains[0] += .01;},
    s => {s.pending.startMemory.gains[0] += .01;}, s => {s.pending.experience.proof.status = 'unknown';},
    s => {s.pending.experience.proof = null; s.pending.experience.status = 'unknown';},
    s => {s.pending.plan.frames.pop();}, s => {s.pending.binding.assessment.memoryHash = 'a'.repeat(64);},
    s => {s.episode.dtype = 'f64';}, s => {s.episode.state = [0];}, s => {s.schema = 'temporal-feedback-session-v1';},
    s => {s.pending.cursor = 33;}, s => {s.episode.frameIdentity = null;}, s => {s.pending.startEvents++;}]) {
    const changed = structuredClone(publication); mutate(changed);
    await assert.rejects(target.session.restore(changed, {pace: async fn => fn()}));
    assert.deepEqual(target.session.snapshot(), before); assert.deepEqual(target.session.episode.state, beforeState);
  }
  const badPaces = [undefined, async () => {}, async () => {throw Error('pacing failed');},
    async fn => {fn(); throw Error('failed after frame');}, async fn => {fn(); fn();},
    async fn => {fn(); try {fn();} catch { /* Must reject even a swallowed duplicate attempt. */ }}];
  for (const pace of badPaces) {
    await assert.rejects(target.session.restore(publication, {pace}));
    assert.deepEqual(target.session.snapshot(), before); assert.deepEqual(target.session.episode.state, beforeState);
  }
});

test('recovery prevents concurrent use and rejects late callbacks without another frame', async () => {
  const {experience, options} = slots[0], source = fixture(), target = fixture();
  source.session.start(experience, source.assess(experience), options); source.session.step();
  const publication = source.session.snapshot(); let release, late;
  const restoring = target.session.restore(publication, {pace: fn => {late = fn; return new Promise(r => {release = r;});}});
  for (const use of [() => target.session.snapshot(), () => target.session.step(), () => target.session.finish(),
    () => target.session.start(experience, {}, options)]) assert.throws(use, /recovery/);
  await assert.rejects(target.session.restore(publication, {pace: async fn => fn()}), /recovery/);
  late(); release(); await restoring;
  const before = target.session.snapshot(); assert.throws(late, /exactly one/); assert.deepEqual(target.session.snapshot(), before);
});

test('unknown teaching and failed nonlocal neural evidence leave no persistent event or cursor change', () => {
  const f = fixture(), {experience, options} = slots[0], before = f.session.snapshot();
  const unknown = {...structuredClone(experience), proof: null, status: 'unknown'};
  assert.equal(f.session.start(unknown, f.assess(experience), options).skipped, true);
  assert.deepEqual(f.session.snapshot(), before);
  f.session.start(experience, f.assess(experience), options); const started = f.session.snapshot();
  const forward = f.model.forward.bind(f.model);
  f.model.forward = (...args) => {const value = forward(...args); f.model.h[f.model.steps][5] = NaN; return value;};
  assert.throws(() => f.session.step(), /finite typed/); assert.deepEqual(f.session.snapshot(), started);
  f.model.forward = forward; f.session.step(); assert.equal(f.session.pending.cursor, 1);
});

test('new envelope rejects legacy formats, corruption, wrong schemas, vectors and excessive output', () => {
  const f = fixture(), root = {session: f.session.snapshot()}, bytes = encodeDerivedCheckpoint(root);
  assert.deepEqual(decodeDerivedCheckpoint(bytes), root);
  for (const changed of [Buffer.from(bytes), Buffer.from(bytes), Buffer.alloc(16 * 2 ** 20 + 1)]) {
    changed[0] ^= 1; assert.throws(() => decodeDerivedCheckpoint(changed));
  }
  const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1; assert.throws(() => decodeDerivedCheckpoint(changed));
  assert.throws(() => encodeDerivedCheckpoint({session: {schema: 'temporal-feedback-session-v1', episode: {state: [0]}}}));
  assert.throws(() => encodeDerivedCheckpoint({...root, extra: 'x'.repeat(16 * 2 ** 20)}));
  const compressed = zstdCompressSync(serialize({schema: 'wrong', state: root}));
  assert.throws(() => decodeDerivedCheckpoint(Buffer.concat([Buffer.from('FCD1'), hash(compressed), compressed])));
  const decompressionBomb = zstdCompressSync(Buffer.alloc(16 * 2 ** 20 + 1));
  assert.throws(() => decodeDerivedCheckpoint(Buffer.concat([Buffer.from('FCD1'), hash(decompressionBomb), decompressionBomb])));
});

test('actual runner reconstructs before pending acknowledgement and resumes acknowledged state in fresh processes', () => {
  const directory = mkdtempSync(resolve('runs', 'derived-recovery-fixture-'));
  // Preserve receipts and failed attempts as evidence, including successful fixture runs.
  const protocol = structuredClone(base), manifest = JSON.parse(readFileSync(new URL('./source-manifest.json', import.meta.url), 'utf8'));
  protocol.schema = 'g0-history-derived-engineering-v1';
  protocol.scope = 'Six-neuron derived-checkpoint software recovery fixture only; not G0 or graph speed.';
  protocol.sources = Object.fromEntries([...new Set([...Object.keys(base.sources), ...Object.keys(manifest.sources)])]
    .map(path => [path, hash(readFileSync(path)).toString('hex')]));
  const protocolPath = join(directory, 'protocol.json'); writeFileSync(protocolPath, JSON.stringify(protocol));
  const runner = '.codebase/scripts/neural-learning/run-g0-history-derived-candidate.mjs';
  function run(name, interrupt, resume) {
    const out = join(directory, name), args = ['--max-old-space-size=256', runner, '--protocol', protocolPath,
      '--out', out, '--cpu-duty', '0.5', '--interrupt-after-pending', String(interrupt)];
    if (resume) args.push('--resume', resume);
    const result = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 120000, windowsHide: true});
    writeFileSync(join(directory, name + '-stdout.txt'), result.stdout ?? '');
    writeFileSync(join(directory, name + '-stderr.txt'), result.stderr ?? '');
    assert.equal(result.status, 75, JSON.stringify({status: result.status, error: result.error?.message, stderr: result.stderr, directory}));
    const pending = JSON.parse(result.stdout.trim().split('\n').at(-1));
    return {out, pending: pending.resume, state: decodeDerivedCheckpoint(readFileSync(pending.resume))};
  }
  const first = run('initial', 3), resumedPending = run('pending-resume', 4, first.pending);
  assert.equal(first.state.session.pending.cursor, 1); assert.equal(resumedPending.state.session.pending.cursor, 2);
  const firstLine = first.state.pendingReceipt;
  const lines = readFileSync(join(resumedPending.out, 'receipts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.at(-1), firstLine); assert.equal(lines.filter(r => r.sequence === firstLine.sequence).length, 1);
  const acknowledged = readdirSync(resumedPending.out).filter(name => name.endsWith('.checkpoint')).map(name => join(resumedPending.out, name))
    .find(path => {const s = decodeDerivedCheckpoint(readFileSync(path)); return s.pendingReceipt === null && s.receiptCount === 4;});
  assert(acknowledged); const resumedAck = run('ack-resume', 4, acknowledged);
  assert.deepEqual(resumedAck.state.session, resumedPending.state.session);
  assert.deepEqual(resumedAck.state.pendingReceipt, resumedPending.state.pendingReceipt);
  assert.equal(resumedAck.state.session.memory.events, resumedPending.state.session.memory.events);
  const corruptDirectory = join(directory, 'corrupt'); mkdirSync(corruptDirectory);
  const corrupt = structuredClone(first.state); corrupt.session.episode.stateHash = 'a'.repeat(64);
  const corruptPath = join(corruptDirectory, 'checkpoint.checkpoint');
  writeFileSync(corruptPath, encodeDerivedCheckpoint(corrupt));
  writeFileSync(join(corruptDirectory, 'receipts.jsonl'), readFileSync(join(first.out, 'receipts.jsonl')));
  const rejectedOut = join(directory, 'rejected'), rejected = spawnSync(process.execPath,
    ['--max-old-space-size=256', runner, '--protocol', protocolPath, '--out', rejectedOut, '--cpu-duty', '0.5', '--resume', corruptPath],
    {encoding: 'utf8', timeout: 120000, windowsHide: true});
  writeFileSync(join(directory, 'rejected-stderr.txt'), rejected.stderr ?? ''); assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Reconstructed episode differs/);
  assert.equal(readFileSync(join(rejectedOut, 'receipts.jsonl'), 'utf8'), readFileSync(join(first.out, 'receipts.jsonl'), 'utf8'));
  assert(!readdirSync(rejectedOut).some(name => name.endsWith('.checkpoint')), 'No acknowledgement or publication before successful reconstruction');
});
