import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { copyBoard, verifyMate } from '../../src/search-and-feedback/puzzle-search.mjs';

const white = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
const black = '8/8/8/8/8/6k1/5q2/7K b - - 0 1';
const check = (cert, board, plies, opts = {}) => checkMateCertificate(cert, board, { attacker: board.turn(), plies, ...opts });

test('certificates agree with existing exhaustive verifier for both actors and legal successor consequences', () => {
  for (const fen of [white, black]) {
    const board = new Chess(fen), attacker = board.turn(), history = board.pgn();
    const proof = certifyMate(board, attacker, { plies: 1 });
    assert.equal(proof.status, 'success');
    assert.equal(check(proof.certificate, board, 1).verified, true);
    for (const move of board.moves({ verbose: true })) {
      const successor = copyBoard(board); successor.move(move);
      const actual = certifyMate(successor, attacker, { plies: 0 });
      const expected = verifyMate(successor, attacker, { plies: 0, maxNodes: 4096 });
      assert.equal(actual.status, expected.status);
      assert.equal(actual.certificateCheck.verified, true);
    }
    assert.equal(board.pgn(), history);
  }
});

test('independent checker rejects changed leaves, illegal moves, missing and duplicate universal branches', () => {
  const board = new Chess(), proof = certifyMate(board, 'w', { plies: 1 });
  assert.equal(proof.status, 'failure');
  assert.equal(proof.certificate.tree.children.length, 20);
  for (const mutate of [
    c => c.tree.children.pop(),
    c => { c.tree.children[1] = structuredClone(c.tree.children[0]); },
    c => { c.tree.children[0].move = 'a1a8'; },
    c => { c.tree.children[0].node.status = 'success'; },
    c => { c.tree.children[0].node.children.push({ move: 'a7a6', node: { status: 'failure', children: [] } }); },
  ]) {
    const tampered = structuredClone(proof.certificate); mutate(tampered);
    const result = check(tampered, board, 1);
    assert.equal(result.verified, false); assert.equal(result.status, 'unknown');
  }
  // Defender success must cover every reply, even if the alleged leaf is convincing.
  const defender = new Chess(); defender.move('e4');
  assert.ok(defender.moves().length > 1);
  const omitted = { schema: 'bounded-mate-certificate-v1', rootFen: defender.fen(), rootPgn: defender.pgn(), attacker: 'w', plies: 2,
    tree: { status: 'success', children: [{ move: 'a7a6', node: { status: 'success', children: [] } }] } };
  const rejected = checkMateCertificate(omitted, defender, { attacker: 'w', plies: 2 });
  assert.equal(rejected.verified, false); assert.match(rejected.reason, /alternatives/);
});

test('proofs bind actor, horizon and complete repetition history and do not mutate the task', () => {
  const board = new Chess();
  for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) board.move(san);
  assert.equal(board.isThreefoldRepetition(), true);
  const history = board.pgn(), proof = certifyMate(board, 'w', { plies: 3 });
  assert.equal(proof.status, 'failure'); assert.equal(proof.certificate.tree.children.length, 0);
  assert.equal(check(proof.certificate, board, 3).verified, true);
  const sameFen = new Chess(board.fen());
  assert.equal(check(proof.certificate, sameFen, 3).verified, false);
  assert.equal(check(proof.certificate, board, 1).verified, false);
  assert.equal(checkMateCertificate(proof.certificate, board, { attacker: 'b', plies: 3 }).verified, false);
  assert.equal(board.pgn(), history);
});

test('construction or checking exhaustion remains unknown without reward', () => {
  const board = new Chess(white);
  for (const budget of [{ maxNodes: 1 }, { milliseconds: 0 }]) {
    const result = certifyMate(board, 'w', { plies: 1, ...budget });
    assert.equal(result.status, 'unknown'); assert.equal(result.reward, null);
  }
  const proof = certifyMate(board, 'w', { plies: 1 });
  for (const budget of [{ maxNodes: 1 }, { milliseconds: 0 }]) {
    const result = check(proof.certificate, board, 1, budget);
    assert.equal(result.verified, false); assert.equal(result.status, 'unknown');
  }
});
