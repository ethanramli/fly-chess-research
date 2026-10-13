import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCues, choose, samplingChoice, teacherFeedback, shuffledFeedback, signTest, summarize } from '../../src/neural-learning/association-validation.mjs';

test('choice depends on response and exploration, independent of teacher target', () => {
  const response = { A: 0.1, B: 0.3 };
  assert.equal(choose(response, 0.9, 0.5), 'A');
  assert.equal(choose(response, 0.3, 0.5), 'B');
  assert.equal(teacherFeedback('A', 'A'), true);
  assert.equal(teacherFeedback('A', 'B'), false);
  assert.equal(choose({ ...response, target: 'B' }, 0.9, 0.5), 'A');
  assert.equal(choose({ A: 0.3, B: 0.1 }, 0.9, 0.5), 'B');
  assert.throws(() => choose(response, 1, 0.5));
  assert.throws(() => teacherFeedback('unknown', 'A'));
});

test('cue draws are reproducible and disjoint; shuffled feedback preserves pulse count', () => {
  const neurons = Array.from({ length: 100 }, (_, i) => i);
  const cues = makeCues(neurons, 17, 0.05);
  assert.deepEqual(cues, makeCues(neurons, 17, 0.05));
  assert.notDeepEqual(cues, makeCues(neurons, 18, 0.05));
  assert.equal(new Set([...cues.A, ...cues.B]).size, 10);
  const events = [true, false, true, false, false, true, false, true];
  const shuffled = shuffledFeedback(events, 11);
  assert.equal(shuffled.filter(Boolean).length, events.filter(Boolean).length);
  assert.deepEqual(shuffled, shuffledFeedback(events, 11));
  assert.deepEqual(events, [true, false, true, false, false, true, false, true]);
});

test('exact sign test matches independent binomial probabilities and reports ties', () => {
  assert.deepEqual(signTest([1, 2, 3, 4, 5, 6], 0), { positive: 6, negative: 0, ties: 0, p: 1 / 64 });
  assert.equal(signTest([1, 1, 1, -1], 0).p, 5 / 16);
  assert.deepEqual(signTest([0, 1e-8], 1e-5), { positive: 0, negative: 0, ties: 2, p: 1 });
});

test('balanced sampling visits both cues without a teacher label, then restores free choice', () => {
  assert.deepEqual([0, 1, 2].map(i => samplingChoice(503, i, 'B', true)), ['A', 'B', 'B']);
  assert.deepEqual([0, 1, 2].map(i => samplingChoice(504, i, 'A', true)), ['B', 'A', 'A']);
  assert.equal(samplingChoice(503, 0, 'B', false), 'B');
});

test('acceptance rejects apparent learning when shuffled feedback performs equally well', () => {
  const protocol = { seeds: [1, 2, 3, 4, 5, 6], conditions: ['contingent', 'no-feedback', 'shuffled-feedback', 'plasticity-disabled'], marginTolerance: 1e-5, alpha: 0.05, claim: 'fixture' };
  const initial = { A: 1, B: 1, greedy: 'A' }, acquired = { A: 0.5, B: 1, greedy: 'A' }, reversed = { A: 0.5, B: 0.2, greedy: 'B' };
  const results = protocol.seeds.flatMap(seed => protocol.conditions.map(condition => {
    const learning = ['contingent', 'shuffled-feedback'].includes(condition);
    return { seed, condition, initialTarget: 'A', reversedTarget: 'B', fixedStatePreserved: true,
      trials: [{ phase: 'acquisition', delivered: true }, { phase: 'reversal', delivered: true }],
      probes: { baseline: initial, acquisition: learning ? acquired : initial, retention: learning ? acquired : initial,
        reversal: learning ? reversed : initial, reset: initial, restored: learning ? reversed : initial } };
  }));
  const report = summarize(results, protocol);
  assert.equal(report.gates.acquisition, true);
  assert.equal(report.gates.contingencyReversal, true);
  assert.equal(report.gates.informativeFeedback, false);
  assert.equal(report.allGatesPassed, false);
  assert.throws(() => summarize(results.slice(1), protocol), /Incomplete/);
});
