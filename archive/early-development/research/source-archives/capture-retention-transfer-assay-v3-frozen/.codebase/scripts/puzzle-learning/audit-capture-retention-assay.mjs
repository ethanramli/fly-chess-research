import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const p = read(protocolPath), runPath = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Pass one completed seed-condition run directory');
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Pinned identity differs: ${path}`);
for (const audit of p.requiredAudits) {
  assert.equal(await sha256(audit.report), audit.reportSha256);
  const audited = read(audit.report);
  for (const [path, expected] of Object.entries(audit.expected))
    assert.deepEqual(path.split('.').reduce((value, key) => value?.[key], audited), expected,
      `Required audit gate differs: ${audit.report}/${path}`);
}
const complete = read(join(runPath, 'COMPLETE'));
const reportPath = join(runPath, 'report.json'), report = read(reportPath);
assert.equal(complete.schema, 'capture-retention-assay-complete-v3');
assert.equal(complete.reportSha256, await sha256(reportPath));
assert.equal(complete.protocolSha256, await sha256(protocolPath));
assert.equal(complete.seed, report.seed); assert.equal(complete.condition, report.condition);
assert.equal(report.schema, 'capture-retention-assay-run-v1');
assert.equal(report.identity.protocolSha256, await sha256(protocolPath));
assert.ok(p.seeds.includes(report.seed) && p.conditions.includes(report.condition));
assert.equal(report.identity.seed, report.seed); assert.equal(report.identity.condition, report.condition);
assert.equal(report.initialMemoryHash, report.identity.initialMemoryHash);
assert.equal(report.identity.mappingHash, p.mappingHash); assert.equal(report.identity.cueIdentity, p.cue.identity);
assert.equal(report.identity.graphSha256, p.graphSha256); assert.equal(report.identity.annotationSha256, p.annotationSha256);
assert.ok(report.identity.fixedStateHash);
assert.equal(report.final.length, 8); assert.equal(report.roleScrambled.length, 8);
assert.equal(report.validation.length, 4); assert.equal(report.baseline.length, 8);
assert.deepEqual(report.final, report.repeat);
assert.deepEqual(report.baseline, report.reset);
assert.deepEqual(report.final, report.restored);
assert.equal(report.receipts.length, 16); assert.equal(new Set(report.receipts.map(r => r.path)).size, 16);

const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.mappingHash);
const panelRows = path => readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const train = panelRows(p.families.train);
const eventRows = train.flatMap(panel => panel.candidates.map(candidate => ({ panel, candidate })));
assert.equal(eventRows.length, 16);
const receiptData = [];
for (let i = 0; i < report.receipts.length; i++) {
  const ref = report.receipts[i]; assert.equal(await sha256(ref.path), ref.sha256);
  const event = read(ref.path), source = eventRows[i];
  assert.equal(event.seed, report.seed); assert.equal(event.condition, report.condition);
  assert.equal(event.eventIndex, i); assert.equal(event.panelId, source.panel.id);
  assert.equal(event.move, source.candidate.move); assert.equal(event.status, source.candidate.proof.status);
  const expectedChannel = report.condition === 'no-channel' ? null
    : report.condition === 'shuffled' ? p.shuffledChannels[i]
      : event.status === 'success' ? 'PAM02' : 'PPL103';
  assert.equal(event.channel, expectedChannel, `Feedback channel mismatch at event ${i}`);
  assert.equal(event.plasticityEnabled, report.condition !== 'disabled');
  const board = new Chess(); board.loadPgn(source.panel.pgn);
  const checked = checkCaptureRetentionCertificate(board, source.candidate.move, source.candidate.proof);
  assert.equal(checked.verified, true); assert.equal(checked.status, event.status);
  assert.equal(event.fixedStateBefore, report.identity.fixedStateHash);
  assert.equal(event.fixedStateAfter, report.identity.fixedStateHash);
  assert.deepEqual(event.before, event.receipt.before); assert.deepEqual(event.after, event.receipt.after);
  assert.deepEqual(event.before.identity, event.after.identity);
  const expectedEvents = event.before.events + (event.plasticityEnabled ? 1 : 0);
  assert.equal(event.after.events, expectedEvents);
  const local = event.receipt.local, cfg = p.memory;
  assert.equal(local.kc.length, mapping.groups.reduce((n, group) => n + group.edges.length, 0));
  if (report.condition === 'disabled') {
    assert.equal(event.update.changedEdges, 0);
    assert.deepEqual(event.before.gains, event.after.gains);
    assert.deepEqual(local.factors, []);
  } else {
    assert.equal(local.factors.length, mapping.groups.length);
    let offset = 0, changed = 0;
    for (let group = 0; group < mapping.groups.length; group++) {
      const mapped = mapping.groups[group], D = local.factors[group];
      for (let edge = 0; edge < mapped.edges.length; edge++, offset++) {
        const before = event.before.gains[offset], k = local.kc[offset];
        const expected = Math.max(cfg.minGain, Math.min(cfg.maxGain,
          before + cfg.eta * D * (k + before - 1)));
        assert.ok(Math.abs(expected - event.after.gains[offset]) <= 1e-12,
          `Gain recurrence mismatch in event ${i}, edge ${offset}`);
        if (expected !== before) changed++;
      }
    }
    assert.equal(changed, event.update.changedEdges);
  }
  receiptData.push(event);
}

const checkpoints = readdirSync(runPath).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
assert.ok(checkpoints.length >= 1);
let lastSequence = 0, sawPending = new Set(), sawAck = new Set(), finalState;
for (const name of checkpoints) {
  const dir = join(runPath, name), statePath = join(dir, 'state.json'), manifest = read(join(dir, 'checkpoint.json'));
  const saved = read(statePath); assert.equal(await sha256(statePath), manifest.stateSha256);
  assert.equal(saved.sequence, manifest.sequence); assert.deepEqual(saved.identity, report.identity);
  assert.ok(saved.sequence > lastSequence); lastSequence = saved.sequence; finalState = saved.state;
  if (saved.state.pending) {
    const index = saved.state.pending.eventIndex;
    sawPending.add(index); assert.equal(index, saved.state.eventIndex);
    assert.deepEqual(saved.state.pending, receiptData[index]);
  }
  if (!saved.state.pending) for (let i = 0; i < saved.state.eventIndex; i++) sawAck.add(i);
}
for (let i = 0; i < 16; i++) {
  assert.ok(sawPending.has(i), `Missing pending-before-ack checkpoint for event ${i}`);
  assert.ok(sawAck.has(i), `Missing acknowledged checkpoint for event ${i}`);
}
assert.equal(finalState.phase, 'complete'); assert.equal(finalState.pending, null);
assert.equal(finalState.eventIndex, 16); assert.equal(finalState.receiptRefs.length, 16);
assert.equal(digest(finalState.memory), report.finalMemoryHash);
assert.equal(report.presentations, receiptData.length + 104);
const summary = { passed: true, runPath: runPath.replaceAll('\\','/'), seed: report.seed,
  condition: report.condition, recurrences: report.condition === 'disabled' ? 0 : receiptData.length * 870,
  certificates: receiptData.length, pendingReceiptEvents: sawPending.size, acknowledgedEvents: sawAck.size,
  finalCorrect: report.final.filter(x => x.correct).length,
  counterfactualCorrect: report.final.find(x => x.panelId === 'te-01')?.chosenMove === 'a2a4'
    && report.final.find(x => x.panelId === 'te-05')?.chosenMove === 'e2e6',
  fixedStatePreserved: true, resetRestoration: true, scope: report.scope };
console.log(JSON.stringify(summary));
