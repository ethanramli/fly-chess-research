// Bounded engineering fixtures only; never load the connectome.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir, freemem} from 'node:os';
import {join, resolve, dirname, basename} from 'node:path';
import {createHash} from 'node:crypto';
import {SparseTrainer as Oracle} from '../../../../.codebase/src/supervised-baselines/trainer.mjs';
import {SparseTrainer as Candidate} from './candidate-trainer.mjs';
import {SparseAccumulator as OriginalAccumulator} from '../../../../.codebase/src/runtime/sparse-accumulator.mjs';
import {SparseAccumulator as CandidateAccumulator} from './candidate-accumulator.mjs';
import {adamStep} from '../../../../.codebase/src/supervised-baselines/adam.mjs';
import {saveCheckpoint, loadCheckpoint} from '../../../../.codebase/src/runtime/storage.mjs';

const fixture = {skip: freemem() < 512 * 2 ** 20 ? 'Preserve free memory for live audit' : false};
const graph = () => ({row: Int32Array.of(0, 1, 3, 5), col: Int32Array.of(2, 0, 2, 0, 1),
  sign: Int8Array.of(-1, 1, -1, 1, 1), initial: Float32Array.of(1, 2, 1, 2, 1),
  input: Int32Array.of(0, 1), output: Int32Array.of(2)});
const options = (precision, steps = 8) => ({precision, steps, inputDim: 2, outputs: 2, seed: 184});
function equal(a, b) {
  for (const key of ['params', 'grads', 'h', 'activity', 'signedMagnitude', 'drive', 'alpha',
    'prediction', 'dh', 'previousDh', 'driveGrad', 'count']) assert.deepEqual(b[key], a[key], key);
  assert.deepEqual(b.adam, a.adam);
  assert.deepEqual(b.graph, a.graph);
}

test('source pins and literal Wasm kernel are unchanged', fixture, () => {
  const manifest = JSON.parse(readFileSync(new URL('./source-manifest.json', import.meta.url)));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const [path, expected] of Object.entries(manifest.sources)) {
    assert.equal(sha(readFileSync(path)), expected);
    const name = path.includes('trainer') ? 'trainer' : 'accumulator';
    assert.equal(sha(readFileSync(new URL(`./oracle-${name}.mjs`, import.meta.url))), expected);
  }
  for (const [path, expected] of Object.entries(manifest.candidate))
    assert.equal(sha(readFileSync(new URL(path, import.meta.url))), expected);
  const source = name => readFileSync(new URL(name, import.meta.url), 'utf8').split('export class SparseAccumulator')[0];
  assert.equal(source('./candidate-accumulator.mjs'), source('./oracle-accumulator.mjs'));
});

test('both precisions retain exact forwards, complete histories, gradients and updates, including 40 steps', fixture, () => {
  for (const precision of ['float32', 'float64']) for (const steps of [1, 8, 40]) {
    const a = new Oracle(graph(), options(precision, steps)), b = new Candidate(graph(), options(precision, steps));
    a.params.bias.fill(.3); b.params.bias.fill(.3);
    a.params.input.fill(.2); b.params.input.fill(.2);
    equal(a, b);
    const bytes = b.allocatedBytes(), buffer = b.sparseAccumulator.memory.buffer;
    assert(b.h.every(h => h.buffer === buffer));
    assert.equal(b.drive, b.sparseAccumulator.drive); assert.equal(b.signedMagnitude, b.sparseAccumulator.weight);
    for (let iteration = 0; iteration < 12; iteration++) {
      const x = [.1 + iteration / 20, .8 - iteration / 40], stimulation = [{index: iteration % 3, current: .2}];
      const state = iteration % 2 ? [.1, .05, .2] : null;
      a.forward(x, stimulation, state); b.forward(x, stimulation, state); equal(a, b);
      a.backward([.2, -.1]); b.backward([.2, -.1]); equal(a, b);
      assert.deepEqual(b.step({learningRate: .01}), a.step({learningRate: .01})); equal(a, b);
      a.setMagnitude(1, .1 + iteration / 100); b.setMagnitude(1, .1 + iteration / 100);
      a.params.magnitude[2] = .2 + iteration / 100; b.params.magnitude[2] = .2 + iteration / 100;
      a.refreshSignedMagnitude([2]); b.refreshSignedMagnitude([2]); equal(a, b);
      assert.equal(b.allocatedBytes(), bytes); assert.equal(buffer, b.sparseAccumulator.memory.buffer);
    }
    assert.throws(() => b.sparseAccumulator.memory.grow(1), RangeError);
    assert.equal(buffer, b.sparseAccumulator.memory.buffer);
  }
});

test('actual Adam and checkpoint restoration update shared weights with exact continuation', fixture, () => {
  for (const precision of ['float32', 'float64']) {
    const a = new Oracle(graph(), options(precision)), b = new Candidate(graph(), options(precision));
    for (let i = 0; i < 3; i++) {
      a.forward([.3, .7]); b.forward([.3, .7]);
      a.backward([.4, -.2]); b.backward([.4, -.2]);
      assert.deepEqual(adamStep(b), adamStep(a)); equal(a, b);
    }
    const directory = mkdtempSync(join(tmpdir(), 'fly-shared-wasm-'));
    let passed = false;
    try {
      saveCheckpoint(a, join(directory, 'checkpoint'), {marker: 'original'});
      const restoredA = new Oracle(graph(), options(precision)), restoredB = new Candidate(graph(), options(precision));
      assert.deepEqual(loadCheckpoint(restoredB, join(directory, 'checkpoint')), loadCheckpoint(restoredA, join(directory, 'checkpoint')));
      equal(restoredA, restoredB);
      restoredA.forward([.5, .1], [], [.1, .3, .2]); restoredB.forward([.5, .1], [], [.1, .3, .2]);
      equal(restoredA, restoredB);
      restoredA.backward([-.1, .6]); restoredB.backward([-.1, .6]);
      assert.deepEqual(adamStep(restoredB), adamStep(restoredA)); equal(restoredA, restoredB);
      passed = true;
    } catch (error) { error.message += `; preserved: ${directory}`; throw error; }
    finally {
      if (passed) {
        assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert(basename(directory).startsWith('fly-shared-wasm-'));
        rmSync(directory, {recursive: true});
      }
    }
  }
});

test('owned histories remove precisely the weight/drive/previous copies while refreshing topology', fixture, () => {
  const model = new Candidate(graph(), options('float32')), accumulator = model.sparseAccumulator, counts = {};
  for (const key of ['row', 'col', 'weight', 'drive', 'previous']) {
    const array = accumulator[key], original = array.set.bind(array);
    array.set = (...args) => { counts[key] = (counts[key] ?? 0) + 1; return original(...args); };
  }
  model.forward([.5, .1]);
  assert.deepEqual(counts, {drive: 1, row: 1, col: 1}); // drive.set(bias) constructs the input; no boundary copy.
  model.graph.col[0] = 1; model.forward([.1, .2]); assert.equal(accumulator.col[0], 1);
  const saved = accumulator.history.map(h => h.slice());
  accumulator.accumulate(Float32Array.of(.1, .3, .2)); assert.equal(counts.previous, 1);
  assert.deepEqual(accumulator.history, saved);
});

test('external input fallback, result aliasing and malformed topology preserve original semantics', fixture, () => {
  for (const Type of [Float32Array, Float64Array]) {
    const g1 = graph(), g2 = graph(), a = new OriginalAccumulator(g1, Type), b = new CandidateAccumulator(g2, Type, 9);
    const weights = Type.of(-.1, .2, -.3, .4, .5), drive = Type.of(.1, .2, .3), previous = Type.of(.3, .2, .1);
    a.prepare(weights, drive); b.prepare(weights, drive);
    assert.deepEqual(b.accumulate(previous), a.accumulate(previous));
    // The old result is a legal next input; it must be copied before output overwrites it.
    assert.deepEqual(b.accumulate(b.result), a.accumulate(a.result));
    for (const [field, index, value] of [['col', 0, 3], ['row', 1, 6], ['row', 0, -1]]) {
      const old = g1[field][index]; g1[field][index] = value; g2[field][index] = value;
      const run = accumulator => { accumulator.prepare(weights, drive); accumulator.accumulate(previous); };
      assert.throws(() => run(a)); assert.throws(() => run(b));
      g1[field][index] = old; g2[field][index] = old;
    }
    assert.throws(() => b.accumulate([1]));
    assert.throws(() => new CandidateAccumulator(g2, Type, -1));
  }
});
