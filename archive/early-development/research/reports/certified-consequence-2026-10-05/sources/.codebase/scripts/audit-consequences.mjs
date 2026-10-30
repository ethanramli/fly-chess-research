// Rechecks stored certificates without invoking proof construction, search or brain.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';

const { values: args } = parseArgs({ options: { result: { type: 'string' }, compare: { type: 'string' }, out: { type: 'string' } } });
if (!args.result || !args.out) throw Error('Require --result RESULT_JSON --out NEW_AUDIT_JSON; optional --compare RESULT_JSON');
const digest = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const result = read(args.result), checks = [];
for (const [path, hash] of Object.entries(result.sources)) assert.equal(digest(readFileSync(path)), hash, `Source changed: ${path}`);
checks.push('Recorded executable sources match current files');
assert.equal(result.receipt.appliedToNeurons, false); assert.equal(result.receipt.learningApplied, false);
assert.deepEqual(result.identity.before, result.identity.after);
checks.push('Record-only receipt and fixed graph/parameter identity');
const task = new Chess(); task.loadPgn(result.experience.task.pgn);
assert.equal(task.fen(), result.startingFen);
const attacker = task.turn(); assert.equal(attacker, result.experience.task.actor);
const moveBoard = move => {
  const b = new Chess(); b.loadPgn(task.pgn());
  assert.match(move, /^[a-h][1-8][a-h][1-8][qrbn]?$/);
  b.move({ from: move.slice(0,2), to: move.slice(2,4), ...(move.length === 5 ? { promotion: move[4] } : {}) });
  return b;
};
let checked = 0, unknowns = 0;
function verify(proof, board, plies) {
  assert.equal(proof.attacker, attacker);
  assert.equal(proof.reward, ({ success: 1, failure: -1, unknown: null })[proof.status]);
  if (proof.status === 'unknown') { unknowns++; return; }
  assert.equal(proof.certificateCheck.verified, true);
  const replay = checkMateCertificate(proof.certificate, board, { attacker, plies, maxNodes: 100000, milliseconds: 60000 });
  assert.equal(replay.verified, true, replay.reason); assert.equal(replay.status, proof.status); checked++;
}
verify(result.taskProof, task, result.puzzle.plies);
verify(result.feedback, moveBoard(result.chosenMove.uci), result.puzzle.plies - 1);
assert.equal(result.receipt.event.status, result.feedback.status);
assert.equal(result.receipt.event.reward, result.feedback.reward);
for (const e of result.experience.evidence) {
  const successor = moveBoard(e.move);
  assert.equal(e.actor, attacker); assert.equal(e.startingFen, task.fen()); assert.equal(e.successorFen, successor.fen());
  verify(e.proof, successor, result.puzzle.plies - 1);
}
const known = result.experience.evidence.filter(e => e.proof.status !== 'unknown');
assert.equal(result.experience.teachingExperiences.length, known.length);
for (const t of result.experience.teachingExperiences) {
  const e = known.find(e => e.move === t.move); assert.ok(e);
  assert.equal(t.certificateSha256, digest(JSON.stringify(e.proof.certificate)));
  assert.equal(t.outcome, e.proof.status); assert.equal(t.actor, attacker);
  assert.equal(t.neuralDelivery, 'not-implemented');
}
checks.push('All known consequences replay correctly; teaching events reference checked certificates');
// Timing measurements remain in raw artifacts; remove only timing fields for replay.
function scientific(value) {
  if (Array.isArray(value)) return value.map(scientific);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['elapsedMs', 'elapsedMilliseconds'].includes(key))
    .map(([key, v]) => [key, scientific(v)]));
  return value;
}
if (args.compare) {
  const other = read(args.compare);
  for (const key of ['puzzle', 'startingFen', 'endingFen', 'chosenMove', 'taskProof', 'feedback', 'receipt', 'experience', 'identity', 'inputs', 'sources', 'config', 'options'])
    assert.deepEqual(scientific(result[key]), scientific(other[key]), `Replay differs: ${key}`);
  assert.deepEqual(read(join(dirname(args.result), 'state.json')), read(join(dirname(args.compare), 'state.json')));
  checks.push('Exact checkpoint and scientific feedback replay, excluding elapsed measurements; search trajectory is not audited here');
}
const report = { schema: 'consequence-certificate-audit-v1', result: args.result, resultSha256: digest(readFileSync(args.result)),
  compare: args.compare ?? null, checkedCertificates: checked, unknownConsequences: unknowns, passed: true, checks,
  checkerSha256: digest(readFileSync('.codebase/src/lowram/mate-certificate-check.mjs')),
  auditSha256: digest(readFileSync('.codebase/scripts/audit-consequences.mjs')),
  limitations: ['Checks certificate consistency using the same chess rules library, not an independently implemented chess engine.',
    'Does not validate neural learning, biological interfaces, delayed credit or held-out transfer.'] };
writeFileSync(args.out, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify(report));
