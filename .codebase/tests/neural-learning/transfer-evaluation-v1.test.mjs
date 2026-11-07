import assert from 'node:assert/strict';
import test from 'node:test';
import { cueKey, exactRepeats, frozenScores, pairGate, similarBoardRecall } from '../../src/neural-learning/transfer-evaluation-v1.mjs';

const cue = (...pairs) => pairs.map(([index, current]) => ({ index, current }));
const pairs = (n, k) => Array.from({ length: n }, (_, i) => i < k);
const games = Array.from({ length: 60 }, (_, i) => `game-${i}`);
const run = (P, C, extra = {}) => pairGate({ arms: { P, C }, games, primary: 'P', comparators: ['C'], minCorrect: 44, minMargin: 6, ...extra });

test('frozenScores returns forward scores for an unchanged memory', () => {
  assert.deepEqual(frozenScores([1, 2, 3], c => c * 10, () => 'fixed'), [10, 20, 30]);
});

test('frozenScores rejects a scorer that changes the memory', () => {
  const memory = { n: 0 };
  assert.throws(() => frozenScores([1, 2], () => ++memory.n, () => String(memory.n)), { message: 'Memory changed during scoring' });
});

test('frozenScores rejects a call-count-dependent scorer with an unchanged memory', () => {
  let calls = 0;
  assert.throws(() => frozenScores([1, 2, 3], () => ++calls, () => 'fixed'), { message: 'Candidate order changed a score' });
});

test('frozenScores rejects empty candidates and NaN scores', () => {
  assert.throws(() => frozenScores([], c => c, () => 'fixed'), { message: 'No candidates' });
  assert.throws(() => frozenScores([1], () => NaN, () => 'fixed'), { message: 'Score is not finite' });
});

test('exactRepeats finds exact matches regardless of entry order', () => {
  const training = [cue([3, 1], [1, -1]), cue([5, 1])];
  const testCues = [cue([1, -1], [3, 1]), cue([2, 1]), cue([5, 1])];
  assert.deepEqual(exactRepeats(testCues, training), [0, 2]);
  assert.equal(cueKey(training[0]), cueKey(testCues[0]));
});

test('exactRepeats does not count a 1e-6 change in one current as a repeat', () => {
  const training = [cue([1, 0.5])];
  assert.deepEqual(exactRepeats([cue([1, 0.500001])], training), []);
  assert.deepEqual(exactRepeats([cue([1, 0.5])], training), [0]);
});

test('similarBoardRecall returns the value of the most similar stored cue', () => {
  const stored = [{ cue: cue([0, 1]), value: -1 }, { cue: cue([0, 1], [1, 1]), value: 1 }];
  const r = similarBoardRecall(cue([0, 0.1], [1, 1]), stored);
  assert.equal(r.value, 1);
  assert.ok(r.similarity > 0.77 && r.similarity < 0.78);
});

test('similarBoardRecall returns zero from an empty store', () => {
  assert.deepEqual(similarBoardRecall(cue([0, 1]), []), { value: 0, similarity: 0 });
});

test('similarBoardRecall returns zero for disjoint indices', () => {
  assert.deepEqual(similarBoardRecall(cue([0, 1]), [{ cue: cue([5, 1]), value: 1 }]), { value: 0, similarity: 0 });
});

test('similarBoardRecall keeps the earliest entry on a tie', () => {
  const stored = [{ cue: cue([0, 1]), value: -1 }, { cue: cue([0, 1]), value: 1 }];
  assert.deepEqual(similarBoardRecall(cue([0, 1]), stored), { value: -1, similarity: 1 });
});

test('similarBoardRecall rejects a stored value other than -1 or +1', () => {
  assert.throws(() => similarBoardRecall(cue([0, 1]), [{ cue: cue([0, 1]), value: 0 }]), /must be -1 or \+1/);
});

test('pairGate passes a clear primary win and is deterministic', () => {
  const first = run(pairs(60, 50), pairs(60, 30));
  assert.equal(first.pass, true);
  assert.equal(first.correct, 50);
  assert.equal(first.total, 60);
  assert.equal(first.comparators.C.margin, 20);
  assert.ok(first.comparators.C.lower > 0);
  assert.deepEqual(run(pairs(60, 50), pairs(60, 30)), first);
});

test('pairGate fails a comparator tied with the primary', () => {
  const r = run(pairs(60, 50), pairs(60, 50));
  assert.equal(r.pass, false);
  assert.equal(r.comparators.C.margin, 0);
});

test('pairGate fails when primary is below minCorrect', () => {
  assert.equal(run(pairs(60, 43), pairs(60, 30)).pass, false);
});

test('pairGate throws on empty games, mismatched lengths and a missing arm', () => {
  assert.throws(() => pairGate({ arms: { P: [], C: [] }, games: [], primary: 'P', comparators: ['C'], minCorrect: 44, minMargin: 6 }), /No games/);
  assert.throws(() => run(pairs(59, 50), pairs(60, 30)), /length differs/);
  assert.throws(() => pairGate({ arms: { P: pairs(60, 50) }, games, primary: 'P', comparators: ['C'], minCorrect: 44, minMargin: 6 }), /Missing arm C/);
});
