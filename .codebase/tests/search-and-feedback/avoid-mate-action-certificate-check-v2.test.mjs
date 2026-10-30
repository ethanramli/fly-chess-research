import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyAvoidMateAction } from '../../src/search-and-feedback/avoid-mate-action-domain.mjs';
import { checkAvoidMateActionCertificate as checkV1 } from '../../src/search-and-feedback/avoid-mate-action-certificate-check.mjs';
import { checkAvoidMateActionCertificate } from '../../src/search-and-feedback/avoid-mate-action-certificate-check-v2.mjs';
import { certifyAvoidMateAction as certifyV2 } from '../../src/search-and-feedback/avoid-mate-action-domain-v2.mjs';

const fixtures = ['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', '8/8/8/8/8/6k1/5q2/7K b - - 0 1'];
const uci = m => m.from + m.to + (m.promotion ?? '');
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'elapsedMs' ? undefined : v)));

test('v2 checker agrees with v1 checker on v1-produced avoid-mate proofs', () => {
  const task = { objective: 'avoid-mate', plies: 3 };
  for (const fen of fixtures) {
    const board = new Chess(fen);
    for (const m of board.moves({ verbose: true })) {
      const move = uci(m), proof = certifyAvoidMateAction(board, move).proof;
      assert.deepEqual(strip(checkAvoidMateActionCertificate(board, move, task, proof)),
        strip(checkV1(board, move, task, proof)));
    }
  }
});

test('repeated identical calls give identical results', () => {
  const board = new Chess(fixtures[0]), move = uci(board.moves({ verbose: true })[0]);
  const task = { objective: 'avoid-mate', plies: 3 }, proof = certifyAvoidMateAction(board, move).proof;
  const first = strip(checkAvoidMateActionCertificate(board, move, task, proof));
  for (let i = 0; i < 5; i++) assert.deepEqual(strip(checkAvoidMateActionCertificate(board, move, task, proof)), first);
});

const minimalBudget = (board, move) => { let k = 1; while (certifyV2(board, move, { maxNodes: k }).status === 'unknown') k++; return k; };

test('tiny node budget yields unknown identically across calls', () => {
  const board = new Chess(fixtures[0]), task = { objective: 'avoid-mate', plies: 3 };
  // Pick a legal action whose opponent-mate proof needs more than one node.
  const move = board.moves({ verbose: true }).map(uci).find(m => minimalBudget(board, m) > 1);
  assert.ok(move, 'fixture must contain an action needing more than one node');
  const proof = certifyAvoidMateAction(board, move).proof;
  // Smallest budget that verifies; one node fewer must be unknown, identically across calls.
  let minimal = 1;
  while (!checkAvoidMateActionCertificate(board, move, task, proof, { maxNodes: minimal }).verified) minimal++;
  assert.ok(minimal > 1, 'fixture must need more than one node');
  const runs = [1, 2].map(() => strip(checkAvoidMateActionCertificate(board, move, task, proof, { maxNodes: minimal - 1 })));
  for (const r of runs) { assert.equal(r.verified, false); assert.equal(r.status, 'unknown'); assert.deepEqual(r, runs[0]); }
});

test('milliseconds option throws', () => {
  const board = new Chess(fixtures[0]), move = uci(board.moves({ verbose: true })[0]);
  const task = { objective: 'avoid-mate', plies: 3 }, proof = certifyAvoidMateAction(board, move).proof;
  assert.throws(() => checkAvoidMateActionCertificate(board, move, task, proof, { milliseconds: 2000 }), /milliseconds budget removed/);
});

test('result does not change when the clock jumps forward', t => {
  const board = new Chess(fixtures[1]), move = uci(board.moves({ verbose: true })[0]);
  const task = { objective: 'avoid-mate', plies: 3 }, proof = certifyAvoidMateAction(board, move).proof;
  const before = strip(checkAvoidMateActionCertificate(board, move, task, proof));
  let now = 0;
  t.mock.method(performance, 'now', () => (now += 1e9));
  assert.deepEqual(strip(checkAvoidMateActionCertificate(board, move, task, proof)), before);
});
