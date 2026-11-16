import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Chess } from 'chess.js';
import { legalCandidates, recordsFor, combine } from '../../src/search-and-feedback/concept-records-v1.mjs';
import { generateFlipPairs, PAIR_TYPES, splitForFamily } from '../../src/puzzle-learning/flip-pair-generator-v1.mjs';
import { checkConceptRecords } from '../../scripts/search-and-feedback/check-concept-records.mjs';

test('candidate records never enumerate opponent replies, even on checking moves', t => {
  const fen = '4k3/2p5/3p4/8/4N3/8/8/4R1K1 w - - 0 1';
  const expected = new Chess(fen).moves({ verbose: true }).filter(move => move.piece !== 'k')
    .map(({ from, to, promotion, after, piece, captured }) => ({
      move: from + to + (promotion ?? ''), to, after, piece, captured,
    }));
  const moves = Chess.prototype._moves;
  // Spying on public moves() misses chess.js's internal SAN reply search.
  const enumerate = t.mock.method(Chess.prototype, '_moves', function (...args) {
    assert.equal(this.turn(), 'w', 'the opponent move generator was called');
    return moves.apply(this, args);
  });
  assert.deepEqual(legalCandidates(fen), expected);
  assert.ok(enumerate.mock.callCount() > 0);
  const records = recordsFor(fen, 'e4d6');
  assert.deepEqual(Object.keys(records), ['move', 'to', 'reach', 'pins', 'worth']);
  for (const reach of records.reach) assert.deepEqual(Object.keys(reach), ['concept', 'piece', 'to']);
  for (const pin of records.pins) assert.deepEqual(Object.keys(pin), ['concept', 'piece', 'by', 'line']);
});

test('a pinned piece can capture along its pin line', () => {
  const fen = '4k3/8/8/4r3/R3p3/8/8/6K1 w - - 0 1';
  const records = recordsFor(fen, 'a4e4');
  assert.equal(records.pins.find(pin => pin.piece === 'e5').by, 'e4');
  assert.deepEqual(combine(records), { live: ['e5'], score: -4 });
  assert.deepEqual(combine({ ...records, reach: [{ ...records.reach[0], to: 'e3' }] }), { live: [], score: 1 });
});

test('the score uses pawn worth for promotions and only counts replies to the landing square', () => {
  const promotion = recordsFor('k6r/4P3/8/8/8/8/8/2K5 w - - 0 1', 'e7e8q');
  assert.equal(combine(promotion).score, -1);
  const enPassant = recordsFor('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5d6');
  assert.equal(combine(enPassant).score, 1);
  const pawnPush = recordsFor('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1', 'e2e4');
  assert.equal(combine(pawnPush).score, 0);
});

test('the saved benchmark replays the match, shortcut, removal and swap results', () => {
  const { hand, savedPairs, distinctBoardsChecked, nonKingMovesChecked } = checkConceptRecords();
  assert.equal(distinctBoardsChecked, 136);
  assert.equal(nonKingMovesChecked, 3849);
  assert.equal(hand.match, 5);
  assert.equal(hand.pinRemoved, 2);
  assert.equal(hand.reachRemoved, 2);
  assert.equal(hand.worthRemoved.toFixed(2), '3.11');
  assert.equal(hand.pinSwapped, 1);
  assert.equal(hand.reachSwapped, 3);
  assert.equal(hand.fixedSum.boardCredit, 2);
  assert.equal(hand.fixedSumWithLegalRecapture.boardCredit, 4);
  assert.equal(hand.fewestLegalReplies, 1);
  assert.equal(savedPairs.match.solved, 71);
  assert.equal(savedPairs.fixedSum.solved, 0);
  assert.equal(savedPairs.fixedSumFitByFamily.heldBack.pairs, 38);
  assert.equal(savedPairs.fixedSumFitByFamily.heldBack.solved, 0);
  assert.equal(savedPairs.fixedSumWithLegalRecapture.solved, 31);
  assert.equal(savedPairs.pinRemoved.solved, 11);
  assert.equal(savedPairs.reachRemoved.solved, 0);
  assert.equal(savedPairs.worthRemoved.solved, 24);
  assert.equal(savedPairs.families, 60);
  assert.equal(savedPairs.distinctBoards, 131);
  assert.deepEqual(savedPairs.legacyPinScopeExceptions, [
    'shared-defender-2', 'shared-defender-9', 'shared-defender-29', 'shared-defender-30',
  ]);
});

test('generation is deterministic, keeps each pair in its family, and counts rejected attempts', () => {
  const options = { seed: 20261117, pairsPerType: 1, maxAttempts: 20000 };
  const first = generateFlipPairs(options);
  assert.deepEqual(generateFlipPairs(options), first);
  assert.deepEqual(first.pairs.map(pair => pair.type), PAIR_TYPES);
  for (const pair of first.pairs) assert.equal(pair.split, splitForFamily(pair.family));
  for (const counts of Object.values(first.counts)) {
    const rejects = Object.values(counts.rejections).reduce((sum, count) => sum + count, 0);
    assert.equal(counts.accepted, 1);
    assert.equal(counts.attempts, 1 + rejects);
  }
  const limited = generateFlipPairs({ ...options, maxAttempts: 1 });
  assert.ok(limited.pairs.length < 3);
  assert.ok(Object.values(limited.counts).every(counts => counts.attempts === 1));
});
