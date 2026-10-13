import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const reportPath = 'runs/move-latency-wasm-v1/report.json';
const report = JSON.parse(readFileSync(reportPath));
const samplesPath = 'runs/move-latency-wasm-v1/samples.jsonl';
const samples = readFileSync(samplesPath, 'utf8').trim().split('\n').map(JSON.parse);
const metric = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return { count: sorted.length, medianMs: sorted[Math.ceil(sorted.length / 2) - 1],
    p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1) };
};
const audited = [];
for (const fixture of report.protocol.fixtures) {
  const game = fixture.fen ? new Chess(fixture.fen) : new Chess();
  for (const move of fixture.moves ?? []) game.move(move);
  const legal = game.moves({ verbose: true });
  const rows = samples.filter(s => s.fixture === fixture.id);
  assert.equal(rows.length, 8);
  for (const row of rows) {
    assert.equal(row.candidates, legal.length);
    assert.equal(row.outputs.length, legal.length);
    assert.deepEqual(row.outputs, rows[0].outputs);
    assert.deepEqual(row.chosen, rows[0].chosen);
  }
  const equivalence = report.equivalence.filter(e => e.fixture === fixture.id);
  assert.deepEqual(equivalence.map(e => e.move).toSorted(), legal.map(m => m.lan).toSorted());
  assert.equal(new Set(equivalence.map(e => e.move)).size, legal.length);
  for (let i = 0; i < legal.length; i++) assert.deepEqual(equivalence[i].prediction, rows[0].outputs[i]);
  const oracle = metric(rows.filter(r => r.name === 'oracle').map(r => r.elapsedMs));
  const candidate = metric(rows.filter(r => r.name === 'candidate').map(r => r.elapsedMs));
  assert.deepEqual({ fixture: fixture.id, oracle, candidate }, report.summaries.find(s => s.fixture === fixture.id));
  assert.ok(candidate.medianMs < oracle.medianMs && candidate.p95Ms <= oracle.p95Ms);
  audited.push({ fixture: fixture.id, oracle, candidate,
    medianReductionPercent: 100 * (1 - candidate.medianMs / oracle.medianMs) });
}
for (const name of ['oracle', 'candidate']) assert.deepEqual(
  metric(samples.filter(s => s.name === name).map(s => s.elapsedMs)), report.aggregate[name]);
assert.ok(report.aggregate.candidate.medianMs < report.aggregate.oracle.medianMs);
assert.equal(report.exactEquivalence, true); assert.equal(report.fixedIdentities, true);
assert.equal(report.latencyGatePassed, true); assert.equal(report.resources.cpuDuty, .5);
assert.ok(report.resources.peakRssMiB <= 768 && report.resources.freeMiBAtEnd >= 256);
for (const [path, expected] of Object.entries(report.sources)) assert.equal(hash(path), expected, path);
writeFileSync(new URL('result-audit.json', import.meta.url), JSON.stringify({
  timestamp: new Date().toISOString(), node: process.version, passed: true,
  coverage: 'Independent recomputation from recorded samples, legal-move coverage, source hashes and resource report; full-buffer equivalence was asserted during the comparison',
  reportSHA256: hash(reportPath), samplesSHA256: hash(samplesPath), samples: samples.length,
  audited, resources: report.resources,
}, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ passed: true, audited, resources: report.resources }));
