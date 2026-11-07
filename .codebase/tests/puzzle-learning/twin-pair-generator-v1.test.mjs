import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  oldSplit, restartSplit, eligibleRestartGame, replayGame, applyEdit, makeTwinPair, trainingFilter,
} from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { Chess } from 'chess.js';
import { certifyLandingSquare } from '../../src/search-and-feedback/landing-square-certificate.mjs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ids = n => Array.from({ length: n }, (_, i) => `game-${i}`);

test('splits match the old formula and restart buckets', () => {
  for (const id of ids(20)) {
    const v = createHash('sha256').update(`lichess-game-split-v1:${id}`).digest().readUInt32BE(0) / 2 ** 32;
    assert.equal(oldSplit(id), v < 0.8 ? 'train' : v < 0.9 ? 'validation' : 'final');
  }
  const buckets = new Set(['train', 'development', 'locked-a', 'locked-b', 'locked-c1', 'locked-c2']);
  const sample = ids(2000).map(restartSplit);
  assert.ok(sample.every(b => buckets.has(b)));
  const trainShare = sample.filter(b => b === 'train').length / sample.length;
  assert.ok(trainShare > 0.65 && trainShare < 0.75, `train share ${trainShare}`);
});

test('eligibleRestartGame excludes non-train and already-used train games', () => {
  const nonTrain = ids(2000).find(id => oldSplit(id) !== 'train');
  const train = ids(2000).find(id => oldSplit(id) === 'train');
  assert.equal(eligibleRestartGame(nonTrain, new Set()), false);
  assert.equal(eligibleRestartGame(train, new Set([train])), false);
  assert.equal(eligibleRestartGame(train, new Set()), true);
});

test('replayGame returns per-move positions and rejects non-standard starts', () => {
  const entries = replayGame('1. e4 d5 2. exd5 Qxd5 *');
  assert.deepEqual(entries.map(e => e.uci), ['e2e4', 'd7d5', 'e4d5', 'd8d5']);
  assert.equal(entries[0].fen, START);
  assert.deepEqual(entries.map(e => e.ply), [0, 1, 2, 3]);
  const setup = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. Kd2 *';
  assert.throws(() => replayGame(setup), /Standard start required/);
});

const PIN = { fen: '4k3/4b3/8/8/1B6/8/8/4RK2 w - - 0 1', move: 'b4d6' };
const PIN_EDIT = { kind: 'pin', square: 'e2', piece: { type: 'p', color: 'w' } };

test('pin pair: good is the original, bad has the blocking pawn', () => {
  const pair = makeTwinPair({ ...PIN, edit: PIN_EDIT, task: 'landing' });
  assert.equal(pair.accepted, true);
  assert.equal(pair.kind, 'pin');
  assert.equal(pair.good.fen, PIN.fen);
  assert.equal(pair.bad.fen, applyEdit(PIN.fen, PIN_EDIT));
  assert.equal(new Chess(pair.bad.fen).get('e2').type, 'p');
});

const RECAP = { fen: '4k3/8/8/3p4/8/4N3/8/4K3 w - - 0 1', move: 'e3d5' };

test('recapture pair: good is the original', () => {
  const pair = makeTwinPair({ ...RECAP, edit: { kind: 'recapture', square: 'c6', piece: { type: 'p', color: 'b' } }, task: 'combined' });
  assert.equal(pair.accepted, true);
  assert.equal(pair.good.fen, RECAP.fen);
});

const VALUE = { fen: '4k3/8/2p5/3p4/8/4N3/8/4K3 w - - 0 1', move: 'e3d5' };
const VALUE_EDIT = { kind: 'value', square: 'd5', piece: { type: 'r', color: 'b' } };

test('value pair: good is the twin with the rook, bad is the original', () => {
  const pair = makeTwinPair({ ...VALUE, edit: VALUE_EDIT, task: 'combined' });
  assert.equal(pair.accepted, true);
  assert.equal(pair.good.fen, applyEdit(VALUE.fen, VALUE_EDIT));
  assert.equal(pair.bad.fen, VALUE.fen);
});

test('rejections carry the stated reason', () => {
  assert.deepEqual(
    makeTwinPair({ ...PIN, edit: { ...PIN_EDIT, kind: 'value' }, task: 'landing' }),
    { accepted: false, reason: 'edit changes more than one idea' },
  );
  assert.deepEqual(
    makeTwinPair({ ...PIN, edit: { kind: 'pin', square: 'a2', piece: { type: 'p', color: 'w' } }, task: 'landing' }),
    { accepted: false, reason: 'same answer' },
  );
  const fakeEyes = { encode: () => ({ stimulation: [{ index: 1, current: 1 }] }) };
  assert.deepEqual(
    makeTwinPair({ ...PIN, edit: PIN_EDIT, task: 'landing', eyes: fakeEyes }),
    { accepted: false, reason: 'input collision' },
  );
  assert.deepEqual(
    makeTwinPair({ ...PIN, edit: { kind: 'pin', square: 'e8', piece: null }, task: 'landing' }),
    { accepted: false, reason: 'invalid edit' },
  );
});

test('trainingFilter applies the protocol rules to the pin-pair original', () => {
  const { certificate } = certifyLandingSquare(new Chess(PIN.fen), PIN.move);
  assert.equal(certificate.capture, false);
  assert.equal(certificate.pinnedAttackers.length, 1);
  assert.equal(trainingFilter('phase-b', certificate), false);
  assert.equal(trainingFilter('idea-2', certificate), true);
  assert.throws(() => trainingFilter('idea-9', certificate), /Unknown training set/);
});

test('capture task rejects a quiet move and unknown tasks throw', () => {
  const pin = { fen: '4k3/4b3/8/8/1B6/8/8/4RK2 w - - 0 1', move: 'b4d6', edit: { kind: 'pin', square: 'e2', piece: { type: 'p', color: 'w' } } };
  assert.deepEqual(makeTwinPair({ ...pin, task: 'capture' }), { accepted: false, reason: 'not a capture' });
  assert.throws(() => makeTwinPair({ ...pin, task: 'nonsense' }), /Unknown task/);
});
