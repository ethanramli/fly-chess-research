import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate-v2.mjs';
import { certifyMate as certifyV1 } from '../../src/search-and-feedback/mate-certificate.mjs';

const white = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
const black = '8/8/8/8/8/6k1/5q2/7K b - - 0 1';
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'elapsedMs' || k === 'millisecondsPerStage' ? undefined : v)));

test('v2 construction agrees with v1 on v1 fixtures where v1 succeeds', () => {
  for (const [fen, plies] of [[white, 1], [black, 1], [new Chess().fen(), 1], [white, 0]]) {
    const board = new Chess(fen), attacker = board.turn();
    assert.deepEqual(strip(certifyMate(board, attacker, { plies })), strip(certifyV1(board, attacker, { plies })));
  }
  const repetition = new Chess();
  for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) repetition.move(san);
  assert.deepEqual(strip(certifyMate(repetition, 'w', { plies: 3 })), strip(certifyV1(repetition, 'w', { plies: 3 })));
});

test('repeated identical calls give identical results', () => {
  const board = new Chess(black);
  const first = strip(certifyMate(board, 'b', { plies: 1 }));
  for (let i = 0; i < 5; i++) assert.deepEqual(strip(certifyMate(board, 'b', { plies: 1 })), first);
  assert.equal(first.status, 'success');
});

test('tiny node budget is unknown and identical across repeated calls', () => {
  const board = new Chess(white);
  const runs = [1, 2, 3].map(() => strip(certifyMate(board, 'w', { plies: 1, maxNodes: 1 })));
  for (const r of runs) {
    assert.equal(r.status, 'unknown'); assert.equal(r.reward, null);
    assert.equal(r.bounds.constructionStop, 'nodes');
    assert.deepEqual(r, runs[0]);
  }
});

test('milliseconds option throws', () => {
  const board = new Chess(white);
  assert.throws(() => certifyMate(board, 'w', { plies: 1, milliseconds: 2000 }), /milliseconds budget removed/);
  assert.throws(() => certifyMate(board, 'w', { plies: 1, milliseconds: 0 }), /milliseconds budget removed/);
});

test('result does not change when the clock jumps forward', t => {
  const board = new Chess(white);
  const before = strip(certifyMate(board, 'w', { plies: 1 }));
  let now = 0;
  t.mock.method(performance, 'now', () => (now += 1e9));
  assert.deepEqual(strip(certifyMate(board, 'w', { plies: 1 })), before);
  // Sanity: the v1 constructor, given the same jumping clock, does change to unknown.
  assert.equal(certifyV1(board, 'w', { plies: 1 }).status, 'unknown');
});
