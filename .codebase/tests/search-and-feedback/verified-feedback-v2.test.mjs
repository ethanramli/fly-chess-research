import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { copyBoard } from '../../src/search-and-feedback/puzzle-search.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback-v2.mjs';
import { verifiedExperience as verifiedV1 } from '../../src/search-and-feedback/verified-feedback.mjs';

const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'elapsedMs' ? undefined : v)));
const fixtures = [['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 'f7a2', 'f7h7'], ['8/8/8/8/8/6k1/5q2/7K b - - 0 1', 'f2a7', 'f2h2']];

test('v2 feedback agrees with v1 on v1 forced-mate fixtures where v1 succeeds', () => {
  for (const [fen, bad, good] of fixtures) {
    const board = new Chess(fen), task = { objective: 'forced-mate', plies: 1 };
    for (const move of [bad, good]) {
      const b = copyBoard(board); b.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
      const proof = certifyMate(b, board.turn(), { plies: 0 });
      assert.deepEqual(strip(verifiedExperience(board, move, task, proof)), strip(verifiedV1(board, move, task, proof)));
    }
  }
});

test('repeated identical calls give identical results', () => {
  const [fen, bad] = fixtures[0], board = new Chess(fen), task = { objective: 'forced-mate', plies: 1 };
  const b = copyBoard(board); b.move({ from: 'f7', to: 'a2' });
  const proof = certifyMate(b, 'w', { plies: 0 });
  const first = strip(verifiedExperience(board, bad, task, proof));
  for (let i = 0; i < 5; i++) assert.deepEqual(strip(verifiedExperience(board, bad, task, proof)), first);
  assert.equal(first.learningAllowed, true);
});

test('tiny node budget in construction yields unknown with no teaching pulse, identically across calls', () => {
  const [fen, bad] = fixtures[0], board = new Chess(fen), task = { objective: 'forced-mate', plies: 1 };
  const proof = certifyMate(board, 'w', { plies: 1, maxNodes: 1 });
  assert.equal(proof.status, 'unknown');
  const runs = [1, 2].map(() => strip(verifiedExperience(board, bad, task, proof)));
  for (const r of runs) { assert.equal(r.status, 'unknown'); assert.equal(r.experimentalPulse, null); assert.equal(r.learningAllowed, false); assert.deepEqual(r, runs[0]); }
});

test('result does not change when the clock jumps forward', t => {
  const [fen, bad] = fixtures[0], board = new Chess(fen), task = { objective: 'forced-mate', plies: 1 };
  const b = copyBoard(board); b.move({ from: 'f7', to: 'a2' });
  const proof = certifyMate(b, 'w', { plies: 0 });
  const before = strip(verifiedExperience(board, bad, task, proof));
  let now = 0;
  t.mock.method(performance, 'now', () => (now += 1e9));
  assert.deepEqual(strip(verifiedExperience(board, bad, task, proof)), before);
});
