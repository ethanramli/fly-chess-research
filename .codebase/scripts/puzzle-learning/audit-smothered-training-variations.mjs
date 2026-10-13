import assert from 'node:assert/strict';
import { createReadStream, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { run: { type: 'string' } } }); assert.ok(args.run);
const read = name => JSON.parse(readFileSync(`${args.run}/${name}`, 'utf8'));
const report = read('report.json'), plan = read('plan.json'); assert.equal(report.complete, true);
assert.equal(plan.generatorSha256, await sha256('.codebase/scripts/puzzle-learning/prepare-smothered-training-variations.mjs'));
assert.equal(plan.baseDatasetSha256, await sha256('research/data/smothered-acquisition-v1/puzzles.jsonl'));
assert.deepEqual(report.results.map(r => r.row), plan.candidates);
const seen = new Map(plan.candidates.map(row => [row.id, new Map()])); let certificates = 0;
for await (const line of createInterface({ input: createReadStream(`${args.run}/certificates.jsonl`), crlfDelay: Infinity })) {
  const { id, review } = JSON.parse(line), row = plan.candidates.find(r => r.id === id); assert.ok(row);
  const board = new Chess(row.fen); assert.equal(review.context.fen, board.fen());
  assert.equal(review.actor, board.turn()); assert.deepEqual(review.context.task, { objective: row.objective, plies: row.plies });
  assert.equal(seen.get(id).has(review.move), false);
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === review.move); assert.ok(move);
  board.move(move);
  if (review.status !== 'unknown') {
    const checked = checkMateCertificate(review.proof.certificate, board,
      { attacker: review.actor, plies: row.plies - 1, maxNodes: 100000, milliseconds: 60000 });
    assert.equal(checked.verified, true); assert.equal(checked.status, review.status);
    assert.equal(digest(review.proof.certificate), review.certificateSha256); certificates++;
  } else assert.equal(review.learningAllowed, false);
  seen.get(id).set(review.move, review.status);
}
for (const result of report.results) {
  const b = new Chess(result.row.fen), moves = b.moves({ verbose: true }), immediate = [];
  assert.equal(result.row.split, 'train'); assert.equal(result.row.finalTestEligible, false);
  assert.deepEqual([...seen.get(result.row.id).keys()].sort(), moves.map(m => m.from + m.to + (m.promotion ?? '')).sort());
  for (const move of moves) { b.move(move); if (b.isCheckmate()) immediate.push(move.lan); b.undo(); }
  assert.deepEqual(immediate, result.immediate);
  const statuses = [...seen.get(result.row.id)], counts = { success: 0, failure: 0, unknown: 0 };
  for (const [, status] of statuses) counts[status]++;
  assert.deepEqual(result.counts, counts); assert.deepEqual(result.successes, statuses.filter(([, s]) => s === 'success').map(([m]) => m));
  assert.equal(result.accepted, !immediate.length && !!counts.success && !counts.unknown);
}
const audit = { passed: true, certificates, positions: report.results.length,
  reportSha256: await sha256(`${args.run}/report.json`), certificatesSha256: await sha256(`${args.run}/certificates.jsonl`),
  scope: 'All-legal consequence/shortcut audit for training-only compositions; no learning or transfer evidence.' };
writeFileSync(`${args.run}/audit.json.partial`, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
renameSync(`${args.run}/audit.json.partial`, `${args.run}/audit.json`); console.log(JSON.stringify(audit));
