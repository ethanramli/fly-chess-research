import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

// Read-only teacher diagnostic. Never loads graph, changes gains, or selects a checkpoint.
const { values: args } = parseArgs({ options: { state: { type: 'string' }, out: { type: 'string' } } });
if (!args.state || !args.out || existsSync(args.out)) throw Error('Require immutable --state and fresh --out');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const stateBytes = readFileSync(args.state), s = JSON.parse(stateBytes);
assert.equal(s.identity.schema, 'positive-puzzle-pipeline-v1');
assert.ok(s.results.length > 0 && s.results.length <= 10);
const source = '.codebase/scripts/diagnostics/diagnose-positive-puzzle-ranking.mjs';
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mappingBytes = readFileSync(mappingPath), mapping = JSON.parse(mappingBytes).mapping;
assert.equal(hash(JSON.stringify(mapping)), s.identity.mappingHash);
const fixtures = [];
for (const result of s.results) {
  const planBytes = readFileSync(result.planRef.path); assert.equal(hash(planBytes), result.planRef.sha256);
  const plan = JSON.parse(planBytes), board = new Chess(); board.loadPgn(plan.task.pgn);
  assert.equal(board.fen(), result.row.fen);
  const legal = board.moves({ verbose: true }); assert.ok(legal.length <= 64);
  const key = move => move.from + move.to + (move.promotion ?? '');
  assert.deepEqual(result.before.rows.map(r => r.move).sort(), legal.map(key).sort());
  assert.deepEqual(result.after.rows.map(r => r.move).sort(), legal.map(key).sort());
  const before = new Map(result.before.rows.map(r => [r.move, r]));
  const reviewed = new Map(plan.experiences.map(e => [e.move, e.status]));
  const candidates = [];
  for (const move of legal) {
    const successor = new Chess(); successor.loadPgn(plan.task.pgn); successor.move(move);
    const proof = certifyMate(successor, board.turn(), { plies: result.row.plies - 1,
      maxNodes: 4096, milliseconds: 2000 });
    if (proof.status !== 'unknown') {
      const checked = checkMateCertificate(proof.certificate, successor, {
        attacker: board.turn(), plies: result.row.plies - 1, maxNodes: 4096, milliseconds: 2000 });
      assert.equal(checked.verified, true); assert.equal(checked.status, proof.status);
    }
    const action = key(move), previous = before.get(action), after = result.after.rows.find(r => r.move === action);
    candidates.push({ move: action, reviewed: reviewed.has(action), taughtStatus: reviewed.get(action) ?? null,
      status: proof.status, before: previous.score, after: after.score,
      change: after.score - previous.score, proof });
  }
  candidates.sort((a,b) => b.after - a.after);
  assert.equal(candidates[0].move, result.after.choice);
  const receiptInputs = result.receiptRefs.map(ref => {
    const bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256);
    const receipt = JSON.parse(bytes);
    let offset = 0;
    const groups = mapping.groups.map((group, groupIndex) => {
      let activeEdges = 0, changedEdges = 0, kcSum = 0;
      for (let i = 0; i < group.edges.length; i++, offset++) {
        const activity = receipt.local.kc[offset]; assert.ok(Number.isFinite(activity) && activity >= 0);
        kcSum += activity; if (activity > 0) activeEdges++;
        if (receipt.before.gains[offset] !== receipt.after.gains[offset]) changedEdges++;
      }
      return { group: groupIndex, side: group.side, danType: group.danType,
        edges: group.edges.length, activeEdges, kcSum, factor: receipt.local.factors[groupIndex] ?? null, changedEdges };
    });
    assert.equal(offset, receipt.local.kc.length);
    return { ...ref, move: receipt.event.move, status: receipt.event.status,
      deliveredChannel: receipt.event.channel, changedEdges: receipt.update.changedEdges, groups };
  });
  const successful = candidates.filter(r => r.status === 'success');
  fixtures.push({ id: result.row.id, condition: result.condition, beforeChoice: result.before.choice, afterChoice: result.after.choice,
    candidateCount: candidates.length, reviewedCount: reviewed.size, receiptInputs, candidates,
    bestVerifiedSuccess: successful.length ? successful.reduce((a,b) => a.after > b.after ? a : b).move : null,
    scope: 'Net before/after ranking with independently verified bounded consequences; no attribution to an individual update, capacity claim, or unfamiliar transfer' });
}
mkdirSync(args.out, { recursive: true });
writeFileSync(join(args.out, 'report.json'), JSON.stringify({ schema: 'positive-puzzle-ranking-diagnostic-v1',
  inputs: { state: args.state, stateSha256: hash(stateBytes), source, sourceSha256: hash(readFileSync(source)),
    mapping: mappingPath, mappingSha256: hash(mappingBytes) }, fixtures,
  scope: 'Read-only training-fixture coverage/ranking diagnostic; never a teaching event or gate adjustment' }, null, 2));
console.log(JSON.stringify(fixtures.map(r => ({ id:r.id, after:r.afterChoice, reviewed:r.reviewedCount,
  legal:r.candidateCount, bestVerifiedSuccess:r.bestVerifiedSuccess }))));
