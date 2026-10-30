import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createAdapters } from './fixtures/inert-plasticity-adapter.mjs';
import { loadReviewedAdapters, validateReversalSchedule } from '../../scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs';
import { CONDITIONS, runResumableAssay, auditAssayRecords, evaluateAssayGates, receiptDigest, loadLastCheckpoint } from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const adapterPath = '.codebase/tests/puzzle-learning/fixtures/inert-plasticity-adapter.mjs';
const hash = createHash('sha256').update(readFileSync(adapterPath)).digest('hex');
function inputs(modelConfig = null) {
  const identity = Object.fromEntries(['graph', 'model', 'memory', 'encoder', 'readout', 'policy', 'dataset', 'protocol'].map(k => [k, 'a'.repeat(64)]));
  Object.assign(identity, { algorithms: { assayAdapter: hash }, seeds: [17], splits: { train: ['a'], validation: ['b'], final: ['c'] } });
  const protocol = { identity, seed: 17, modelConfig, runtime: { rssMiB: 768, freeMiB: 256 }, search: { maxEvaluations: 0, deadlineMs: 0 },
    budgets: { maxPresentations: 512, maxEvaluations: 4096, maxEvaluationsPerAssessment: 16, maxLegalMoves: 64, maxStoredNodes: 0, maxLogEntries: 64 },
    gates: Object.fromEntries(['selectiveAcquisition', 'preservation', 'finiteReversal', 'saturation', 'controlSeparation'].map(k => [k, { threshold: 0.01 }])) };
  const experiences = ['success', 'failure'].map((status, i) => ({ id: 'e' + i, fen: 'inert-board', pgn: 'inert-history',
    task: { objective: 'fixture' }, action: 'm' + i, status, certificateSha256: String(i + 1).repeat(64) }));
  const schedule = experiences.map((e, i) => ({ id: 's' + i, experienceId: e.id, expectedChannel: i ? 'PPL103' : 'PAM02', phase: 'acquisition', delaySteps: 0 }));
  const verify = async e => ({ learningAllowed: true, status: e.status, move: e.action, certificateSha256: e.certificateSha256, verifiedScope: 'inert fixture' });
  return { protocol, identity, experiences, schedule, verify, guard: () => {} };
}
const makeAdapters = p => createAdapters({ identity: p.identity, modelConfig: p.modelConfig });
const logs = dir => Object.fromEntries(CONDITIONS.map(c => [c, readFileSync(join(dir, c + '.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
const auditOptions = (options, run, records) => ({ ...options, recordsByCondition: records, receiptDigests: run.state.receiptDigests,
  adapterStates: run.state.adapterStates, initialPhysiologicalHashes: run.state.initialPhysiologicalHashes });

for (const stage of ['assess', 'deliver', 'readout']) test('exact stateful recovery after ' + stage + ' interruption', async () => {
  const root = mkdtempSync(join(tmpdir(), 'flychess-stage-recovery-'));
  try {
    const options = inputs();
    const uninterruptedDir = join(root, 'uninterrupted'), resumedDir = join(root, 'resumed');
    const clean = await runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: uninterruptedDir });
    const interrupted = inputs({ interruptStage: stage });
    await assert.rejects(runResumableAssay({ ...interrupted, adapters: makeAdapters(interrupted.protocol), outputDir: join(root, 'interrupted') }), /inert .* interruption/);
    const resumed = await runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: resumedDir, resumeFrom: join(root, 'interrupted') });
    assert.deepEqual(resumed.state.adapterStates, clean.state.adapterStates);
    assert.deepEqual(resumed.state.exposures, clean.state.exposures);
    // Wall resource samples vary; neural/behavioral/state evidence must match exactly.
    const stable = dir => Object.fromEntries(Object.entries(logs(dir)).map(([c, rows]) => [c, rows.map(({ resources, ...r }) => r)]));
    assert.deepEqual(stable(resumedDir), stable(uninterruptedDir));
    assert.equal((await auditAssayRecords(auditOptions(options, resumed, logs(resumedDir)))).passed, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const stage of ['assess', 'deliver', 'readout']) test('disabled physiology mutation rejected during ' + stage, async () => {
  const root = mkdtempSync(join(tmpdir(), 'flychess-disabled-stage-'));
  try {
    const options = inputs({ mutateStage: stage });
    await assert.rejects(runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: join(root, 'run') }), /Disabled-plasticity/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('independent audit rejects altered margins, even with a replacement receipt digest', async () => {
  const root = mkdtempSync(join(tmpdir(), 'flychess-audit-evidence-'));
  try {
    const options = inputs(), dir = join(root, 'run');
    const run = await runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: dir });
    const records = logs(dir);
    records.informative[0].behavioral.afterMargin = 100;
    await assert.rejects(auditAssayRecords(auditOptions(options, run, records)), /receipt digest mismatch/);
    const opts = auditOptions(options, run, records); opts.receiptDigests = { ...opts.receiptDigests,
      [records.informative[0].id]: receiptDigest(records.informative[0]) };
    await assert.rejects(auditAssayRecords(opts), /Behavioral margin evidence mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('same action in two boards cannot hide a regressing criterion', () => {
  const p = inputs().protocol;
  const rows = ['A', 'B'].map((fen, i) => ({ condition: 'informative', teacherEvidence: { verified: true },
    context: { fen, pgn: '', task: { objective: 'fixture' }, action: 'a1a4' }, slot: { phase: 'acquisition' },
    behavioral: { beforeMargin: i ? 0.2 : 0, afterMargin: 0.1 } }));
  const result = evaluateAssayGates(rows, p);
  assert.equal(result.cueResults.length, 2); assert.equal(result.gates.selectiveAcquisition, false);
});

test('reviewed adapter loader executes the real import path and checks hashes', async () => {
  const p = inputs().protocol;
  const adapters = await loadReviewedAdapters(p, resolve(adapterPath));
  assert.equal(new Set(Object.values(adapters)).size, 5);
  const altered = structuredClone(p); altered.identity.algorithms.assayAdapter = '0'.repeat(64);
  await assert.rejects(loadReviewedAdapters(altered, adapterPath), /source hash mismatch/);
});

test('real run CLI refuses blocked biology before importing any adapter', () => {
  const result = spawnSync(process.execPath, ['--max-old-space-size=256',
    '.codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs', '--run', '--adapter', 'nonexistent-sentinel.mjs',
    '--anatomy-report', 'research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json', '--out', 'runs/must-not-be-created'],
  { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 2); assert.match(result.stderr, /No learning started/);
  assert.doesNotMatch(result.stderr, /ENOENT|ReferenceError/);
  assert.equal(existsSync('runs/must-not-be-created'), false);
});

test('resume ignores a truncated unacknowledged log tail, but rejects a changed acknowledged prefix', async () => {
  const root = mkdtempSync(join(tmpdir(), 'flychess-log-tail-'));
  try {
    const options = inputs(), source = join(root, 'source'); let injected = false;
    const guard = () => {
      if (injected || !existsSync(join(source, 'informative.jsonl'))) return;
      const checkpoint = loadLastCheckpoint(source, options.identity);
      if (checkpoint.state.coordinatorState.completed.length !== 1) return;
      injected = true; appendFileSync(join(source, 'informative.jsonl'), '{"partial":');
      throw Error('inert trailing log interruption');
    };
    await assert.rejects(runResumableAssay({ ...options, guard, adapters: makeAdapters(options.protocol), outputDir: source }), /trailing log/);
    const resumedDir = join(root, 'resumed');
    const resumed = await runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: resumedDir, resumeFrom: source });
    assert.equal((await auditAssayRecords(auditOptions(options, resumed, logs(resumedDir)))).passed, true);
    const altered = logs(resumedDir).informative; altered[0].behavioral.afterMargin++;
    writeFileSync(join(resumedDir, 'informative.jsonl'), altered.map(r => JSON.stringify(r)).join('\n') + '\n');
    await assert.rejects(runResumableAssay({ ...options, adapters: makeAdapters(options.protocol), outputDir: join(root, 'rejected'), resumeFrom: resumedDir }), /receipt digest mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('work is bounded and cue dose must match across controls', async () => {
  const root = mkdtempSync(join(tmpdir(), 'flychess-dose-work-'));
  try {
    const options = inputs(), adapters = makeAdapters(options.protocol);
    const assess = adapters.absent.assess;
    adapters.absent.assess = async (...args) => ({ ...await assess(...args), inputDose: 1 });
    await assert.rejects(runResumableAssay({ ...options, adapters, outputDir: join(root, 'dose') }), /exposure mismatch/);
    const bad = makeAdapters(options.protocol), original = bad.informative.assess;
    bad.informative.assess = async (...args) => ({ ...await original(...args), evaluations: 17 });
    await assert.rejects(runResumableAssay({ ...options, adapters: bad, outputDir: join(root, 'bound') }), /evaluation budget/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('reversal requires registered distinct contexts, measured common cue, pins and both bounded directions', () => {
  const p = inputs().protocol;
  const options = inputs(); p.experiences = options.experiences; p.schedule = options.schedule;
  assert.deepEqual(validateReversalSchedule(p), ['two-direction certified reversal schedule missing']);
  const [forward, back] = p.experiences;
  back.action = forward.action; back.fen = 'changed-context';
  forward.cueHash = back.cueHash = 'c'.repeat(64); forward.cueEvidenceSha256 = back.cueEvidenceSha256 = 'd'.repeat(64);
  p.pinnedFiles = [{ path: 'fixture-cue-evidence', sha256: 'd'.repeat(64) }];
  p.reversalAssociations = [{ id: 'fixture-association', forwardExperienceId: forward.id, backExperienceId: back.id,
    cueHash: forward.cueHash, encoder: p.identity.encoder, maxEventsPerDirection: 1 }];
  p.schedule[0].phase = 'reversal-forward'; p.schedule[1].phase = 'reversal-back';
  assert.deepEqual(validateReversalSchedule(p), []);
  back.status = forward.status;
  assert.match(validateReversalSchedule(p).join(' '), /Invalid context/);
  back.status = 'failure'; back.cueHash = 'e'.repeat(64);
  assert.match(validateReversalSchedule(p).join(' '), /Invalid context/);
  back.cueHash = forward.cueHash; p.schedule.pop();
  assert.match(validateReversalSchedule(p).join(' '), /Missing\/budget-exhausted/);
});
