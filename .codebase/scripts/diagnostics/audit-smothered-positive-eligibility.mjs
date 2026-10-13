// Independent certificate and local-memory audit for the one-replay probe.
// Deliberately does not import the encoder, brain, memory rule, or trainer.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import assert from 'node:assert/strict';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' } } });
if (!args.run || !args.out || existsSync(args.out)) throw Error('Require a probe run and fresh audit output path');
const protocolPath = 'research/data/smothered-positive-eligibility-v1/protocol.json';
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const hashJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assertHash = (path, expected) => assert.equal(sha256(path), expected, `SHA-256 mismatch: ${path}`);
for (const [path, expected] of Object.entries(p.inputs)) assertHash(path, expected);
for (const [path, expected] of Object.entries(p.sources)) assertHash(path, expected);
const reportPath = `${args.run}/report.json`;
const reportSha256 = sha256(reportPath);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.complete, true);
assert.equal(report.schema, p.schema);
assert.equal(report.identity.protocolPath, protocolPath);
assert.equal(report.identity.protocolSha256, sha256(protocolPath));
assert.equal(report.identity.invariant, p.shared.invariant);
assert.equal(report.identity.mappingHash, p.shared.mappingHash);
assert.deepEqual(report.identity.model, p.shared.model);
assert.deepEqual(report.identity.memory, p.shared.memory);
assert.deepEqual(report.identity.readouts, p.shared.readouts);
assert.deepEqual(report.identity.inputs, { ...p.inputs, [protocolPath]: sha256(protocolPath) });
assert.deepEqual(report.identity.sources, p.sources);

const plan = JSON.parse(readFileSync(p.fixedPlanPath, 'utf8'));
const experience = plan.experiences[0];
assert.equal(experience.status, 'success');
assert.equal(experience.move, 'c4g8');
const taskBoard = new Chess();
taskBoard.loadPgn(experience.context.pgn);
assert.equal(taskBoard.fen(), experience.context.fen);
const actor = taskBoard.turn();
const legal = taskBoard.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === experience.move);
assert.ok(legal, 'Pinned puzzle move must be legal');
taskBoard.move(legal);
const certificate = experience.proof.certificate;
assert.equal(hashJson(certificate), experience.certificateSha256);
assert.equal(certificate.rootFen, taskBoard.fen());
const certificateCheck = checkMateCertificate(certificate, taskBoard, {
  attacker: actor, plies: experience.context.task.plies - 1,
  maxNodes: p.verification.maxNodes, milliseconds: p.verification.milliseconds,
});
assert.equal(certificateCheck.verified, true, certificateCheck.reason);
assert.equal(certificateCheck.status, 'success');

const mapping = JSON.parse(readFileSync(p.mappingPath, 'utf8')).mapping;
const refs = new Map(report.receiptRefs.map(ref => [ref.variant, ref]));
assert.equal(refs.size, p.variants.length);
const findings = [];
for (const variant of p.variants) {
  const ref = refs.get(variant.id);
  assert.ok(ref, `Missing receipt for ${variant.id}`);
  assert.equal(ref.path, `${args.run}/${variant.id}.json`.replaceAll('\\', '/'));
  assertHash(ref.path, ref.sha256);
  const r = JSON.parse(readFileSync(ref.path, 'utf8'));
  assert.equal(r.event.status, 'success');
  assert.equal(r.event.move, experience.move);
  assert.equal(r.event.actor, actor);
  assert.equal(r.event.certificateSha256, experience.certificateSha256);
  assert.deepEqual(r.context, experience.context);
  assert.deepEqual(r.independentEvidence.proof, experience.proof,
    'Receipt must preserve the exact teacher proof for independent replay');
  assert.equal(hashJson(r.independentEvidence.proof.certificate), experience.certificateSha256);
  assert.equal(r.presentation.channel, 'PAM02');
  assert.equal(r.presentation.reinforcementCurrent, p.current);
  assert.equal(r.independentEvidence.fixedStateBefore, p.shared.invariant);
  assert.equal(r.independentEvidence.fixedStateAfter, p.shared.invariant);
  assert.deepEqual(r.before.gains, Array(r.before.gains.length).fill(1));
  assert.equal(r.before.events, 0);
  assert.equal(r.after.events, 1);
  assert.equal(r.update.events, 1);
  assert.equal(r.plasticityEnabled, true);

  const expectedDan = mapping.groups.filter(g => g.danType === 'PAM02').flatMap(g => g.dan);
  assert.deepEqual(r.presentation.reinforcementCells, expectedDan);
  assert.ok(r.presentation.stimulation.every(s => mapping.groups.some(g => g.kc.includes(s.index))
    || expectedDan.some(d => d.index === s.index)));

  let offset = 0, changedEdges = 0;
  const groups = mapping.groups.map((g, groupIndex) => {
    const dan = r.local.dan[groupIndex];
    assert.equal(dan.length, g.dan.length);
    const factor = -dan.reduce((sum, value) => sum + Math.max(0, value), 0) / dan.length;
    assert.ok(Math.abs(factor - r.local.factors[groupIndex]) < 1e-12);
    let activeEdgeAssociatedKCEntries = 0, activeUniqueKCCells = 0, groupChanged = 0;
    const active = new Set();
    for (let i = 0; i < g.edges.length; i++, offset++) {
      const k = r.local.kc[offset], before = r.before.gains[offset];
      assert.ok(Number.isFinite(k) && k >= 0);
      const expected = Math.max(p.memory.minGain, Math.min(p.memory.maxGain,
        before + p.memory.eta * factor * (k + before - 1)));
      assert.ok(Math.abs(expected - r.after.gains[offset]) < 1e-12, `Gain recurrence mismatch at edge ${offset}`);
      if (k > 0) { activeEdgeAssociatedKCEntries++; active.add(g.kc[i]); }
      if (before !== r.after.gains[offset]) { groupChanged++; changedEdges++; }
    }
    activeUniqueKCCells = active.size;
    return { danType: g.danType, side: g.side, edgeCount: g.edges.length,
      activeEdgeAssociatedKCEntries, activeUniqueKCCells, changedEdges: groupChanged };
  });
  assert.equal(offset, r.local.kc.length);
  assert.equal(changedEdges, r.update.changedEdges);
  assert.deepEqual(groups, report.records.find(x => x.variant === variant.id).groups);
  findings.push({ variant: variant.id, receiptSha256: ref.sha256, certificateVerified: true,
    recurrenceChecks: offset, changedEdges, groups });
}

const audit = { passed: true, schema: 'smothered-positive-eligibility-audit-v1',
  reportPath, reportSha256, protocolSha256: sha256(protocolPath), certificateChecks: 1,
  recurrenceChecks: findings.reduce((sum, x) => sum + x.recurrenceChecks, 0), findings,
  interpretation: 'Independent proof and local recurrence verification for one fresh PAM02 replay per input. This is eligibility evidence only; it does not establish acquired choice, retention, reversal, transfer, or reasoning.' };
const temporary = `${args.out}.partial`;
writeFileSync(temporary, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
renameSync(temporary, args.out);
console.log(JSON.stringify({ passed: true, reportSha256, certificateChecks: 1,
  recurrenceChecks: audit.recurrenceChecks, auditPath: args.out }));
