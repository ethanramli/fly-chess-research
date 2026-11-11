import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Chess } from 'chess.js';
import { runStoreBaseline, uniformBaselines } from '../../src/neural-learning/fly-connections-baselines-v1.mjs';

// Synthetic eyes, not a chess-input model: stimulation derived from fen+uci by SHA-256. Every encode call is recorded.
const RETINA = Array.from({ length: 40 }, (_, i) => 7 * i + 3);
function syntheticEyes() {
  const calls = [];
  return {
    synthetic: true,
    calls,
    encode(fen, uci) {
      calls.push({ fen, uci });
      const h = createHash('sha256').update(`${fen}|${uci}`).digest();
      return { stimulation: RETINA.map((index, j) => ({ index, current: h[j % h.length] / 255 })) };
    },
  };
}

// Test-side UCI and board builder, real chess.js. Game: 1.e4 e5 2.Ke2 Bc5 3.Nf3 Bxf2.
const GAME = ['e2e4', 'e7e5', 'e1e2', 'f8c5', 'g1f3', 'c5f2'];
const uciText = m => m.from + m.to + (m.promotion ?? '');
function recordAt(ply, group, trueMoves = []) {
  const board = new Chess();
  for (const u of GAME.slice(0, ply)) board.move({ from: u.slice(0, 2), to: u.slice(2, 4) });
  const legal = board.moves({ verbose: true }).map(uciText).sort();
  return {
    schema: 'fly-connections-board-v1', boardId: `G1:${ply}`, gameId: 'G1', ply,
    fen: board.fen(), history: GAME.slice(0, ply), group, legal,
    outcomes: Object.fromEntries(legal.map(move => [move, trueMoves.includes(move)])),
  };
}

// Training boards: ply 0 and 2 (A), ply 4 and 6 (B). Four are needed so calibration has a key. ply 3 is held out (testA).
function boards(outcomes = {}) {
  return new Map([
    ['G1:0', recordAt(0, 'A', outcomes.p0)],
    ['G1:2', recordAt(2, 'A')],
    ['G1:4', recordAt(4, 'B')],
    ['G1:6', recordAt(6, 'B')],
    ['G1:3', recordAt(3, 'testA', outcomes.p3)],
  ]);
}
const TAPE_EVENTS = [
  ['G1:0', 'A', 'e2e4'],
  ['G1:0', 'A', 'd2d4'],
  ['G1:2', 'A', 'g1f3'],
  ['G1:4', 'B', 'g1f3'],
  ['G1:6', 'B', 'g2g3'],
];
const PULSES = [true, false, false, false, false];
const SHUFFLED = [false, true, false, false, false];
function tapeWith(pulses, shuffledPulses = SHUFFLED) {
  return {
    seed: 1,
    events: TAPE_EVENTS.map(([boardId, group, move], i) => ({ sequence: i, eventId: `e${i}`, phase: group, group, boardId, move, pulse: pulses[i] })),
    shuffledPulses,
    probeAfter: [],
  };
}
const KEYS = ['raw-pc', 'random-pc'];
const run = (over = {}) => runStoreBaseline({
  key: 'raw-pc', records: boards(), tape: tapeWith(PULSES), eyes: syntheticEyes(), retinaIdx: RETINA, evaluate: ['G1:0'], ...over,
});

test('(1) a cue taught pulse=1 is ranked top on its own board, for both keys', () => {
  for (const key of KEYS) {
    const out = run({ key, records: boards({ p0: ['e2e4'] }) });
    assert.equal(out.perBoard[0].c, 1, `${key}: only one move may tie for top`);
    assert.equal(out.perBoard[0].s, 1, `${key}: taught cue must be the top move`);
    assert.equal(out.perBoard[0].success, 1);
  }
});

test('(2) shuffled=true teaches from shuffledPulses, not event.pulse', () => {
  const records = boards({ p0: ['d2d4'] });
  const plain = run({ records });
  const shuf = run({ records, shuffled: true });
  assert.equal(plain.perBoard[0].success, 0, 'event.pulse teaches e2e4, so d2d4 must not be top');
  assert.equal(shuf.perBoard[0].success, 1, 'shuffledPulses teaches d2d4, so it must be top');
  assert.equal(shuf.shuffled, true);
});

test('(3) store values never come from outcomes: flipping training-board outcomes changes no score', () => {
  for (const key of KEYS) {
    const base = boards({ p0: ['e2e4'], p3: ['e8e7'] });
    const flipped = new Map([...base].map(([id, r]) => [id, r.group === 'testA' ? r : { ...r, outcomes: Object.fromEntries(Object.entries(r.outcomes).map(([m, v]) => [m, !v])) }]));
    assert.deepEqual(run({ key, records: flipped, evaluate: ['G1:3'] }).perBoard, run({ key, records: base, evaluate: ['G1:3'] }).perBoard);
  }
});

test('(4) every legal move is scored, quiet and king moves included', () => {
  const eyes = syntheticEyes();
  const records = boards();
  const out = run({ records, eyes, evaluate: ['G1:3'] });
  const { fen, legal } = records.get('G1:3');
  assert.ok(legal.includes('e8e7'), 'black king move is legal on this board');
  assert.ok(legal.includes('b8c6'), 'quiet knight move is legal on this board');
  const scored = new Set(eyes.calls.filter(c => c.fen === fen).map(c => c.uci));
  for (const move of legal) assert.ok(scored.has(move), `${move} was never scored`);
  assert.equal(out.perBoard[0].boardId, 'G1:3');
});

test('(5) uniformBaselines gives the hand-counted fractions and the fallback flag', () => {
  // Hand count after 1.e4 e5 2.Ke2 Bc5 3.Nf3 Bxf2 (white to move), 24 legal moves:
  // king 2 (Kxf2, Kd3), queen 1 (Qe1), Rh1 1 (Rg1), knights 8 (Nb1-a3, Nb1-c3, Nf3-e1, d4, xe5, g5, h4, g1), pawns 12.
  // Captures: Kxf2 (king) and Nxe5. Only Nxe5 succeeds.
  const capture = recordAt(6, 'B', ['f3e5']);
  assert.equal(capture.legal.length, 24);
  assert.deepEqual(uniformBaselines(capture), {
    boardId: 'G1:6',
    allLegal: { numerator: 1, denominator: 24, value: 1 / 24, fallback: false },
    allCaptures: { numerator: 1, denominator: 2, value: 1 / 2, fallback: false },
    nonKingCaptures: { numerator: 1, denominator: 1, value: 1, fallback: false },
  });
  // Start position: no captures, so both capture policies fall back to uniform all-legal and say so.
  const start = recordAt(0, 'A', ['g1f3']);
  assert.deepEqual(uniformBaselines(start), {
    boardId: 'G1:0',
    allLegal: { numerator: 1, denominator: 20, value: 1 / 20, fallback: false },
    allCaptures: { numerator: 1, denominator: 20, value: 1 / 20, fallback: true },
    nonKingCaptures: { numerator: 1, denominator: 20, value: 1 / 20, fallback: true },
  });
});

test('(6) invalid inputs throw', () => {
  assert.throws(() => run({ key: 'K1' }), /Unknown store key/);
  assert.throws(() => run({ shuffled: 'yes' }), /shuffled must be boolean/);
  assert.throws(() => run({ records: new Map([...boards()].filter(([id]) => id !== 'G1:2')) }), /No board record for G1:2/);
  assert.throws(() => run({ tape: tapeWith([1, false, false, false, false]) }), /pulse must be boolean/);
  assert.throws(() => run({ shuffled: true, tape: tapeWith(PULSES, [false, false, false, false, false]) }), /exact pulse count/);
  assert.throws(() => run({ evaluate: ['G1:9'] }), /No board record for G1:9/);
  assert.throws(() => run({ eyes: {} }), /encode/);
  const withR = boards();
  withR.set('G1:3', recordAt(3, 'R'));
  assert.throws(() => run({ records: withR, evaluate: ['G1:3'] }), /R board/);
  assert.throws(() => uniformBaselines(recordAt(3, 'R')), /R board/);
});
