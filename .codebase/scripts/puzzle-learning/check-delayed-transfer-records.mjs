import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
const run = 'research/reports/delayed-transfer-solvability-2026-10-07';
const hash = b => createHash('sha256').update(b).digest('hex');
const reportBytes = readFileSync(`${run}/report.json`), report = JSON.parse(reportBytes);
assert.equal(hash(readFileSync(report.input)), report.inputSha256);
for (const [path, expected] of Object.entries(report.sources)) assert.equal(hash(readFileSync(path)), expected);
const fixtures = readFileSync(report.input, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const records = readFileSync(`${run}/certificates.jsonl`, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
let checked = 0;
for (const fixture of fixtures) {
  const board = new Chess(fixture.fen), rows = records.filter(r => r.id === fixture.id);
  const legal = board.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();
  assert.deepEqual(rows.map(r => r.review.move).sort(), legal);
  const counts = { success: 0, failure: 0, unknown: 0 }, successful = [];
  for (const { review: e } of rows) {
    assert.equal(e.context.fen, fixture.fen); assert.equal(e.actor, board.turn());
    assert.deepEqual(e.context.task, { objective: fixture.objective, plies: fixture.plies });
    const replay = new Chess(); replay.loadPgn(e.context.pgn); assert.equal(replay.fen(), fixture.fen);
    replay.move({ from: e.move.slice(0, 2), to: e.move.slice(2, 4), ...(e.move[4] ? { promotion: e.move[4] } : {}) });
    assert.notEqual(e.status, 'unknown');
    const result = checkMateCertificate(e.proof.certificate, replay, { attacker: e.actor, plies: fixture.plies - 1, maxNodes: 100000, milliseconds: 2000 });
    assert.equal(result.verified, true); assert.equal(result.status, e.status);
    assert.equal(hash(JSON.stringify(e.proof.certificate)), e.certificateSha256);
    counts[e.status]++; if (e.status === 'success') successful.push(e.move); checked++;
  }
  const summary = report.summary.find(r => r.id === fixture.id);
  assert.deepEqual(counts, summary.counts); assert.deepEqual(successful, summary.successful);
}
assert.equal(checked, records.length);
const audit = { passed: true, certificatesChecked: checked, reportSha256: hash(reportBytes),
  scope: 'Independent legal-set coverage, context binding and complete certificate replay; no neural learning claim.' };
writeFileSync(`${run}/audit.json`, JSON.stringify(audit, null, 2)); console.log(JSON.stringify(audit));
