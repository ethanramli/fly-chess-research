// Independent proof, adaptive provenance, control and recurrence reconstruction.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { fixedStateHash, shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { reviewTracedExperience } from '../../src/search-and-feedback/trace-consequence-review.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
assert.ok(args.run);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const protocolPath = 'research/data/adaptive-near-transfer-repair-v2/protocol.json', p = read(protocolPath);
const reportPath = join(args.run, 'report.json'), report = read(reportPath), state = report.state;
assert.equal(report.complete, true); assert.equal(report.schema, p.schema);
assert.equal(report.identity.protocolPath, protocolPath);
assert.equal(report.identity.protocolSha256, await sha256(protocolPath));
assert.deepEqual(report.identity.inputs, p.inputs); assert.deepEqual(report.identity.sources, p.sources);
for (const [path, expected] of Object.entries({ ...p.inputs, ...p.sources }))
  assert.equal(await sha256(path), expected, `Identity mismatch: ${path}`);
const guard = () => {
  assert.ok(process.memoryUsage().rss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20);
};
guard(); const graph = loadGraph('.cache/full.npz'); guard();
const mapping = read(p.mappingPath).mapping, model = new SparseTrainer(graph, p.shared.model); guard();
const memory = new ReversalMemory(model, mapping, p.shared.memory); guard();
const initial = read(p.initialMemoryPath);
assert.equal(initial.schema, 'adaptive-near-transfer-warmstart-v1');
assert.deepEqual(initial.origin, p.warmStart);
assert.equal(digest(initial.memory), p.initialMemoryIdentity);
memory.restore(initial.memory);
const naive = memory.snapshot();
assert.deepEqual(state.naive, naive);
assert.equal(report.identity.initialMemoryHash, digest(naive));
assert.equal(fixedStateHash(model, memory.edges), p.shared.invariant);
assert.equal(report.identity.fixedStateHash, p.shared.invariant);
assert.equal(report.identity.mappingHash, digest(mapping));
assert.deepEqual(report.identity.readouts, p.shared.readouts);
const load = async ref => { assert.equal(await sha256(ref.path), ref.sha256); return read(ref.path); };
const rows = p.positions.map(ref => readFileSync(ref.path, 'utf8').trim().split(/\r?\n/)
  .map(JSON.parse).find(row => row.id === ref.id));
const task = row => ({ objective: row.objective, plies: row.plies });
const boardFor = row => { const board = new Chess(row.fen); if (row.pgn) board.loadPgn(row.pgn); return board; };
const uci = move => move.from + move.to + (move.promotion ?? '');
let certificates = 0, recurrences = 0, panels = 0, searches = 0;
function review(event, row) {
  const board = boardFor(row);
  assert.equal(event.context.fen, board.fen()); assert.equal(event.context.pgn, board.pgn());
  assert.deepEqual(event.context.task, task(row)); assert.equal(event.actor, board.turn());
  const move = board.moves({ verbose: true }).find(move => uci(move) === event.move); assert.ok(move);
  if (event.status === 'unknown') { assert.equal(event.learningAllowed, false); return; }
  board.move(move);
  const checked = checkMateCertificate(event.proof.certificate, board, {
    attacker: event.actor, plies: row.plies - 1, maxNodes: 100000, milliseconds: 60000 });
  assert.equal(checked.verified, true); assert.equal(checked.status, event.status);
  assert.equal(event.learningAllowed, true);
  assert.equal(digest(event.proof.certificate), event.certificateSha256); certificates++;
}
function panel(value, row, expectedMemory) {
  const board = boardFor(row), entries = value.assessment.rows;
  assert.deepEqual(entries.map(r => r.move).sort(), board.moves({ verbose: true }).map(uci).sort());
  assert.ok(entries.every(r => Number.isFinite(r.score) && Number.isFinite(r.MBON12) && Number.isFinite(r.MBON01)
    && r.score === r.MBON12 - r.MBON01));
  assert.equal(value.assessment.choice, [...entries].sort((a, b) => b.score - a.score)[0].move);
  assert.equal(value.review.move, value.assessment.choice);
  assert.equal(value.memoryFingerprint, digest(expectedMemory));
  assert.equal(value.assessment.memoryFingerprint, digest(expectedMemory));
  review(value.review, row); panels++;
}
function search(bundle, row, config, expectedMemory) {
  const s = bundle.search;
  assert.equal(bundle.memoryFingerprint, digest(expectedMemory));
  assert.equal(s.seed, config.seed); assert.deepEqual(s.task, task(row));
  assert.ok(s.evaluations <= config.maxEvaluations && s.simulations <= config.simulations && s.nodes <= config.maxNodes);
  assert.equal(s.candidateMode, config.candidateMode); assert.equal(s.forcingPriorMix, config.forcingPriorMix);
  assert.equal(uci(s.move), bundle.review.move);
  reviewTracedExperience(boardFor(row), s, bundle.traces, row, { maxTraces: config.simulations,
    maxTraceDepth: config.maxDepth, maxCandidates: 4, maxProofNodes: 4096,
    nodesPerCandidate: 1024, proofMilliseconds: 2000 });
  review(bundle.review, row); searches++;
}
const baseline = await load(state.baselineRef); panel(baseline, rows[0], naive);
const discovery = await load(state.discoveryRef); search(discovery, rows[0], p.teacherSearch, naive);
assert.equal(discovery.review.status, 'success');
search(await load(state.naiveSearchRef), rows[0], p.evaluationSearch, naive);
panel(await load(state.counterfactualBaselineRef), rows[1], naive);
assert.equal(state.conditionIndex, p.conditions.length);
assert.deepEqual(state.results.map(r => r.condition), p.conditions);
assert.equal(state.evaluationRefs.length, p.conditions.length);
const informativeEvents = await Promise.all(state.informativeEventRefs.map(load));
assert.ok(informativeEvents.length <= p.maxPairs * 2 && informativeEvents.length % 2 === 0);
const labels = informativeEvents.map(event => event.experience.status === 'success' ? 'PAM02' : 'PPL103');
const shuffled = labels.length ? shuffledFeedback(labels, p.shuffleSeed) : [];
assert.deepEqual(state.shuffle, shuffled);
assert.equal(state.shuffleIdentifiable, new Set(labels).size === 2 && shuffled.some((value, i) => value !== labels[i]));
const statuses = {}, diagnostic = {};
for (let c = 0; c < state.results.length; c++) {
  guard(); const condition = p.conditions[c], result = await load(state.results[c].resultRef);
  assert.equal(result.condition, condition);
  assert.equal(result.eventRefs.length, informativeEvents.length);
  assert.equal(result.rankingRefs.length, informativeEvents.length);
  assert.deepEqual(result.eventRefs, state.results[c].eventRefs);
  let previous = naive; const reviewedFailures = new Set(), revivals = [];
  for (let i = 0; i < result.eventRefs.length; i++) {
    const event = await load(result.eventRefs[i]), experience = event.experience;
    assert.equal(event.condition, condition); assert.equal(event.index, i); assert.equal(event.pairIndex, Math.floor(i / 2));
    assert.deepEqual(experience, informativeEvents[i].experience);
    assert.deepEqual(event.selectionRef, informativeEvents[i].selectionRef);
    assert.deepEqual(event.before, previous); review(experience, rows[0]);
    assert.equal(experience.status, i % 2 === 0 ? 'failure' : 'success');
    if (i % 2 === 0 && condition === 'informative') {
      const selection = await load(event.selectionRef); panel(selection, rows[0], event.before);
      assert.deepEqual(selection.review, experience);
    }
    if (i % 2) assert.equal(experience.move, discovery.review.move);
    const channel = condition === 'absent' ? null : condition === 'shuffled' ? shuffled[i]
      : experience.status === 'success' ? 'PAM02' : 'PPL103';
    const r = event.receipt;
    assert.equal(event.channel, channel); assert.equal(r.event.channel, channel);
    assert.equal(r.event.move, experience.move); assert.equal(r.event.status, experience.status);
    assert.deepEqual(r.before, event.before); assert.deepEqual(r.after, event.after);
    assert.deepEqual(r.context, experience.context);
    assert.deepEqual(r.cue, informativeEvents[i].receipt.cue);
    assert.equal(r.plasticityEnabled, condition !== 'disabled');
    assert.equal(r.fixedStateBefore, p.shared.invariant); assert.equal(r.fixedStateAfter, p.shared.invariant);
    if (condition === 'disabled') {
      assert.deepEqual(event.after, event.before); assert.equal(r.update.changedEdges, 0);
    } else {
      assert.equal(event.after.events, event.before.events + 1);
      const factors = mapping.groups.map((group, g) => {
        const rates = r.local.dan[g]; assert.equal(rates.length, group.dan.length);
        assert.ok(rates.every(rate => Number.isFinite(rate) && rate >= 0));
        return -rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      });
      assert.equal(r.local.factors.length, factors.length);
      assert.ok(factors.every((factor, j) => factor === r.local.factors[j])); // JSON may normalize -0.
      let offset = 0, changed = 0;
      for (let g = 0; g < mapping.groups.length; g++) {
        assert.ok(p.shared.memory.eta * -factors[g] <= 1);
        for (let j = 0; j < mapping.groups[g].edges.length; j++, offset++) {
          const k = r.local.kc[offset], prior = event.before.gains[offset];
          assert.ok(Number.isFinite(k) && k >= 0);
          const next = Math.max(p.shared.memory.minGain, Math.min(p.shared.memory.maxGain,
            prior + p.shared.memory.eta * factors[g] * (k + prior - 1)));
          assert.equal(event.after.gains[offset], next); if (next !== prior) changed++;
        }
      }
      assert.equal(r.local.kc.length, offset); assert.equal(r.update.changedEdges, changed); recurrences++;
    }
    previous = event.after;
    if (experience.status === 'failure') reviewedFailures.add(experience.move);
    const ranked = await load(result.rankingRefs[i]); panel(ranked, rows[0], previous);
    if (reviewedFailures.has(ranked.review.move)) revivals.push({ afterEvent: i, move: ranked.review.move });
  }
  assert.deepEqual(result.learned, previous);
  for (const key of ['after', 'repeat', 'restored']) panel(result[key], rows[0], previous);
  panel(result.reset, rows[0], naive);
  assert.deepEqual(result.repeat.assessment, result.after.assessment);
  assert.deepEqual(result.restored.assessment, result.after.assessment);
  assert.deepEqual(result.reset.assessment, baseline.assessment);
  const evaluation = await load(state.evaluationRefs[c]); assert.equal(evaluation.condition, condition);
  assert.equal(evaluation.memoryFingerprint, digest(previous));
  search(evaluation.fixedBudgetSearch, rows[0], p.evaluationSearch, previous);
  panel(evaluation.counterfactual, rows[1], previous);
  statuses[condition] = result.after.review.status;
  diagnostic[condition] = { reviewedPreferenceReturned: revivals, stoppedBy: result.stoppedBy };
}
assert.equal(state.totalEvents, informativeEvents.length * p.conditions.length);
assert.equal(report.summary.baseline, baseline.review.status);
assert.equal(report.summary.informative, statuses.informative);
assert.equal(report.summary.acquiredRepair, baseline.review.status === 'failure' && statuses.informative === 'success'
  && state.shuffleIdentifiable && ['absent', 'shuffled', 'disabled'].every(c => statuses[c] === 'failure'));
assert.ok(report.resources.peakRssMiB <= 768); assert.equal(report.resources.cpuDuty, p.runtime.cpuDuty);
const audit = { passed: true, reportSha256: await sha256(reportPath), certificatesChecked: certificates,
  panelsChecked: panels, searchesChecked: searches, recurrencesChecked: recurrences,
  matchedAdaptiveExperiences: true, diagnostic,
  scope: 'Integrity/proof/provenance/control/recurrence audit; acquired repair and transfer are separate outcome gates.' };
for (const name of ['audit.json', 'COMPLETE']) {
  const value = name === 'audit.json' ? audit : { complete: true,
    reportSha256: audit.reportSha256, auditSha256: await sha256(join(args.run, 'audit.json')), auditPassed: true };
  const path = join(args.run, name); assert.equal(existsSync(path), false);
  writeFileSync(path + '.partial', JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  renameSync(path + '.partial', path);
}
console.log(JSON.stringify(audit));
