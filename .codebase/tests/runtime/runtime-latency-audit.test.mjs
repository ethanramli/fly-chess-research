import test from 'node:test';
import assert from 'node:assert/strict';
import {computeRuntimeTimings} from '../../scripts/evaluation-and-performance/audit-training-runtime.mjs';

function fixture() {
  const batches = [['json6', 0], ['nativeZstd1', 0], ['nativeZstd1', 1], ['json6', 1]]
    .map(([variant, round]) => ({id: `round${round}-${variant}`, variant, round}));
  const protocol = {batches, gates: {minPerConditionElapsedReduction: .4,
    minPooledElapsedReduction: .45, minColdInvocationElapsedReduction: .45}};
  const reports = Object.fromEntries(batches.map(batch => [batch.id, {
    processUptimeSeconds: batch.variant === 'json6' ? 30 : 15,
    samples: Array.from({length: 12}, (_, index) => ({variant: batch.variant, round: batch.round,
      stageId: `arm-${Math.floor(index / 2)}`, lesson: index % 2,
      elapsedMs: batch.variant === 'json6' ? 2000 : 1000, cpuUs: 400000,
      finalStateHash: `state-${index}`, finalMemoryHash: `memory-${index}`})),
  }]));
  return {protocol, reports};
}

test('independent runtime timing arithmetic reports seconds, experience throughput and elapsed reduction', () => {
  const {protocol, reports} = fixture(), result = computeRuntimeTimings(protocol, reports);
  assert.equal(result.pooledReduction, .5); assert.equal(result.coldInvocationReduction, .5);
  assert.equal(result.variants.json6.secondsPerLesson, 2); assert.equal(result.variants.nativeZstd1.secondsPerLesson, 1);
  assert.equal(result.variants.json6.experiencesPerMinute, 30); assert.equal(result.variants.nativeZstd1.experiencesPerMinute, 60);
  assert.deepEqual(result.gates, {perCondition: true, pooled: true, coldInvocation: true});
});

test('a strong pooled number cannot hide a regressed control condition', () => {
  const {protocol, reports} = fixture();
  for (const report of Object.values(reports)) for (const sample of report.samples)
    if (sample.variant === 'nativeZstd1') sample.elapsedMs = sample.stageId === 'arm-0' ? 2100 : 200;
  const result = computeRuntimeTimings(protocol, reports);
  assert.equal(result.gates.pooled, true); assert.equal(result.gates.perCondition, false);
  assert(result.perCondition['arm-0'] < 0);
});

test('warm lesson success does not imply a cold invocation improvement', () => {
  const {protocol, reports} = fixture();
  for (const report of Object.values(reports)) report.processUptimeSeconds = 30;
  const result = computeRuntimeTimings(protocol, reports);
  assert.equal(result.gates.pooled, true); assert.equal(result.gates.coldInvocation, false);
});

test('missing pairs, duplicate samples and unequal states are rejected', () => {
  for (const corruption of ['missing', 'duplicate', 'state']) {
    const {protocol, reports} = fixture(), rows = reports['round0-nativeZstd1'].samples;
    if (corruption === 'missing') rows.pop();
    else if (corruption === 'duplicate') rows[1] = {...rows[0]};
    else rows[0].finalStateHash = 'changed';
    assert.throws(() => computeRuntimeTimings(protocol, reports));
  }
});
