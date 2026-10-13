import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

// Supplemental audit: preserve original auditor and every frozen source identity.
// JSON cannot retain negative zero. Normalize only that representation distinction.
let negativeZeroEntries = 0;
function canonicalZero(value) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), 'Nonfinite replay value');
    if (Object.is(value, -0)) { negativeZeroEntries++; return 0; }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalZero);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,canonicalZero(v)]));
  return value;
}
const protocolPath = 'research/data/bound-ray-feedback-development-v1/protocol.json';
const protocol = JSON.parse(readFileSync(protocolPath, 'utf8'));
const archiveManifest = JSON.parse(readFileSync('research/source-archives/bound-ray-feedback-development-v1/manifest.json', 'utf8'));
assert.equal(await sha256(protocolPath), archiveManifest.protocolSha256, 'Frozen protocol identity differs');
const runPath = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Pass one completed development run directory');
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
for (const [path, expected] of Object.entries({ ...protocol.inputHashes, ...protocol.sourceHashes }))
  assert.equal(await sha256(path), expected, `Frozen identity differs: ${path}`);
assert.equal(await sha256(protocol.graphPath), protocol.graphSha256);
assert.equal(protocol.graphSha256, graphHash);
assert.ok(!JSON.stringify(protocol).includes('final.jsonl'));
const complete = JSON.parse(readFileSync(join(runPath, 'COMPLETE'), 'utf8'));
const reportPath = join(runPath, 'report.json'), report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(complete.schema, 'bound-ray-feedback-development-complete-v1');
assert.equal(complete.reportSha256, await sha256(reportPath));
assert.equal(complete.protocolSha256, await sha256(protocolPath));
assert.equal(report.schema, 'bound-ray-feedback-development-run-v1');
assert.equal(report.identity.protocolSha256, await sha256(protocolPath));
assert.equal(report.identity.encoder, report.encoder);
assert.equal(report.identity.condition, report.condition);
assert.equal(report.seed, protocol.model.seed);
assert.ok(protocol.encoders.some(row => row.id === report.encoder && row.identity === report.identity.encoderIdentity));
assert.ok(protocol.conditions.includes(report.condition));
assert.equal(report.identity.graphSha256, protocol.graphSha256);
assert.equal(report.identity.annotationSha256, protocol.annotationSha256);
assert.equal(report.identity.mappingHash, protocol.mappingHash);
assert.equal(report.initialMemoryHash, report.identity.initialMemoryHash);
assert.equal(report.receipts.length, 16);
assert.equal(report.presentations, 120);
assert.ok(!JSON.stringify(report).includes('final.jsonl'));

const readRows = path => readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const train = readRows(protocol.data.trainPath), validation = readRows(protocol.data.validationPath);
const eventRows = train.flatMap(panel => panel.candidates.map(candidate => ({ panel, candidate })));
const mapping = JSON.parse(readFileSync(protocol.mappingPath, 'utf8')).mapping;
assert.equal(digest(mapping), protocol.mappingHash);
const allReceipts = [];
let previousMemory = null;
for (let index = 0; index < report.receipts.length; index++) {
  const ref = report.receipts[index];
  assert.equal(ref.path, `receipts/event-${String(index + 1).padStart(3, '0')}.json`);
  const path = join(runPath, ref.path), receipt = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(await sha256(path), ref.sha256);
  const { panel, candidate } = eventRows[index];
  assert.deepEqual(receipt.identity, report.identity);
  assert.equal(receipt.eventIndex, index);
  assert.equal(receipt.panelId, panel.id); assert.equal(receipt.move, candidate.move);
  assert.equal(receipt.status, candidate.proof.status);
  const correct = receipt.status === 'success' ? 'PAM02' : 'PPL103';
  const expectedChannel = report.condition === 'no-channel' ? null
    : report.condition === 'shuffled' ? protocol.shuffledChannels[index].channel : correct;
  assert.equal(receipt.channel, expectedChannel);
  assert.equal(receipt.plasticityEnabled, report.condition !== 'disabled');
  const board = new Chess(); board.loadPgn(panel.pgn);
  const checked = checkCaptureRetentionCertificate(board, candidate.move, candidate.proof);
  assert.equal(checked.verified, true); assert.equal(checked.status, receipt.status);
  assert.equal(receipt.fixedStateBefore, report.identity.fixedStateHash);
  assert.equal(receipt.fixedStateAfter, report.identity.fixedStateHash);
  const event = receipt.receipt;
  const feedback = receipt.feedback, assessment = feedback.assessment;
  assert.equal(feedback.schema, 'assessed-feedback-binding-v1');
  assert.equal(assessment.fen, panel.fen); assert.equal(assessment.pgn, panel.pgn);
  assert.deepEqual(assessment.task, protocol.task);
  assert.equal(assessment.memoryHash, digest(event.before));
  assert.deepEqual(assessment.rows.map(row => row.move).sort(), panel.candidates.map(row => row.move).sort());
  assert.ok(assessment.rows.every(row => Number.isFinite(row.score)));
  const bestScore = Math.max(...assessment.rows.map(row => row.score));
  const tied = assessment.rows.filter(row => row.score === bestScore).map(row => row.move).sort();
  assert.equal(assessment.choice, tied.length === 1 ? tied[0] : null);
  assert.deepEqual(feedback.tiedTopMoves, tied);
  const legalCount = board.moves().length;
  assert.equal(feedback.legalMoveCount, legalCount); assert.equal(feedback.assessedMoveCount, 2);
  assert.equal(feedback.coverage, legalCount === 2 ? 'all-legal' : 'candidate-subset');
  assert.equal(feedback.reviewedMove, candidate.move);
  assert.equal(feedback.role, assessment.choice === null ? 'candidate-review-after-tie'
    : assessment.choice === candidate.move ? 'chosen-action-review' : 'alternative-action-review');
  assert.equal(feedback.status, checked.status); assert.equal(feedback.learningAllowed, true);
  assert.equal(feedback.certificateSha256, checked.certificateSha256);
  assert.equal(feedback.meaning, checked.meaning);
  assert.equal(event.event.certificateSha256, checked.certificateSha256);
  assert.equal(event.event.actor, board.turn());
  assert.deepEqual(event.context, { fen: panel.fen, pgn: panel.pgn, task: protocol.task });
  assert.deepEqual(event.before.identity, event.after.identity);
  assert.equal(event.event.status, receipt.status);
  assert.equal(event.event.channel, receipt.channel);
  assert.equal(event.event.delivered, receipt.channel !== null);
  if (index === 0) {
    assert.equal(digest(event.before), report.initialMemoryHash);
  } else assert.deepEqual(event.before, previousMemory, `Memory continuity at event ${index}`);
  if (receipt.plasticityEnabled) {
    assert.equal(event.after.events, event.before.events + 1);
    assert.equal(event.local.factors.length, mapping.groups.length);
    assert.equal(event.local.kc.length, mapping.groups.reduce((n, group) => n + group.edges.length, 0));
    let offset = 0, changed = 0;
    for (let groupIndex = 0; groupIndex < mapping.groups.length; groupIndex++) {
      const group = mapping.groups[groupIndex], D = event.local.factors[groupIndex];
      for (let i = 0; i < group.edges.length; i++, offset++) {
        const before = event.before.gains[offset], kc = event.local.kc[offset];
        const expected = Math.max(protocol.memory.minGain, Math.min(protocol.memory.maxGain,
          before + protocol.memory.eta * D * (kc + before - 1)));
        assert.ok(Math.abs(event.after.gains[offset] - expected) <= 1e-12,
          `Local recurrence mismatch at event ${index}, edge ${offset}`);
        if (expected !== before) changed++;
      }
    }
    assert.equal(changed, event.update.changedEdges);
  } else {
    assert.deepEqual(event.before.gains, event.after.gains);
    assert.equal(event.after.events, event.before.events);
    assert.equal(event.update.changedEdges, 0);
    assert.deepEqual(event.local.factors, []);
  }
  previousMemory = event.after;
  allReceipts.push(receipt);
}
assert.equal(digest(previousMemory), report.finalMemoryHash);

const verifyPanels = (rows, source, split) => {
  assert.equal(rows.length, source.length);
  for (let i = 0; i < source.length; i++) {
    const row = rows[i], panel = source[i];
    assert.equal(row.split, split); assert.equal(row.panelId, panel.id);
    assert.equal(row.rows.length, 2);
    const success = row.rows.find(candidate => candidate.consequence === 'success');
    const failure = row.rows.find(candidate => candidate.consequence === 'failure');
    assert.ok(success && failure);
    const margin = success.score - failure.score;
    assert.equal(row.margin, margin); assert.equal(row.correct, margin > 0);
    assert.equal(row.tied, margin === 0);
    assert.equal(row.choice, margin > 0 ? success.move : margin < 0 ? failure.move : null);
  }
};
verifyPanels(report.baseline.train, train, 'train');
verifyPanels(report.baseline.validation, validation, 'validation');
verifyPanels(report.afterTraining.train, train, 'train');
verifyPanels(report.afterTraining.validation, validation, 'validation');
verifyPanels(report.repeat, validation, 'validation');
verifyPanels(report.reset, validation, 'validation');
verifyPanels(report.restored, validation, 'validation');
assert.deepEqual(report.repeat, report.afterTraining.validation);
assert.deepEqual(report.reset, report.baseline.validation);
assert.deepEqual(report.restored, report.afterTraining.validation);

const checkpointNames = readdirSync(runPath).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
assert.ok(checkpointNames.length > 1);
const pending = new Set(), acknowledged = new Set();
let finalState = null, lastSequence = 0;
for (const name of checkpointNames) {
  const dir = join(runPath, name), statePath = join(dir, 'state.json');
  const manifest = JSON.parse(readFileSync(join(dir, 'checkpoint.json'), 'utf8'));
  const saved = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(await sha256(statePath), manifest.stateSha256);
  assert.equal(saved.sequence, manifest.sequence); assert.deepEqual(saved.identity, report.identity);
  assert.ok(saved.sequence > lastSequence); lastSequence = saved.sequence; finalState = saved.state;
  if (saved.state.pending) {
    const index = saved.state.pending.receipt.eventIndex;
    pending.add(index); assert.equal(saved.state.eventIndex, index);
    assert.equal(saved.state.pending.receiptRef.sha256, report.receipts[index].sha256);
  }
  if (!saved.state.pending) for (let i = 0; i < saved.state.eventIndex; i++) acknowledged.add(i);
}
for (let i = 0; i < 16; i++) { assert.ok(pending.has(i)); assert.ok(acknowledged.has(i)); }
assert.equal(finalState.phase, 'complete'); assert.equal(finalState.pending, null);
assert.equal(finalState.eventIndex, 16); assert.equal(finalState.receiptRefs.length, 16);

// Reconstruct from scratch rather than accepting recorded neural scores or
// local activity as true. Arithmetic/certificate checks above are separate.
let auditPeakRssBytes = 0;
const guard = () => {
  const rss = process.memoryUsage().rss;
  auditPeakRssBytes = Math.max(auditPeakRssBytes, rss);
  assert.ok(rss <= protocol.runtime.maxRssBytes && os.freemem() >= protocol.runtime.minFreeBytes,
    'Independent replay resource guard');
};
assert.equal(process.version, protocol.runtime.nodeVersion);
assert.equal(protocol.runtime.cpuDuty, 0.5);
const pace = async ms => {
  let remaining = ms * (1 / protocol.runtime.cpuDuty - 1);
  while (remaining > 0) {
    const wait = Math.min(250, remaining);
    await new Promise(resolveWait => setTimeout(resolveWait, wait)); remaining -= wait; guard();
  }
};
guard(); const graph = loadGraph(protocol.graphPath); guard();
const model = new SparseTrainer(graph, protocol.model); guard();
const memory = new ReversalMemory(model, mapping, protocol.memory); guard();
const config = protocol.encoders.find(row => row.id === report.encoder);
const encoder = report.encoder === 'bound-ray'
  ? createBoundRayRelationalCueEncoder(mapping, config.config)
  : createRelationalChessCueEncoder(mapping, config.config);
assert.equal(encoder.identity, config.identity);
const initial = memory.snapshot();
assert.equal(digest(initial), report.initialMemoryHash);
assert.equal(fixedStateHash(model, memory.edges), report.identity.fixedStateHash);
const restStarted = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStarted); guard();
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts: protocol.readouts,
  rest, current: protocol.current, priorScale: protocol.priorScale,
  maxPresentations: protocol.maxPresentations, maxLegalMoves: 8, guard, pace });
async function replayScores(panel, expectedRows, detailed) {
  const board = new Chess(); board.loadPgn(panel.pgn);
  const memoryBefore = digest(memory.snapshot()), history = board.pgn();
  const actual = [];
  for (const candidate of [...panel.candidates].sort((a, b) => a.move.localeCompare(b.move))) {
    const cue = encoder.encode(board, candidate.move, protocol.task);
    const response = await brain.evoke(cue.stimulation);
    actual.push(detailed ? { move: candidate.move, consequence: candidate.proof.status,
      score: response.score, MBON12: response.MBON12, MBON01: response.MBON01 }
      : { move: candidate.move, score: response.score });
  }
  assert.deepEqual(actual, expectedRows, `Fresh neural replay differs for ${panel.id}`);
  assert.equal(digest(memory.snapshot()), memoryBefore); assert.equal(board.pgn(), history);
}
async function replayPanels(panels, measured) {
  for (let i = 0; i < panels.length; i++) {
    assert.equal(measured[i].memoryHash, digest(memory.snapshot()));
    await replayScores(panels[i], measured[i].rows, true);
  }
}
await replayPanels(train, report.baseline.train);
await replayPanels(validation, report.baseline.validation);
for (let i = 0; i < allReceipts.length; i++) {
  const stored = allReceipts[i], { panel, candidate } = eventRows[i];
  assert.equal(stored.feedback.assessment.memoryHash, digest(memory.snapshot()));
  await replayScores(panel, stored.feedback.assessment.rows, false);
  const board = new Chess(); board.loadPgn(panel.pgn);
  const experience = { ...verifiedExperience(board, candidate.move, protocol.task, candidate.proof),
    proof: candidate.proof, context: { fen: panel.fen, pgn: panel.pgn, task: protocol.task } };
  const actual = await brain.replay(experience, {
    channel: stored.channel, plasticityEnabled: stored.plasticityEnabled });
  assert.deepEqual(canonicalZero(actual), stored.receipt, `Fresh neural update replay differs at event ${i}`);
}
assert.equal(digest(memory.snapshot()), report.finalMemoryHash);
const learned = memory.snapshot();
await replayPanels(train, report.afterTraining.train);
await replayPanels(validation, report.afterTraining.validation);
await replayPanels(validation, report.repeat);
memory.restore(initial); await replayPanels(validation, report.reset);
memory.restore(learned); await replayPanels(validation, report.restored);
assert.equal(brain.presentations, report.presentations);
assert.equal(fixedStateHash(model, memory.edges), report.identity.fixedStateHash);
const audit = { schema: 'bound-ray-feedback-development-audit-v1', reportPath,
  reportSha256: await sha256(reportPath), protocolSha256: await sha256(protocolPath),
  encoder: report.encoder, condition: report.condition, seed: report.seed,
  independentlyCheckedCertificates: allReceipts.length,
  locallyRecomputedGainUpdates: report.condition === 'disabled' ? 0
    : 16 * mapping.groups.reduce((sum, group) => sum + group.edges.length, 0),
  pendingReceiptCheckpoints: pending.size, acknowledgedEventCheckpoints: acknowledged.size,
  fixedStatePreserved: true, memoryContinuity: true, resetRestoration: true,
  trainPanels: train.length, validationPanels: validation.length, finalFamilyFilesRead: false,
  peakRssBytes: report.metrics.peakRssBytes,
  exactFreshNeuralReplays: true, replayPresentations: brain.presentations,
  auditPeakRssBytes,
  scope: 'Matched one-pass development condition; no final test, Monte Carlo search, or transferable reasoning claim.' };
audit.negativeZeroEntries = negativeZeroEntries;
audit.comparison = 'Exact replay with only JSON-unrepresentable negative zero normalized';
audit.supplementalAuditorSha256 = await sha256('.codebase/scripts/puzzle-learning/audit-bound-ray-feedback-development-json-zero.mjs');
const auditPath = join(runPath, 'audit-json-zero.json');
if (existsSync(auditPath) || existsSync(`${auditPath}.partial`)) throw Error('Audit already exists');
mkdirSync(dirname(auditPath), { recursive: true });
writeFileSync(`${auditPath}.partial`, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' });
renameSync(`${auditPath}.partial`, auditPath);
writeFileSync(`${auditPath}.COMPLETE.partial`, `${JSON.stringify({ schema: 'bound-ray-feedback-development-audit-complete-v1',
  auditSha256: await sha256(auditPath), reportSha256: await sha256(reportPath),
  protocolSha256: await sha256(protocolPath) }, null, 2)}\n`, { flag: 'wx' });
renameSync(`${auditPath}.COMPLETE.partial`, `${auditPath}.COMPLETE`);
console.log(JSON.stringify({ passed: true, reportPath, auditPath, condition: report.condition,
  encoder: report.encoder, certificates: audit.independentlyCheckedCertificates,
  validationBefore: report.baseline.validation.filter(row => row.correct).length,
  validationAfter: report.afterTraining.validation.filter(row => row.correct).length,
  finalFamilyFilesRead: false }));
