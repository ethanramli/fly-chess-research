import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';
const { values: args } = parseArgs({ options: { run: { type: 'string' } } });
if (!args.run) throw Error('Require --run');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = readFileSync(join(args.run, 'report.json')), r = JSON.parse(reportBytes);
assert.equal(r.complete, true);
let trajectories = 0, explanations = 0, defenses = 0;
const units = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const balance = (b, actor) => b.board().flat().filter(Boolean)
  .reduce((sum, p) => sum + units[p.type] * (p.color === actor ? 1 : -1), 0);
const move = (b, key) => b.move({ from: key.slice(0, 2), to: key.slice(2, 4),
  ...(key.length === 5 ? { promotion: key[4] } : {}) });
for (const ref of r.sharedPlans) {
  const bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256); const plan = JSON.parse(bytes);
  assert.equal(plan.traces.length, plan.calculation.simulations); assert.ok(plan.traces.length <= r.protocol.search.simulations);
  const prefixVisits = new Map(), rootVisits = new Map();
  for (let i = 0; i < plan.traces.length; i++) {
    const t = plan.traces[i], b = new Chess(); b.loadPgn(plan.task.pgn);
    assert.equal(t.index, i); assert.ok(t.moves.length <= r.protocol.search.maxDepth);
    const prefix = [];
    for (const key of t.moves) {
      assert.equal(b.isGameOver(), false); move(b, key); prefix.push(key);
      prefixVisits.set(prefix.join(' '), (prefixVisits.get(prefix.join(' ')) ?? 0) + 1);
    }
    if (t.moves.length) rootVisits.set(t.moves[0], (rootVisits.get(t.moves[0]) ?? 0) + 1);
    assert.equal(b.fen(), t.leafFen);
    if (t.reason === 'terminal') {
      assert.equal(b.isGameOver(), true); const v = b.isCheckmate() ? -1 : 0;
      assert.equal(t.rootEstimate, v === 0 ? 0 : v * (t.moves.length % 2 ? -1 : 1));
      assert.equal(t.evidence, 'observed-terminal');
    } else if (['assessment', 'assessment-capacity'].includes(t.reason)) {
      assert.equal(t.evidence, 'model-estimate'); assert.equal(t.rootEstimate === 0, true);
    } else { assert.equal(t.evidence, 'unknown-cutoff'); assert.equal(t.rootEstimate, null); }
    trajectories++;
  }
  for (const c of plan.calculation.candidates) assert.equal(c.visits, rootVisits.get(c.uci) ?? 0);
  for (const d of plan.consequence.diagnostics.filter(d => d.kind.startsWith('verified-defense-'))) {
    const e = plan.consequence.evidence.find(e => e.move === d.candidate);
    assert.equal(e.proof.status, 'failure'); assert.equal(e.proof.certificate.tree.children.length, 1);
    assert.equal(e.proof.certificate.tree.children[0].move, d.reply);
    assert.equal(d.sampled, prefixVisits.get([d.candidate, d.reply].join(' ')) ?? 0); defenses++;
  }
  for (const experience of plan.experiences) {
    const explanation = experience.explanation, b = new Chess(); b.loadPgn(experience.context.pgn);
    assert.equal(explanation.actor, b.turn()); assert.equal(explanation.candidate, experience.move);
    assert.equal(explanation.status, experience.status); assert.equal(explanation.teachingAllowed, true);
    assert.equal(explanation.certificateSha256, experience.certificateSha256);
    assert.deepEqual(explanation.materialRubric.units, units);
    const initial = balance(b, b.turn()), actor = b.turn();
    assert.equal(explanation.materialRubric.initialBalance, initial);
    let node = experience.proof.certificate.tree;
    for (let j = 0; j < explanation.sequence.length; j++) {
      const step = explanation.sequence[j], playedBy = b.turn(), legalCount = b.moves().length;
      if (j === 0) assert.equal(step.move, experience.move);
      else { const entry = node.children.find(e => e.move === step.move); assert.ok(entry);
        if (playedBy !== actor) assert.equal(step.certifiedDefensiveBranches, node.children.length);
        node = entry.node; }
      const before = balance(b, actor), played = move(b, step.move), after = balance(b, actor);
      assert.equal(step.materialBefore, before); assert.equal(step.materialAfter, after); assert.equal(step.change, after - before);
      assert.equal(step.captured, played.captured ?? null); assert.equal(step.playedBy, playedBy);
      assert.equal(step.onlyLegalReply, playedBy !== actor && legalCount === 1);
      assert.equal(step.successorFen, b.fen());
    }
    assert.equal(node.children.length, 0);
    assert.equal(explanation.materialRubric.finalBalance, balance(b, actor));
    const concession = explanation.sequence.some(s => s.materialAfter < initial);
    assert.equal(explanation.materialConcessionObserved, concession);
    assert.equal(explanation.mateDespiteMaterialConcession, experience.status === 'success' && concession);
    const root = new Chess(); root.loadPgn(experience.context.pgn); move(root, experience.move);
    const check = checkMateCertificate(experience.proof.certificate, root, {
      attacker: actor, plies: experience.context.task.plies - 1, maxNodes: 100000 });
    assert.equal(check.verified, true, check.reason); assert.equal(check.status, experience.status); explanations++;
  }
}
const audit = { passed: true, reportSha256: hash(reportBytes), trajectories, explanations, defenses,
  scope: 'Independent informative-plan trace and explanation replay; not semantic neural learning, calibrated strategic evaluation or transfer' };
writeFileSync(join(args.run, 'audit-traces.json'), JSON.stringify(audit, null, 2), { flag: 'wx' }); console.log(JSON.stringify(audit));
