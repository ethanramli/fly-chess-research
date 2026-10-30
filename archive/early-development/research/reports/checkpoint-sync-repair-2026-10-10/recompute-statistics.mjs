// Reporting correction only: original samples, protocols and gates stay frozen.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const median = values => {
  const a = values.toSorted((x, y) => x - y), mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const audit = JSON.parse(readFileSync('research/reports/independent-wasm-audit-2026-10-10/recomputed.json'));
const runs = [];
for (const [kind, dir] of [['wasm', 'runs/move-latency-wasm-v1'], ['zero-reset', 'runs/move-latency-zero-reset-v1']]) {
  const report = JSON.parse(readFileSync(`${dir}/report.json`));
  const samples = readFileSync(`${dir}/samples.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  const fixtures = report.protocol.fixtures.map(f => {
    const metrics = Object.fromEntries(['oracle', 'candidate'].map(name => {
      const rows = samples.filter(s => s.fixture === f.id && s.name === name);
      assert.equal(rows.length, 4);
      const values = rows.map(s => s.elapsedMs).toSorted((a, b) => a - b);
      const conventionalMedianMs = median(values);
      const nearestRankP50Ms = values[1], sampleMaximumMs = values.at(-1);
      const original = report.summaries.find(s => s.fixture === f.id)[name];
      assert.equal(nearestRankP50Ms, original.medianMs);
      assert.equal(sampleMaximumMs, original.p95Ms);
      const audited = audit.runs.find(r => r.kind === kind).fixtures.find(r => r.id === f.id).metrics[name].elapsedMs;
      assert.equal(conventionalMedianMs, audited.conventionalMedian);
      return [name, { count: rows.length, conventionalMedianMs, historicalNearestRankP50Ms: nearestRankP50Ms, sampleMaximumMs }];
    }));
    return { fixture: f.id, ...metrics,
      conventionalMedianReductionPercent: 100 * (1 - metrics.candidate.conventionalMedianMs / metrics.oracle.conventionalMedianMs),
      correctedInequalitiesPass: metrics.candidate.conventionalMedianMs < metrics.oracle.conventionalMedianMs
        && metrics.candidate.sampleMaximumMs <= metrics.oracle.sampleMaximumMs };
  });
  const aggregate = Object.fromEntries(['oracle', 'candidate'].map(name => [name,
    median(samples.filter(s => s.name === name).map(s => s.elapsedMs))]));
  const correctedOutcome = fixtures.every(f => f.correctedInequalitiesPass) && aggregate.candidate < aggregate.oracle;
  assert.equal(correctedOutcome, report.latencyGatePassed);
  runs.push({ kind, reportSHA256: hash(`${dir}/report.json`), samplesSHA256: hash(`${dir}/samples.jsonl`),
    fixtures, aggregateConventionalMedianMs: aggregate, historicalOutcome: report.latencyGatePassed, correctedOutcome });
}
writeFileSync(new URL('statistics-correction.json', import.meta.url), JSON.stringify({
  timestamp: new Date().toISOString(), method: 'Conventional sample median: average middle pair for even count',
  noNewTimingMeasurements: true, originalArtifactsUnchanged: true, independentAuditAgreement: true, runs,
  limits: 'Four paired warmed observations per fixture on one host; maximum is not a dependable tail estimate. No matched cold-server baseline, biological learning, reasoning or Elo claim.',
}, null, 2), { flag: 'wx' });
console.log(JSON.stringify(runs.map(r => ({ kind: r.kind, outcome: r.correctedOutcome, fixtures: r.fixtures }))));
