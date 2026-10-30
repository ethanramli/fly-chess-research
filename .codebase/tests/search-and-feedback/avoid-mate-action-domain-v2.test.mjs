import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyAvoidMateAction } from '../../src/search-and-feedback/avoid-mate-action-domain-v2.mjs';
import { certifyAvoidMateAction as certifyV1 } from '../../src/search-and-feedback/avoid-mate-action-domain.mjs';

const fixtures = ['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', '8/8/8/8/8/6k1/5q2/7K b - - 0 1'];
const uci = m => m.from + m.to + (m.promotion ?? '');
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'elapsedMs' ? undefined : v)));

test('v2 agrees with v1 for every legal action on v1 fixtures where v1 succeeds', () => {
  for (const fen of fixtures) {
    const board = new Chess(fen), history = board.pgn();
    for (const m of board.moves({ verbose: true })) {
      const move = uci(m);
      assert.deepEqual(strip(certifyAvoidMateAction(board, move)), strip(certifyV1(board, move)));
    }
    assert.equal(board.pgn(), history);
  }
});

test('repeated identical calls give identical results', () => {
  const board = new Chess(fixtures[0]), move = uci(board.moves({ verbose: true })[0]);
  const first = strip(certifyAvoidMateAction(board, move));
  for (let i = 0; i < 5; i++) assert.deepEqual(strip(certifyAvoidMateAction(board, move)), first);
});

const minimalBudget = (board, move) => { let k = 1; while (certifyAvoidMateAction(board, move, { maxNodes: k }).status === 'unknown') k++; return k; };
test('tiny node budget yields unknown with no teaching event, identically across calls', () => {
  const board = new Chess(fixtures[0]);
  // Pick a legal action whose opponent-mate proof needs more than one node.
  const move = board.moves({ verbose: true }).map(uci).find(m => minimalBudget(board, m) > 1);
  assert.ok(move, 'fixture must contain an action needing more than one node');
  // Smallest budget that yields a verified label; one node fewer must be unknown.
  const minimal = minimalBudget(board, move);
  assert.ok(minimal > 1, 'fixture must need more than one node');
  const runs = [1, 2].map(() => strip(certifyAvoidMateAction(board, move, { maxNodes: minimal - 1 })));
  for (const r of runs) { assert.equal(r.status, 'unknown'); assert.equal(r.learningAllowed, false); assert.deepEqual(r, runs[0]); }
});

test('milliseconds option throws', () => {
  const board = new Chess(fixtures[0]), move = uci(board.moves({ verbose: true })[0]);
  assert.throws(() => certifyAvoidMateAction(board, move, { milliseconds: 2000 }), /milliseconds budget removed/);
});

test('result does not change when the clock jumps forward', t => {
  const board = new Chess(fixtures[1]), move = uci(board.moves({ verbose: true })[0]);
  const before = strip(certifyAvoidMateAction(board, move));
  let now = 0;
  t.mock.method(performance, 'now', () => (now += 1e9));
  assert.deepEqual(strip(certifyAvoidMateAction(board, move)), before);
});
