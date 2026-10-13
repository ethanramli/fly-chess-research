import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { NeuralEpisode } from '../../src/neural-learning/neural-episode.mjs';
const identity = 'a'.repeat(64), frame = 'b'.repeat(64);
function model(steps = 2) {
  const graph = { row: Int32Array.from([0,1,2]), col: Int32Array.from([1,0]),
    sign: Int8Array.from([1,-1]), initial: Float32Array.from([1,1]),
    input: Int32Array.from([0]), output: Int32Array.from([1]) };
  return new SparseTrainer(graph, { steps, inputDim: 1, outputs: 1, seed: 47 });
}
test('two continuous frames equal one longer unroll; ordinary forward still resets', () => {
  const m = model(), episode = new NeuralEpisode(m, { identity, maxFrames: 2 }), longer = model(4);
  const params = structuredClone(m.params), stimulation = [{ index: 0, current: 1 }];
  episode.begin(); episode.present([0], stimulation, frame); episode.present([0], stimulation, frame);
  longer.forward([0], stimulation);
  assert.deepEqual(episode.state, longer.h[4]);
  const accumulated = [...episode.state];
  m.forward([0], stimulation); assert.notDeepEqual([...m.h[2]], accumulated);
  assert.deepEqual(m.params, params); assert.deepEqual([...m.graph.sign], [1,-1]);
  assert.throws(() => episode.present([0], stimulation, frame), /exhausted/);
  episode.end(); episode.begin(); episode.present([0], stimulation, frame);
  assert.deepEqual(episode.state, m.h[2]);
});
test('checkpoint resumes the next frame exactly; incompatible restore and invalid input preserve episode', () => {
  const a = new NeuralEpisode(model(), { identity }), b = new NeuralEpisode(model(), { identity });
  a.begin(); a.present([0], [{ index: 0, current: 1 }], frame);
  b.restore(JSON.parse(JSON.stringify(a.snapshot())));
  assert.deepEqual(a.present([0], [], frame), b.present([0], [], frame));
  assert.deepEqual(a.snapshot(), b.snapshot());
  const before = a.snapshot();
  assert.throws(() => a.restore({ ...before, identity: 'c'.repeat(64) }), /Incompatible/);
  assert.throws(() => a.present([NaN], [], frame), /Nonfinite/);
  assert.deepEqual(a.snapshot(), before);
  a.end(); assert.throws(() => a.present([0], [], frame), /Inactive/);
});
