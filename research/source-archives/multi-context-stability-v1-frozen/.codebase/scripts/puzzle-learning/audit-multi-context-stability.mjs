import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
assert.ok(args.run, 'Require --run');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = value => hash(JSON.stringify(value));
const protocolPath = 'research/data/multi-context-stability-v1/protocol.json';
const p = read(protocolPath), reportPath = join(args.run, 'report.json'), rawReport = readFileSync(reportPath);
const r = JSON.parse(rawReport);
// The runner publishes resolved condition results at report.results while the
// resumable checkpoint state keeps only resultRef pointers in state.results.
// Audit the published values and retain the checkpoint state for its pinned
// baseline, schedule, and evaluation references.
const s = { ...r.state, results: r.results };
assert.equal(digest(read(p.initialMemoryPath).memory), p.initialMemoryHash);
assert.deepEqual(s.naive, read(p.initialMemoryPath).memory);
assert.equal(r.identity.initialMemoryHash, p.initialMemoryHash);
assert.equal(r.complete, true); assert.equal(r.schema, p.schema);
assert.equal(r.identity.protocolSha256, hash(readFileSync(protocolPath)));
assert.equal(r.identity.fixedStateHash, p.shared.invariant);
assert.deepEqual(r.identity.sources, p.sources); assert.deepEqual(r.identity.inputs, p.inputs);
for (const [path, sha] of Object.entries({ ...p.inputs, ...p.sources }))
  assert.equal(hash(readFileSync(path)), sha, `Pinned identity mismatch: ${path}`);
for (const ref of p.requiredAudits) {
  assert.equal(hash(readFileSync(ref.report)), ref.reportSha256);
  const prerequisite = read(ref.report), audit = read(ref.audit);
  assert.equal(prerequisite.complete, true); assert.equal(audit.passed, true);
  assert.equal(audit.reportSha256, ref.reportSha256);
}
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.shared.mappingHash);
const rows = p.positions.map(ref => {
  assert.equal(ref.role, 'training'); assert.equal(ref.finalTestEligible, false);
  const row = readFileSync(ref.path, 'utf8').trim().split(/\r?\n/).map(JSON.parse).find(v => v.id === ref.id);
  assert.ok(row); assert.equal(row.split, 'train');
  if (row.finalTestEligible !== undefined) assert.equal(row.finalTestEligible, false);
  return row;
});
const readRef = ref => { const bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256); return JSON.parse(bytes); };
let certificates = 0, recurrences = 0, panelsChecked = 0;

function verifyExperience(e, row, { allowUnknown = false } = {}) {
  const board = new Chess(); board.loadPgn(e.context.pgn);
  assert.equal(board.fen(), row.fen); assert.equal(e.context.fen, row.fen);
  assert.deepEqual(e.context.task, { objective: row.objective, plies: row.plies });
  assert.equal(e.actor, board.turn());
  assert.ok(board.moves({ verbose: true }).some(m => m.from + m.to + (m.promotion ?? '') === e.move));
  if (e.status === 'unknown') {
    assert.equal(allowUnknown, true, 'Unknown verification cannot enter a teaching schedule');
    assert.equal(e.learningAllowed, false); assert.equal(e.experimentalPulse, null);
    assert.equal(e.certificateSha256, null); return;
  }
  assert.ok(['success', 'failure'].includes(e.status)); assert.equal(e.learningAllowed, true);
  const actor = board.turn(); board.move({ from: e.move.slice(0, 2), to: e.move.slice(2, 4),
    ...(e.move.length === 5 ? { promotion: e.move[4] } : {}) });
  const cert = e.proof.certificate;
  const checked = checkMateCertificate(cert, board, { attacker: actor, plies: row.plies - 1, maxNodes: 100000 });
  assert.equal(checked.verified, true); assert.equal(checked.status, e.status);
  assert.equal(cert.schema, 'bounded-mate-certificate-v1');
  assert.equal(hash(JSON.stringify(cert)), e.certificateSha256); certificates++;
}
function contextRow(panel) {
  const matching = rows.filter(row => panel.review.context.fen === row.fen);
  assert.equal(matching.length, 1, 'Every panel must identify exactly one pinned position by its board context');
  return matching[0];
}
assert.equal(s.baselineRefs.length, rows.length);
const baseline = s.baselineRefs.map((ref, i) => readRef(ref));
for (let i = 0; i < rows.length; i++) {
  const panel = baseline[i];
  assert.equal(panel.rowId, rows[i].id);
  assert.equal(panel.assessment.memoryFingerprint, r.identity.initialMemoryHash);
  verifyExperience(panel.review, rows[i], { allowUnknown: true });
  const legal = new Chess(rows[i].fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
  assert.deepEqual(panel.assessment.rows.map(v => v.move).sort(), legal.sort());
  assert.equal(panel.assessment.choice, [...panel.assessment.rows].sort((a,b)=>b.score-a.score)[0].move);
  for (const v of panel.assessment.rows) assert.equal(v.score, v.MBON12 - v.MBON01);
}

const informative = s.results.find(v => v.condition === 'informative');
assert.ok(informative);
const infoEvents = informative.eventRefs.map(readRef);
assert.ok(infoEvents.length <= p.maxContextSlots * 2);
const shuffledLabels = infoEvents.map(e => e.experience.status === 'success' ? 'PAM02' : 'PPL103');
function shuffled(values, seed) {
  let state = seed >>> 0; const rand = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 2 ** 32; };
  const copy = [...values]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
const shuffledLabelsExpected = shuffled(shuffledLabels, p.shuffleSeed);
assert.deepEqual(s.shuffle, shuffledLabelsExpected);
const shuffleIdentifiable = new Set(shuffledLabels).size === 2
  && shuffledLabels.some((v, i) => v !== shuffledLabelsExpected[i]);
assert.equal(s.shuffleIdentifiable, shuffleIdentifiable);

const conditions = {};
for (const condition of p.conditions) {
  const result = s.results.find(v => v.condition === condition); assert.ok(result);
  assert.equal(result.eventRefs.length, infoEvents.length);
  assert.equal(result.rankingRefs.length, infoEvents.length);
  let memory = s.naive;
  for (let j = 0; j < result.eventRefs.length; j++) {
    const event = readRef(result.eventRefs[j]), experience = event.experience, receipt = event.receipt;
    const source = infoEvents[j];
    const row = rows.find(row => row.id === event.rowId); assert.ok(row);
    verifyExperience(experience, row);
    assert.equal(event.index, j); assert.deepEqual(event.before, memory);
    assert.equal(receipt.fixedStateBefore, r.identity.fixedStateHash);
    assert.equal(receipt.fixedStateAfter, r.identity.fixedStateHash);
    if (condition !== 'informative') {
      assert.equal(event.rowId, source.rowId);
      assert.deepEqual(experience, source.experience);
    } else {
      assert.equal(event.pairIndex, Math.floor(j / 2));
      const selection = readRef(event.selectionRef);
      assert.equal(contextRow(selection).id, event.rowId);
      const selectedAt = j % 2 === 0 ? event.before : infoEvents[j - 1].before;
      assert.equal(selection.memoryFingerprint, digest(selectedAt));
      assert.equal(selection.assessment.memoryFingerprint, digest(selectedAt));
      assert.equal(selection.review.status, 'failure');
      verifyExperience(selection.review, row);
      if (j % 2 === 0) assert.deepEqual(experience, selection.review);
      else {
        assert.equal(experience.status, 'success');
        assert.equal(event.rowId, infoEvents[j - 1].rowId);
      }
    }
    const expectedChannel = condition === 'absent' ? null
      : condition === 'shuffled' ? s.shuffle[j]
        : experience.status === 'success' ? 'PAM02' : 'PPL103';
    assert.equal(event.channel, expectedChannel);
    assert.equal(receipt.event.channel, expectedChannel);
    assert.deepEqual(receipt.before, event.before); assert.deepEqual(receipt.after, event.after);
    assert.equal(receipt.plasticityEnabled, condition !== 'disabled');
    if (condition === 'disabled') assert.deepEqual(event.after, event.before);
    else {
      const eta = p.shared.memory.eta, min = p.shared.memory.minGain, max = p.shared.memory.maxGain;
      const scale = p.shared.memory.activityScale;
      let offset = 0, localKC = 0, changed = 0;
      assert.equal(receipt.local.dan.length, mapping.groups.length);
      for (let g = 0; g < mapping.groups.length; g++) {
        const group = mapping.groups[g], danRates = receipt.local.dan[g];
        assert.equal(danRates.length, group.dan.length);
        const D = -danRates.reduce((a, v) => a + v, 0) / danRates.length;
        assert.ok(Math.abs(receipt.local.factors[g] - D) <= 1e-7);
        for (const rate of danRates) assert.ok(Number.isFinite(rate) && rate >= 0);
        for (let k = 0; k < group.edges.length; k++, offset++, localKC++) {
          const kc = receipt.local.kc[localKC]; assert.ok(Number.isFinite(kc) && kc >= 0);
          const before = event.before.gains[offset];
          const after = Math.max(min, Math.min(max, before + eta * D * (kc + before - 1)));
          assert.equal(event.after.gains[offset], after); if (after !== before) changed++;
        }
      }
      assert.equal(localKC, receipt.local.kc.length);
      assert.equal(receipt.update.changedEdges, changed);
      assert.equal(receipt.learningApplied, changed > 0); recurrences++;
    }
    const ranking = readRef(result.rankingRefs[j]);
    assert.equal(ranking.length, rows.length);
    const nextMemoryHash = digest(event.after);
    assert.deepEqual(ranking.map(contextRow).map(v => v.id).sort(), rows.map(v => v.id).sort());
    for (const panel of ranking) {
      const row = contextRow(panel);
      assert.equal(panel.memoryFingerprint, nextMemoryHash);
      assert.equal(panel.assessment.memoryFingerprint, nextMemoryHash);
      const legal = new Chess(row.fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
      assert.deepEqual(panel.assessment.rows.map(v => v.move).sort(), legal.sort());
      assert.equal(panel.assessment.choice, [...panel.assessment.rows].sort((a,b)=>b.score-a.score)[0].move);
      for (const v of panel.assessment.rows) assert.equal(v.score, v.MBON12 - v.MBON01);
      verifyExperience(panel.review, row, { allowUnknown: true }); panelsChecked++;
    }
    memory = event.after;
  }
  assert.deepEqual(result.learned, memory);
  for (let i = 0; i < rows.length; i++) {
    for (const panel of [result.after[i], result.repeat[i], result.reset[i], result.restored[i]]) {
      assert.equal(contextRow(panel).id, rows[i].id);
      const legal = new Chess(rows[i].fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
      assert.deepEqual(panel.assessment.rows.map(v => v.move).sort(), legal.sort());
      assert.equal(panel.assessment.choice, [...panel.assessment.rows].sort((a,b)=>b.score-a.score)[0].move);
      for (const v of panel.assessment.rows) assert.equal(v.score, v.MBON12 - v.MBON01);
      verifyExperience(panel.review, rows[i], { allowUnknown: true }); panelsChecked++;
    }
    assert.deepEqual(result.after[i].assessment, result.repeat[i].assessment);
    assert.deepEqual(result.after[i].assessment, result.restored[i].assessment);
    assert.deepEqual(result.reset[i].assessment, baseline[i].assessment);
    assert.equal(result.after[i].assessment.memoryFingerprint, digest(result.learned));
  }
  conditions[condition] = result;
}

assert.equal(s.evaluationRefs.length, p.conditions.length);
const evaluations = s.evaluationRefs.map(readRef);
for (const evaluation of evaluations) {
  assert.equal(evaluation.contexts.length, rows.length);
  for (let i = 0; i < rows.length; i++) {
    const pair = evaluation.contexts[i]; assert.equal(pair.panel.rowId, rows[i].id);
    const legal = new Chess(rows[i].fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
    assert.deepEqual(pair.panel.assessment.rows.map(v => v.move).sort(), legal.sort());
    verifyExperience(pair.panel.review, rows[i], { allowUnknown: true });
    verifyExperience(pair.fixedBudgetSearch.review, rows[i], { allowUnknown: true });
    assert.equal(pair.panel.assessment.memoryFingerprint, evaluation.memoryFingerprint);
    assert.equal(pair.fixedBudgetSearch.memoryFingerprint, evaluation.memoryFingerprint);
    assert.ok(pair.fixedBudgetSearch.search.evaluations <= p.evaluationSearch.maxEvaluations);
    assert.ok(pair.fixedBudgetSearch.search.nodes <= p.evaluationSearch.maxNodes);
    assert.equal(pair.fixedBudgetSearch.memoryFingerprint, evaluation.memoryFingerprint);
  }
}
const finalInfo = conditions.informative.after.map(v => v.review.status);
const finalControls = ['absent', 'disabled'].map(c => conditions[c].after.map(v => v.review.status));
const baselineFailures = baseline.map(v => v.review.status === 'failure');
const repairedAboveControls = baselineFailures.some((wasWrong, i) => wasWrong
  && finalInfo[i] === 'success' && finalControls.every(c => c[i] === 'failure'));
const gates = {
  allContextAcquisition: finalInfo.every(v => v === 'success'),
  acquiredRepairAboveAbsentAndDisabled: repairedAboveControls,
  shuffleNondegenerate: shuffleIdentifiable,
  sharedMemoryPersistenceAndReset: true,
  fixedGraphAndParameters: true,
  fixedBudgetSearchBothContexts: evaluations.find(v => v.condition === 'informative')
    .contexts.every(v => v.fixedBudgetSearch.review.status === 'success'),
};
const audit = { passed: true, reportSha256: hash(rawReport), certificatesChecked: certificates,
  allLegalPanelsChecked: panelsChecked, recurrencesChecked: recurrences, gates,
  auditorSourceSha256: hash(readFileSync('.codebase/scripts/puzzle-learning/audit-multi-context-stability.mjs')),
  interpretation: 'Integrity, proof, recurrence and matched-control audit. Same-family shared-memory acquisition does not establish unfamiliar transfer, natural biological learning or reasoning.' };
const atomic = (path, value) => {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path)) { assert.equal(readFileSync(path, 'utf8'), bytes); return; }
  writeFileSync(path + '.partial', bytes, { flag: 'wx' }); renameSync(path + '.partial', path);
};
atomic(join(args.run, 'audit.json'), audit);
atomic(join(args.run, 'COMPLETE'), { reportSha256: audit.reportSha256,
  auditSha256: hash(readFileSync(join(args.run, 'audit.json'))), passed: true });
console.log(JSON.stringify(audit));
