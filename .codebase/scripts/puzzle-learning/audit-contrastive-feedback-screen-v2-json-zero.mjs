// Independent certificate, identity, exposure, recurrence and choice-panel audit.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash, shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { reviewTracedExperience } from '../../src/search-and-feedback/trace-consequence-review.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
if (!args.run || !existsSync(join(args.run, 'report.json'))) throw Error('Require a complete run report');
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('Audit resource guard: 768 MiB RSS / 256 MiB free memory');
};
guard();
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const reportBytes = readFileSync(join(args.run, 'report.json'));
const report = JSON.parse(reportBytes), p = read('research/data/contrastive-feedback-screen-v2/protocol.json');
assert.equal(report.complete, true); assert.equal(report.schema, p.schema);
assert.equal(report.identity.protocolPath, 'research/data/contrastive-feedback-screen-v2/protocol.json');
assert.equal(report.identity.protocolSha256, await sha256(report.identity.protocolPath));
assert.deepEqual(report.identity.inputs, p.inputs); assert.deepEqual(report.identity.sources, p.sources);
for (const [path, expected] of Object.entries(p.inputs)) assert.equal(await sha256(path), expected, `Input hash mismatch: ${path}`);
for (const [path, expected] of Object.entries(p.sources)) assert.equal(await sha256(path), expected, `Source hash mismatch: ${path}`);

const mapping = read(p.mappingPath).mapping;
const graph = loadGraph('.cache/full.npz'); guard();
const model = new SparseTrainer(graph, p.shared.model);
const memory = new ReversalMemory(model, mapping, p.shared.memory);
const naive = memory.snapshot();
assert.equal(digest(naive), report.identity.initialMemoryHash);
assert.equal(fixedStateHash(model, memory.edges), p.shared.invariant);

const readRef = async ref => {
  assert.equal(await sha256(ref.path), ref.sha256, `Artifact hash mismatch: ${ref.path}`);
  return read(ref.path);
};
const position = id => {
  const spec = p.positions.find(v => v.id === id), lines = readFileSync(spec.path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const row = lines.find(v => v.id === id); assert.ok(row); return row;
};
const taskFor = row => ({ objective: row.objective, plies: row.plies });
const uci = move => move.from + move.to + (move.promotion ?? '');
let certificatesChecked = 0, recurrencesChecked = 0, searchTracesChecked = 0;
function verifyReview(review, row) {
  const board = new Chess(row.fen);
  assert.equal(review.context.fen, board.fen()); assert.equal(review.context.pgn, board.pgn());
  assert.deepEqual(review.context.task, taskFor(row)); assert.equal(review.actor, board.turn());
  assert.ok(board.moves({ verbose: true }).some(m => uci(m) === review.move));
  if (review.status === 'unknown') {
    assert.equal(review.learningAllowed, false); assert.equal(review.certificateSha256, null); return;
  }
  const move = board.moves({ verbose: true }).find(m => uci(m) === review.move); board.move(move);
  const checked = checkMateCertificate(review.proof.certificate, board, {
    attacker: review.actor, plies: review.context.task.plies - 1, maxNodes: 100000, milliseconds: 60000,
  });
  assert.equal(checked.verified, true); assert.equal(checked.status, review.status);
  assert.equal(review.learningAllowed, true);
  assert.equal(hash(JSON.stringify(review.proof.certificate)), review.certificateSha256);
  certificatesChecked++;
}
function verifyPanel(panel, row) {
  const board = new Chess(row.fen), rows = panel.assessment.rows;
  const legal = board.moves({ verbose: true }).map(uci).sort();
  assert.deepEqual(rows.map(v => v.move).sort(), legal, 'Panel must contain every legal action exactly once');
  assert.equal(new Set(rows.map(v => v.move)).size, legal.length);
  for (const entry of rows) {
    assert.ok(Number.isFinite(entry.MBON12) && Number.isFinite(entry.MBON01) && Number.isFinite(entry.score));
    assert.equal(entry.score, entry.MBON12 - entry.MBON01);
  }
  assert.equal(panel.assessment.choice, [...rows].sort((a,b) => b.score-a.score)[0].move);
  verifyReview(panel.review, row);
}
function verifySearch(bundle, row) {
  const board = new Chess(row.fen);
  assert.deepEqual(bundle.search.task, taskFor(row));
  assert.ok(bundle.search.evaluations <= p.search.maxEvaluations);
  assert.ok(bundle.search.simulations <= p.search.simulations);
  assert.ok(bundle.search.nodes <= p.search.maxNodes);
  assert.equal(bundle.search.candidateMode, p.search.candidateMode);
  assert.equal(bundle.search.forcingPriorMix, p.search.forcingPriorMix);
  assert.equal(uci(bundle.search.move), bundle.review.move);
  assert.equal(bundle.traces.length, bundle.search.simulations);
  reviewTracedExperience(board, bundle.search, bundle.traces, row, {
    maxTraces: p.search.simulations, maxTraceDepth: p.search.maxDepth,
    maxCandidates: 4, maxProofNodes: 4096, nodesPerCandidate: 1024, proofMilliseconds: 2000,
  });
  verifyReview(bundle.review, row); searchTracesChecked++;
}
const trainingRow = position(p.positions[0].id), counterfactualRow = position(p.positions[1].id);

for (const variant of p.variants) {
  guard();
  const baseline = await readRef(report.baseline[variant.id]);
  assert.equal(baseline.variant.id, variant.id);
  verifyPanel(baseline.target, trainingRow);
  verifyPanel(baseline.counterfactual, counterfactualRow);
  verifySearch(baseline.fixedBudgetSearch, trainingRow);
  const pair = baseline.teachingPair;
  assert.equal(pair.length, 2);
  assert.deepEqual(pair.map(e => e.status).sort(), ['failure','success']);
  assert.deepEqual(pair.map(e => e.status), p.feedbackOrder[variant.id]);

  const conditionReports = {};
  for (const condition of p.conditions) {
    guard();
    const ref = report.variants.find(v => v.id === variant.id).conditions.find(v => v.condition === condition);
    assert.ok(ref); const current = await readRef(ref);
    assert.equal(current.variant.id, variant.id); assert.equal(current.condition, condition);
    assert.equal(current.encoderIdentity, baseline.encoderIdentity);
    verifyPanel(current.afterTraining, trainingRow);
    verifyPanel(current.counterfactual, counterfactualRow);
    verifyPanel({ assessment: current.repeated.assessment, review: current.repeated.review }, trainingRow);
    verifyPanel({ assessment: current.reset, review: report.baseline[variant.id].target.review }, trainingRow);
    verifyPanel({ assessment: current.restored, review: current.afterTraining.review }, trainingRow);
    verifySearch(current.fixedBudgetSearch, trainingRow);
    assert.deepEqual(current.repeated.assessment, current.afterTraining.assessment);
    assert.deepEqual(current.reset, baseline.target.assessment);
    assert.deepEqual(current.restored, current.afterTraining.assessment);
    assert.equal(current.gates.resetExact, true); assert.equal(current.gates.restoreExact, true);
    assert.equal(current.gates.fixedStatePreserved, true);
    assert.equal(current.experienceRefs.length, 2);
    let before = null;
    for (let i=0; i<2; i++) {
      const receipt = await readRef(current.experienceRefs[i]);
      const event = receipt.experience;
      assert.deepEqual(event, pair[i], 'Controls must replay the exact same board/action/certificate sequence');
      assert.deepEqual(receipt.before, before ?? naive, 'Each condition starts fresh and event memory is continuous');
      assert.equal(receipt.fixedStateBefore, p.shared.invariant);
      assert.equal(receipt.fixedStateAfter, p.shared.invariant);
      assert.equal(receipt.plasticityEnabled, condition !== 'disabled');
      const expectedChannel = condition === 'absent' ? null
        : condition === 'shuffled'
          ? shuffledFeedback(pair.map(e => e.status === 'success' ? 'PAM02' : 'PPL103'), p.shuffleSeed)[i]
          : event.status === 'success' ? 'PAM02' : 'PPL103';
      assert.equal(receipt.channel, expectedChannel);
      assert.equal(receipt.receipt.event.channel, expectedChannel);
      assert.equal(receipt.receipt.event.status, event.status);
      assert.equal(receipt.receipt.event.move, event.move);
      assert.deepEqual(receipt.receipt.before, receipt.before);
      assert.deepEqual(receipt.receipt.after, receipt.after);
      if (condition === 'disabled') {
        assert.deepEqual(receipt.after, receipt.before);
        assert.equal(receipt.receipt.update.changedEdges, 0);
      } else {
        assert.equal(receipt.after.events, receipt.before.events + 1);
        const factors = mapping.groups.map((group, g) => {
          const rates = receipt.receipt.local.dan[g];
          assert.equal(rates.length, group.dan.length);
          return -rates.reduce((sum, value) => sum + value, 0) / rates.length;
        });
        assert.equal(receipt.receipt.local.factors.length, factors.length);
        // JSON serializes -0 as 0. Numerical equality preserves exact values
        // while accepting that representation change; no tolerance is used.
        assert.ok(factors.every((value, index) => Number.isFinite(value)
          && Number.isFinite(receipt.receipt.local.factors[index])
          && receipt.receipt.local.factors[index] === value));
        let offset=0, changed=0;
        for (let g=0; g<mapping.groups.length; g++) {
          const group=mapping.groups[g], D=factors[g];
          assert.ok(p.memory.eta * -D <= 1);
          for (let j=0; j<group.edges.length; j++,offset++) {
            const k=receipt.receipt.local.kc[offset];
            assert.ok(Number.isFinite(k)&&k>=0);
            const prior=receipt.before.gains[offset];
            const next=Math.max(p.memory.minGain,Math.min(p.memory.maxGain,
              prior+p.memory.eta*D*(k+prior-1)));
            assert.equal(receipt.after.gains[offset],next);
            if(next!==prior)changed++;
          }
        }
        assert.equal(receipt.receipt.update.changedEdges,changed);
        recurrencesChecked++;
      }
      before=receipt.after;
    }
    assert.deepEqual(current.memory, before);
    assert.equal(digest(current.memory), current.afterFingerprint);
    conditionReports[condition]=current;
  }
  const status = Object.fromEntries(p.conditions.map(c => [c, conditionReports[c].afterTraining.review.status]));
  const summary = report.summary[variant.id];
  assert.equal(summary.baselineUnaided, baseline.target.review.status);
  assert.equal(summary.informativeUnaided, status.informative);
  assert.deepEqual(summary.controlsUnaided, ['absent','shuffled','disabled'].map(c=>status[c]));
  assert.equal(summary.baselineFixedSearch, baseline.fixedBudgetSearch.review.status);
  assert.equal(summary.informativeFixedSearch, conditionReports.informative.fixedBudgetSearch.review.status);
  assert.equal(summary.gates.informativeChoiceSuccess, status.informative==='success');
  assert.equal(summary.gates.repairAboveAllControls,
    baseline.target.review.status==='failure' && status.informative==='success'
      && ['absent','shuffled','disabled'].every(c=>status[c]==='failure'));
}
const audit = { passed: true, reportSha256: hash(reportBytes), certificatesChecked,
  correctiveAuditor: { path: '.codebase/scripts/puzzle-learning/audit-contrastive-feedback-screen-v2-json-zero.mjs',
    sha256: await sha256('.codebase/scripts/puzzle-learning/audit-contrastive-feedback-screen-v2-json-zero.mjs'),
    frozenAuditorSha256: p.sources['.codebase/scripts/puzzle-learning/audit-contrastive-feedback-screen-v2.mjs'],
    correction: 'Exact numerical factor equality accepts JSON normalization of negative zero; no recurrence tolerance or gate change.' },
  searchTracesChecked, localRecurrencesChecked: recurrencesChecked,
  identityAndControls: true, scope: 'Independent run identity, task, all-legal panel, search trace, certificate, paired-exposure, control schedule and local recurrence audit. Passing audit does not mean any learning gate passed.' };
const auditPath=join(args.run,'audit.json'), markerPath=join(args.run,'COMPLETE');
const atomic=(path,value)=>{const partial=`${path}.partial`;writeFileSync(partial,JSON.stringify(value,null,2)+'\n',{flag:'wx'});renameSync(partial,path);};
atomic(auditPath,audit);
atomic(markerPath,{complete:true,reportSha256:audit.reportSha256,auditSha256:await sha256(auditPath),auditPassed:true});
console.log(JSON.stringify(audit));
