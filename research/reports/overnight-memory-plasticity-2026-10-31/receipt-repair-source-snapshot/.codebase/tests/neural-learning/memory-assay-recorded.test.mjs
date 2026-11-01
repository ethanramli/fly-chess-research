import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildFixture, buildSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { buildCertificate } from '../../src/neural-learning/memory-assay-truth.mjs';
import { checkCertificate, hashRecord } from '../../src/neural-learning/memory-assay-checker-v2.mjs';
import { runCellSeed as originalCell } from '../../src/neural-learning/memory-assay-run.mjs';
import { runCellSeed, runTrajectory } from '../../src/neural-learning/memory-assay-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-record-audit.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule, register } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
register(registerRule);
const cell = { q: 0.25, relation: 'conflicting', w: 0, bg: 0 };
const expected = { ruleName: 'local-gated-v1', cell, seeds: [1001], nKC: 200, s: 20, temperature: 0.1, danDip: 0 };
const fixture = () => buildFixture({ seed: 1001, ...cell });
const capture = () => {
  const rows = [];
  const summaries = runCellSeed({ ruleName: expected.ruleName, cell, seed: 1001, writeRecord: row => rows.push(row) });
  return { rows, summaries };
};
const replay = rows => { let i = 0; return auditRecordedEvents(() => rows[i++] ?? null, expected); };
const clone = x => JSON.parse(JSON.stringify(x));
function reseal(rows) {
  let previous = 'genesis', seq = 0;
  for (const row of rows) {
    if (row.kind === 'start') { previous = 'genesis'; seq = 0; }
    row.seq = seq++; row.prevRecordHash = previous;
    const { hash, ...body } = row;
    row.hash = hashRecord(body); previous = row.hash;
  }
  return rows;
}

test('a rehashed certificate for an out-of-schedule trial must be rejected', () => {
  const fixture = buildFixture({ seed: 1001, q: 0.25, relation: 'conflicting', w: 0, bg: 0 });
  const schedule = buildSchedule({ seed: 1001 }), scores = { 'A+': 0.3, 'A-': 0.1 };
  const context = { fixtureId: fixture.id, scheduleHash: schedule.hash, prevHash: 'genesis', unknown: false,
    expectedTrial: { phase: 'ACQ_A', global: 0, item: 'A', situation: null, unknown: false }, scores, chosen: 'A+' };
  const cert = buildCertificate({ ...context, phase: 'ACQ_A', global: 999999, item: 'A', chosen: 'A+', scores });
  assert.equal(checkCertificate(cert, context).ok, false);
});

test('strict checking binds scores, action, phase, item and unknown timing', () => {
  const f = fixture(), schedule = buildSchedule(f), scores = { 'A+': 0.3, 'A-': 0.1 };
  const context = { fixtureId: f.id, scheduleHash: schedule.hash, prevHash: 'genesis', unknown: false,
    expectedTrial: { phase: 'ACQ_A', global: 0, item: 'A', situation: null, unknown: false }, scores, chosen: 'A+' };
  const base = { ...context, ...context.expectedTrial, scores };
  assert.equal(checkCertificate(buildCertificate(base), context).ok, true);
  for (const change of [{ scores: { 'A+': 1, 'A-': 0.1 } }, { chosen: 'A-' }, { phase: 'REV2' },
    { item: 'B', chosen: 'B+', scores: { 'B+': 0.3, 'B-': 0.1 } }, { unknown: true }]) {
    const forged = buildCertificate({ ...base, ...change });
    assert.equal(checkCertificate(forged, context).ok, false, JSON.stringify(change));
  }
  assert.equal(checkCertificate(buildCertificate(base), { ...context, expectedTrial: null }).ok, false);
});

test('recording is behavior-identical to the original loop on two distinct development fixtures', () => {
  for (const [seed, c] of [[1001, cell], [1002, { q: 0.1, relation: 'congruent', w: 0.5, bg: 0.1 }]]) {
    const rows = [], args = { ruleName: expected.ruleName, cell: c, seed };
    assert.deepEqual(runCellSeed({ ...args, writeRecord: r => rows.push(r) }), originalCell(args));
    assert.equal(rows.filter(r => r.kind === 'choice').length, 4 * 144);
    assert.equal(rows.filter(r => r.kind === 'feedback').length, 4 * 144);
  }
});

test('separate replay verifies choices, state, controls, unknown timing and terminal summaries', () => {
  const { rows, summaries } = capture(), audit = replay(rows);
  assert.deepEqual(audit.summaries, summaries);
  assert.equal(audit.checkedTrials, 4 * 144);
  assert.equal(audit.unknownTrials, 4 * 18);
  assert.equal(audit.trajectories, 4);
  const feedback = rows.filter(r => r.kind === 'feedback');
  for (const r of feedback.filter(r => r.trial.unknown)) {
    assert.equal(r.deliveredValence, null); assert.equal(r.prePulseGainsHash, r.postGainsHash);
  }
  const disabled = summaries.find(r => r.arm === 'disabled');
  assert.equal(disabled.initialStateHash, disabled.finalStateHash);
});

test('rehashed trial, score, choice, valence, state and consequence mutations fail replay', () => {
  const { rows } = capture();
  for (const [kind, mutate] of [
    ['choice', r => { r.trial.global = 999999; }], ['choice', r => { r.scores['A+'] += 1; }],
    ['choice', r => { r.chosen = r.chosen === 'A+' ? 'A-' : 'A+'; }],
    ['feedback', r => { r.deliveredValence = r.deliveredValence === 'reward' ? 'punish' : 'reward'; }],
    ['feedback', r => { r.postStateHash = 'forged'; }], ['feedback', r => { r.trueConsequence = 'forged'; }],
  ]) {
    const changed = clone(rows); mutate(changed.find(r => r.kind === kind));
    assert.throws(() => replay(reseal(changed)), /Replay mismatch|Invalid/);
  }
});

test('removed, duplicated, reordered, truncated and extra evidence fails replay', () => {
  const { rows } = capture();
  const removed = clone(rows); removed.splice(1, 1);
  const duplicated = clone(rows); duplicated.splice(2, 0, clone(duplicated[1]));
  const reordered = clone(rows); [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
  for (const data of [removed, duplicated, reordered, rows.slice(0, -1), [...rows, rows[0]]])
    assert.throws(() => replay(reseal(clone(data))), /chain|order|Truncated|Extra/);
});

test('sink failure stops before certificate creation or any teaching pulse', () => {
  let held, certificateCalled = false;
  registerRule('sink-failure-local-v2', f => (held = makeRule('sink-failure-local-v2', f)));
  assert.throws(() => runTrajectory({ ruleName: 'sink-failure-local-v2', fixture: fixture(), schedule: buildSchedule({ seed: 1001 }), arm: 'informative',
    writeRecord: r => { if (r.kind === 'choice') throw Error('disk sink failed'); },
    certificateBuilder: x => { certificateCalled = true; return buildCertificate(x); } }), /disk sink failed/);
  assert.equal(certificateCalled, false); assert.equal(held.memory.pulses, 0);
  assert.ok(held.memory.gains.every(g => g === 1));
});

test('rejected certificates emit no pulse and change no gain', () => {
  const rows = [];
  const summary = runTrajectory({ ruleName: expected.ruleName, fixture: fixture(), schedule: buildSchedule({ seed: 1001 }), arm: 'informative',
    writeRecord: r => rows.push(r), certificateBuilder: x => buildCertificate({ ...x, global: 999999 }) });
  assert.equal(summary.certsRejected, 144); assert.equal(summary.finalGainsHash, summary.initialGainsHash);
  for (const r of rows.filter(r => r.kind === 'feedback')) {
    assert.equal(r.check.ok, false); assert.equal(r.deliveredValence, null);
    assert.equal(r.deliveredPulseCount, 0); assert.equal(r.appliedPulseCount, 0);
    assert.equal(r.prePulseGainsHash, r.postGainsHash);
  }
});

test('disk-level CLI audit pins source, registration and record files; existing output is preserved', { timeout: 660000 }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-memory-receipt-v2-'));
  // Verify the resolved cleanup target is inside this test's named temporary parent.
  assert.ok(realpathSync(dir).startsWith(realpathSync(tmpdir()) + sep));
  const script = '.codebase/scripts/neural-learning/run-memory-assay-recorded.mjs';
  const registration = join(dir, 'registration.json'); writeFileSync(registration, '{}\n');
  const invoke = (mode, out, report, run) => spawnSync(process.execPath, ['--max-old-space-size=256', script, '--mode', mode,
    '--out', out, '--report', report, '--registration', registration, '--cpu-duty', '0.5', ...(run ? ['--run', run] : [])],
  { encoding: 'utf8', timeout: 310000 }); // CLI owns the stricter 300-second execution guard
  const output = join(dir, 'recorded');
  let passed = false;
  try {
    const made = invoke('run', output, join(dir, 'recorded-report'));
    assert.equal(made.status, 0, made.stderr || JSON.stringify({ error: made.error?.message, signal: made.signal }));
    const valid = invoke('audit', join(dir, 'audit'), join(dir, 'audit-report'), output);
    assert.equal(valid.status, 0, valid.stderr || JSON.stringify({ error: valid.error?.message, signal: valid.signal }));
    const result = JSON.parse(readFileSync(join(dir, 'audit/result.json'), 'utf8'));
    assert.equal(result.checkedTrials, 12 * 4 * 144); assert.equal(result.trajectories, 48);
    for (const [label, relative, pattern] of [
      ['source', 'source/.codebase/src/neural-learning/local-gated-memory.mjs', /Source identity mismatch/],
      ['registration', 'registration.json', /Registration snapshot identity mismatch/],
      ['records', 'events.jsonl', /Evidence file hash mismatch/],
    ]) {
      const damaged = join(dir, `damaged-${label}`); cpSync(output, damaged, { recursive: true });
      appendFileSync(join(damaged, relative), '\n');
      const rejected = invoke('audit', join(dir, `reject-${label}`), join(dir, `reject-${label}-report`), damaged);
      assert.equal(rejected.status, 1, label); assert.match(rejected.stderr, pattern);
      assert.equal(JSON.parse(readFileSync(join(dir, `reject-${label}/manifest.json`), 'utf8')).status, 'failed');
    }
    const manifestBefore = readFileSync(join(output, 'manifest.json'));
    const refused = invoke('run', output, join(dir, 'must-not-overwrite-report'));
    assert.equal(refused.status, 1); assert.deepEqual(readFileSync(join(output, 'manifest.json')), manifestBefore);
    passed = true;
  } finally {
    assert.ok(realpathSync(dir).startsWith(realpathSync(tmpdir()) + sep));
    if (passed) rmSync(dir, { recursive: true, force: true });
    else t.diagnostic(`Failed CLI artifacts preserved at ${dir}`);
  }
});
