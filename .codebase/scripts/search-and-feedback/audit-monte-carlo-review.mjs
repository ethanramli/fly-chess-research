import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
if (!args.run) throw Error('Require --run');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = readFileSync(join(args.run, 'report.json')), report = JSON.parse(reportBytes);
assert.equal(report.schema, 'monte-carlo-review-software-probe-v1');
for (const [path, sha] of Object.entries(report.sources)) assert.equal(hash(readFileSync(path)), sha);
let tracesChecked = 0, certificatesChecked = 0, defensesChecked = 0;
for (const result of report.results) {
  const bytes = readFileSync(result.traceFile); assert.equal(hash(bytes), result.traceSha256);
  const traces = bytes.toString().trim().split('\n').map(line => JSON.parse(line));
  assert.ok(traces.length <= 32); assert.equal(traces.length, result.calculation.simulations);
  const board = new Chess(result.fixture.fen), prefixVisits = new Map(), rootVisits = new Map();
  assert.equal(result.review.task.pgn, board.pgn()); assert.equal(result.taskHistoryPreserved, true);
  for (let i = 0; i < traces.length; i++) {
    const t = traces[i], copy = new Chess(result.fixture.fen); assert.equal(t.index, i);
    assert.ok(t.moves.length <= 3); const prefix = [];
    for (const move of t.moves) {
      assert.equal(copy.isGameOver(), false);
      copy.move({ from: move.slice(0, 2), to: move.slice(2, 4),
        ...(move.length === 5 ? { promotion: move[4] } : {}) });
      prefix.push(move); prefixVisits.set(prefix.join(' '), (prefixVisits.get(prefix.join(' ')) ?? 0) + 1);
    }
    if (t.moves.length) rootVisits.set(t.moves[0], (rootVisits.get(t.moves[0]) ?? 0) + 1);
    assert.equal(copy.fen(), t.leafFen);
    if (t.reason === 'terminal') {
      assert.equal(copy.isGameOver(), true); const value = copy.isCheckmate() ? -1 : 0;
      // JSON canonicalizes -0 to 0; the draw perspective remains zero.
      assert.equal(t.rootEstimate, value === 0 ? 0 : value * (t.moves.length % 2 ? -1 : 1));
      assert.equal(t.evidence, 'observed-terminal');
    } else if (t.evidence === 'unknown-cutoff') assert.equal(t.rootEstimate, null);
    else { assert.equal(t.evidence, 'model-estimate'); assert.ok(Math.abs(t.rootEstimate) <= 1); }
    tracesChecked++;
  }
  for (const c of result.calculation.candidates) assert.equal(c.visits, rootVisits.get(c.uci) ?? 0);
  for (const evidence of result.review.evidence) {
    if (evidence.proof.status === 'unknown') {
      assert.equal(evidence.proof.reward, null); continue;
    }
    const copy = new Chess(result.fixture.fen), move = evidence.move;
    copy.move({ from: move.slice(0, 2), to: move.slice(2, 4),
      ...(move.length === 5 ? { promotion: move[4] } : {}) });
    const check = checkMateCertificate(evidence.proof.certificate, copy,
      { attacker: board.turn(), plies: result.fixture.plies - 1, maxNodes: 4096 });
    assert.equal(check.verified, true, check.reason); assert.equal(check.status, evidence.proof.status);
    certificatesChecked++;
  }
  for (const d of result.review.diagnostics.filter(d => d.kind.startsWith('verified-defense-'))) {
    const e = result.review.evidence.find(e => e.move === d.candidate);
    assert.equal(e.proof.status, 'failure'); assert.equal(e.proof.certificate.tree.children.length, 1);
    assert.equal(e.proof.certificate.tree.children[0].move, d.reply);
    const n = prefixVisits.get([d.candidate, d.reply].join(' ')) ?? 0;
    assert.equal(d.sampled, n); assert.equal(d.kind, n ? 'verified-defense-sampled' : 'verified-defense-not-sampled');
    defensesChecked++;
  }
  for (const event of result.review.teachingExperiences) {
    const e = result.review.evidence.find(e => e.move === event.move);
    assert.equal(event.outcome, e.proof.status);
    assert.equal(event.certificateSha256, hash(JSON.stringify(e.proof.certificate)));
    assert.equal(event.neuralDelivery, 'not-implemented');
  }
}
const audit = { passed: true, reportSha256: hash(reportBytes), tracesChecked,
  certificatesChecked, defensesChecked,
  scope: 'Independent software-record replay only; no fly learning or transfer evidence' };
writeFileSync(join(args.run, 'audit.json'), JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit));
