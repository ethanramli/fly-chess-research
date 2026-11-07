// Tests for the capture-choice position generator (pure functions only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { splitPgn, gameIdOf, labelMoves, qualifies, positionsFromGame } from '../../src/puzzle-learning/capture-choice-positions-v1.mjs';

// A real game from the training sample (GameId jBUsNlIE), copied unchanged.
const REAL_GAME = `[Event "rated rapid game"]
[Site "https://lichess.org/game/jBUsNlIE"]
[Date "2026.02.06"]
[Round "-"]
[White "QINTONGZI"]
[Black "tarakbluru"]
[Result "1-0"]
[GameId "jBUsNlIE"]
[UTCDate "2026.02.06"]
[UTCTime "07:52:28"]
[WhiteElo "1783"]
[BlackElo "1753"]
[WhiteRatingDiff "+16"]
[BlackRatingDiff "-5"]
[Variant "Standard"]
[TimeControl "600+5"]
[Termination "Normal"]

1. d4 d6 2. Bf4 Nf6 3. e3 Nbd7 4. Nf3 g6 5. Nbd2 Bg7 6. c3 c6 7. Bd3 O-O 8. e4 Re8 9. e5 dxe5 10. dxe5 Nh5 11. Bg3 e6 12. Bh4 Qb6 13. Nc4 Qc7 14. Qd2 f6 15. exf6 Nhxf6 16. O-O-O b5 17. Nce5 Nxe5 18. Nxe5 Qxe5 19. f4 Qd5 20. Bxf6 Bxf6 21. Qc2 Qxa2 22. Bxg6 hxg6 23. Qxg6+ Kf8 24. Qxf6+ Kg8 25. Rd3 Qa1+ 26. Kc2 Qa4+ 27. Kd2 1-0`;

// White knight e4 takes an undefended pawn on d6 (safe).
// White bishop c1 takes a pawn on h6 defended by the black knight on g8 (unsafe).
const TWO_CAPTURE_FEN = '4k1n1/8/3p3p/8/4N3/8/8/K1B5 w - - 0 1';

test('splitPgn returns one string per game and gameIdOf reads the header', () => {
  const games = splitPgn(`${REAL_GAME}\n\n${REAL_GAME.replace('[GameId "jBUsNlIE"]', '[GameId "ABCDEFGH"]')}\n`);
  assert.equal(games.length, 2);
  assert.equal(gameIdOf(games[0]), 'jBUsNlIE');
  assert.equal(gameIdOf(games[1]), 'ABCDEFGH');
  assert.throws(() => gameIdOf('[Event "x"]\n\n1. e4 e5'), /GameId/);
});

test('labelMoves marks safe, unsafe and quiet moves, and qualifies() sees both', () => {
  const moves = labelMoves(TWO_CAPTURE_FEN);
  const byUci = new Map(moves.map(m => [m.uci, m]));
  assert.equal(byUci.get('e4d6').outcome, 'safe');
  assert.equal(byUci.get('e4d6').capture, true);
  assert.equal(byUci.get('c1h6').outcome, 'unsafe');
  assert.equal(byUci.get('c1h6').capture, true);
  assert.equal(byUci.get('c1d2').outcome, 'quiet');
  assert.equal(byUci.get('c1d2').capture, false);
  assert.equal(qualifies(moves), true);
  // Sorted by UCI.
  const sorted = moves.map(m => m.uci).slice().sort();
  assert.deepEqual(moves.map(m => m.uci), sorted);
  // Every legal move is labelled once.
  assert.equal(moves.length, new Chess(TWO_CAPTURE_FEN).moves().length);
});

test('qualifies() is false when a side has only one kind of capture', () => {
  assert.equal(qualifies([{ uci: 'a', outcome: 'safe' }, { uci: 'b', outcome: 'quiet' }]), false);
  assert.equal(qualifies([{ uci: 'a', outcome: 'unsafe' }, { uci: 'b', outcome: 'unknown' }]), false);
});

test('positionsFromGame finds the qualifying plies of a real game', () => {
  const all = positionsFromGame(REAL_GAME);
  assert.deepEqual(all.map(p => p.ply), [39, 51]);
  assert.equal(all[0].gameId, 'jBUsNlIE');
  assert.equal(all[0].history.length, 39);
  assert.equal(new Chess(all[0].fen).fen(), all[0].fen);
  assert.ok(qualifies(all[0].moves));
});

test('positionsFromGame respects maxPerGame and minGap', () => {
  assert.deepEqual(positionsFromGame(REAL_GAME, { maxPerGame: 1 }).map(p => p.ply), [39]);
  // Plies 39 and 51 are only 12 apart, so a gap of 13 keeps just the first.
  assert.deepEqual(positionsFromGame(REAL_GAME, { minGap: 13 }).map(p => p.ply), [39]);
  assert.deepEqual(positionsFromGame(REAL_GAME, { minGap: 12 }).map(p => p.ply), [39, 51]);
  // Starting after the last qualifying ply finds nothing.
  assert.deepEqual(positionsFromGame(REAL_GAME, { minPly: 52 }), []);
});

test('positionsFromGame returns [] for a game with no qualifying position', () => {
  const quiet = `[Event "short"]\n[GameId "QUIET001"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 1-0`;
  assert.deepEqual(positionsFromGame(quiet, { minPly: 0 }), []);
});
