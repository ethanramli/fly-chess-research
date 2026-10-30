import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { searchCesp99 } from '../../src/search-and-feedback/cesp99-search-adapter.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { uci, terminalValue } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
assert.ok(args.run);
const read = f => JSON.parse(readFileSync(f, 'utf8'));
const protocolPath = 'research/data/licensed-search-comparison-v1/protocol.json', p = read(protocolPath);
const reportPath = join(args.run, 'report.json'), report = read(reportPath);
assert.equal(report.complete, true); assert.equal(report.results.length, 8);
assert.equal(new Set(report.results.map(r => r.key)).size, 8);
assert.equal(report.identity.protocolSha256, await sha256(protocolPath));
assert.deepEqual(report.identity.sources, p.sources); assert.deepEqual(report.identity.inputs, p.inputs);
for (const [f, hash] of Object.entries({ ...p.sources, ...p.inputs })) assert.equal(await sha256(f), hash);
const learned = digest(read(p.learnedMemoryPath).learned);
const originalReport = read(p.requiredAudits.at(-1).report), naive = digest(originalReport.state.naive);
let certificates = 0, traces = 0, replayed = 0;
const outcomes = [];
for (const ref of report.results) {
  assert.equal(await sha256(ref.path), ref.sha256); const r = read(ref.path), task = { objective: r.row.objective, plies: r.row.plies };
  assert.equal(r.memoryBefore, r.condition === 'learned' ? learned : naive);
  assert.equal(r.memoryAfter, r.memoryBefore); assert.equal(r.fixedBefore, p.shared.invariant);
  assert.equal(r.fixedAfter, r.fixedBefore);
  assert.ok(r.search.evaluations <= p.search.maxEvaluations && r.search.nodes <= p.search.maxNodes);
  const makeBoard = () => { const b = new Chess(r.row.fen); if (r.row.pgn) b.loadPgn(r.row.pgn); return b; };
  let presentations = 0;
  for (const a of r.assessments) {
    const b = new Chess(); b.loadPgn(a.pgn); assert.equal(b.fen(), a.fen);
    assert.deepEqual(a.moves, b.moves({ verbose: true }).map(uci)); assert.deepEqual(a.task, task);
    assert.equal(a.value, 0); assert.ok(a.priors.every(x => Number.isFinite(x) && x >= 0));
    assert.ok(Math.abs(a.priors.reduce((x, y) => x + y, 0) - 1) < 1e-12); presentations += a.moves.length;
  }
  assert.equal(presentations, r.resources.presentations);
  for (const t of r.traces) {
    assert.ok(t.moves.length <= p.search.maxDepth); assert.deepEqual(t.task, task);
    const b = makeBoard(); for (const move of t.moves) {
      const legal = b.moves({ verbose: true }).find(m => uci(m) === move); assert.ok(legal); b.move(legal);
    }
    assert.equal(b.fen(), t.leafFen);
    if (r.algorithm === 'cesp99') {
      const terminal = terminalValue(b);
      assert.equal(t.leafValue, terminal ?? 0); assert.equal(t.learningAllowed, false);
    }
    traces++;
  }
  let index = 0; const brain = { memoryFingerprint: () => r.memoryBefore,
    async evaluate(b, moves, supplied) {
      const a = r.assessments[index++]; assert.ok(a); assert.equal(b.fen(), a.fen);
      assert.equal(b.pgn(), a.pgn); assert.deepEqual(moves.map(uci), a.moves); assert.deepEqual(supplied, a.task);
      return { priors: a.priors, value: a.value };
    } };
  // Replay numerical search mechanics from recorded neural output, not graph inference.
  assert.ok(r.algorithm === 'cesp99' || r.algorithm === 'existing');
  assert.equal(r.algorithm === 'cesp99' ? r.search.stoppedBy === 'time' : r.search.stoppedBy.time, false,
    'Timing cutoff requires a separately clock-controlled replay');
  const rerun = await (r.algorithm === 'cesp99' ? searchCesp99 : searchMonteCarlo)(brain, makeBoard(),
    { ...p.search, task, milliseconds: 60000 });
  assert.equal(index, r.assessments.length);
  for (const key of r.algorithm === 'cesp99' ? ['move', 'visits', 'rootValue', 'rootPrior', 'sims']
    : ['move', 'candidates', 'simulations', 'evaluations', 'nodes', 'randomState']) assert.deepEqual(rerun[key], r.search[key]);
  replayed++;
  if (r.review) {
    const b = makeBoard(); assert.equal(r.review.context.fen, b.fen()); assert.equal(r.review.context.pgn, b.pgn());
    assert.deepEqual(r.review.context.task, task); assert.equal(r.review.actor, b.turn());
    const chosen = typeof r.search.move === 'string' ? r.search.move : uci(r.search.move);
    assert.equal(r.review.move, chosen); b.move(b.moves({ verbose: true }).find(m => uci(m) === chosen));
    if (r.review.status !== 'unknown') {
      const checked = checkMateCertificate(r.review.proof.certificate, b,
        { attacker: r.review.actor, plies: r.row.plies - 1, maxNodes: 100000, milliseconds: 60000 });
      assert.equal(checked.verified, true); assert.equal(checked.status, r.review.status);
      assert.equal(digest(r.review.proof.certificate), r.review.certificateSha256); certificates++;
    } else assert.equal(r.review.learningAllowed, false);
  }
  outcomes.push({ key: r.key, status: r.review?.status ?? 'unknown', move: r.review?.move ?? null });
}
assert.ok(report.resources.peakRssMiB <= 768); assert.equal(report.resources.cpuDuty, 0.5);
const audit = { passed: true, reportSha256: await sha256(reportPath), certificates, traces, replayed, outcomes,
  auditorSha256: await sha256('.codebase/scripts/evaluation-and-performance/audit-licensed-search.mjs'),
  scope: 'Recorded search replay/proof/input/memory invariants; not independent graph inference or learned strategic value.' };
for (const name of ['audit.json', 'COMPLETE']) {
  const path = join(args.run, name); assert.equal(existsSync(path), false);
  const value = name === 'audit.json' ? audit : { auditPassed: true, reportSha256: audit.reportSha256,
    auditSha256: await sha256(join(args.run, 'audit.json')) };
  writeFileSync(path + '.partial', JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); renameSync(path + '.partial', path);
}
console.log(JSON.stringify(audit));
