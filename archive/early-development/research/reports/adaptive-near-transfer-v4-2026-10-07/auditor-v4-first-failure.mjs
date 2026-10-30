import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' }, protocol: { type: 'string' } } });
assert.ok(args.run, 'Use --run DIR');
const protocolPath = args.protocol ?? 'research/data/adaptive-near-transfer-v4/protocol.json';
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const run = resolve(args.run), read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const protocolHash = await sha256(protocolPath), runner = '.codebase/scripts/puzzle-learning/evaluate-adaptive-near-transfer.mjs';
for (const [path, expected] of Object.entries({ ...p.inputs, ...p.sources })) assert.equal(await sha256(path), expected, `Pinned identity mismatch: ${path}`);
assert.equal(p.sources[runner], await sha256(runner));
const reportPath = join(run, 'report.json'), reportBytes = readFileSync(reportPath), report = JSON.parse(reportBytes);
const runComplete = read(join(run, 'RUN_COMPLETE.json'));
assert.equal(report.complete, true); assert.equal(report.protocolSha256, protocolHash);
assert.equal(runComplete.protocolSha256, protocolHash); assert.equal(runComplete.reportSha256, hash(reportBytes));
assert.equal(report.panels.length, Object.keys(p.conditions).length * p.positions.length);
assert.equal(runComplete.panels, report.panels.length);

const conditionSnapshots = Object.fromEntries(Object.entries(p.conditions).map(([condition, path]) => [condition, read(path).learned]));
const certRows = readFileSync(p.certificatePath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const certs = new Map();
for (const record of certRows) {
  if (!p.positions.some(position => position.id === record.id)) continue;
  const moveUci = record.review.move, proof = record.review.proof;
  const context = record.review.context;
  const key = `${record.id}|${moveUci}`; assert.ok(!certs.has(key));
  const board = new Chess(context.fen), move = board.moves({ verbose: true }).find(m => `${m.from}${m.to}${m.promotion ?? ''}` === moveUci);
  assert.ok(move); board.move(move);
  const checked = checkMateCertificate(proof.certificate, board, { attacker: record.review.actor,
    plies: context.task.plies - 1, ...p.verification });
  assert.equal(checked.verified, true); assert.equal(checked.status, record.review.status);
  assert.ok(['success', 'failure'].includes(record.review.status));
  certs.set(key, { status: record.review.status, certificateSha256: record.certificateSha256 });
}

const seen = new Set(); let candidates = 0, certificates = 0;
for (const panel of report.panels) {
  const { condition, position } = panel;
  assert.ok(p.conditions[condition]); assert.ok(p.positions.some(x => x.id === position.id));
  const key = `${condition}|${position.id}`; assert.ok(!seen.has(key)); seen.add(key);
  const board = new Chess(position.fen), legal = board.moves({ verbose: true }).map(m => `${m.from}${m.to}${m.promotion ?? ''}`).sort();
  assert.deepEqual(panel.rows.map(r => r.move).sort(), legal);
  assert.equal(panel.legalMoveCount, legal.length); assert.equal(panel.presentations, legal.length); assert.equal(panel.feedbackEvents, 0);
  const snapshot = conditionSnapshots[condition]; assert.equal(panel.memoryBefore, digest(snapshot)); assert.equal(panel.memoryAfter, digest(snapshot));
  assert.ok(panel.rows.every(r => [r.score, r.MBON12, r.MBON01].every(Number.isFinite) && r.score === r.MBON12 - r.MBON01));
  const expected = [...panel.rows].sort((a, b) => b.score - a.score || a.move.localeCompare(b.move))[0].move;
  assert.equal(panel.choice, expected); assert.equal(panel.choiceConsequence, certs.get(`${position.id}|${panel.choice}`)?.status);
  const successes = panel.rows.filter(r => certs.get(`${position.id}|${r.move}`)?.status === 'success');
  assert.ok(successes.length > 0);
  assert.deepEqual(panel.successMoves, successes.map(r => r.move));
  assert.deepEqual(panel.successRanks, successes.map(r => [...panel.rows].sort((a,b) => b.score - a.score || a.move.localeCompare(b.move)).findIndex(x => x.move === r.move) + 1));
  for (const row of panel.rows) {
    const cert = certs.get(`${position.id}|${row.move}`); assert.ok(cert);
    assert.equal(row.consequence, cert.status); assert.equal(row.certificateSha256, cert.certificateSha256); certificates++;
  }
  candidates += panel.rows.length;
}
assert.equal(seen.size, 20); assert.equal(certificates, report.panels.reduce((sum, panel) => sum + panel.rows.length, 0));
assert.ok(report.resources.peakRssMiB <= p.runtime.rssMiB && report.resources.cpuDuty === p.runtime.cpuDuty);
const summary = Object.fromEntries(Object.keys(p.conditions).map(condition => [condition, {
  correctChoices: report.panels.filter(panel => panel.condition === condition && panel.choiceConsequence === 'success').length,
  positions: report.panels.filter(panel => panel.condition === condition).map(panel => ({ id: panel.position.id,
    choice: panel.choice, outcome: panel.choiceConsequence, bestSuccessRank: Math.min(...panel.successRanks) })),
}]));
const audit = { passed: true, protocolSha256: protocolHash, reportSha256: hash(reportBytes),
  auditorSha256: await sha256('.codebase/scripts/puzzle-learning/audit-adaptive-near-transfer.mjs'),
  panels: seen.size, candidates, certificates, feedbackEvents: 0, memoryUnchangedPanels: seen.size,
  summary, scope: 'Hash/proof/all-legal/memory/record audit of no-feedback development near-generalization. Does not independently rerun neural evocations; no disjoint-family reasoning claim.' };
const auditPath = join(run, 'audit.json'), temp = `${auditPath}.${process.pid}.partial`;
writeFileSync(temp, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' }); renameSync(temp, auditPath);
const complete = { reportSha256: hash(reportBytes), auditSha256: hash(readFileSync(auditPath)),
  protocolSha256: protocolHash, passed: true };
const completePath = join(run, 'AUDITED.json'), completeTemp = `${completePath}.${process.pid}.partial`;
assert.ok(!existsSync(completePath)); writeFileSync(completeTemp, `${JSON.stringify(complete, null, 2)}\n`, { flag: 'wx' }); renameSync(completeTemp, completePath);
console.log(JSON.stringify({ passed: true, panels: audit.panels, candidates, certificates, summary }, null, 2));
