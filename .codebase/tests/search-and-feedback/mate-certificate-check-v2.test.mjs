import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { checkMateCertificate as checkV1 } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check-v2.mjs';

const white = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
const black = '8/8/8/8/8/6k1/5q2/7K b - - 0 1';
// Elapsed time is metadata; compare everything else.
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'elapsedMs' ? undefined : v)));

test('v2 checker agrees with v1 on v1 fixtures where v1 succeeds', () => {
  for (const [fen, plies] of [[white, 1], [black, 1], ['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 0]]) {
    const board = new Chess(fen), attacker = board.turn();
    const proof = certifyMate(board, attacker, { plies });
    const opts = { attacker, plies };
    assert.deepEqual(strip(checkMateCertificate(proof.certificate, board, opts)), strip(checkV1(proof.certificate, board, opts)));
    const tampered = structuredClone(proof.certificate); tampered.tree.children.pop();
    assert.deepEqual(strip(checkMateCertificate(tampered, board, opts)), strip(checkV1(tampered, board, opts)));
  }
});

test('repeated identical calls give identical results', () => {
  const board = new Chess(white), proof = certifyMate(board, 'w', { plies: 1 });
  const first = strip(checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1 }));
  for (let i = 0; i < 5; i++) assert.deepEqual(strip(checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1 })), first);
  assert.equal(first.verified, true);
});

test('tiny node budget is unknown and identical across repeated calls', () => {
  const board = new Chess(white), proof = certifyMate(board, 'w', { plies: 1 });
  const runs = [1, 2, 3].map(() => strip(checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1, maxNodes: 1 })));
  for (const r of runs) {
    assert.equal(r.verified, false); assert.equal(r.status, 'unknown');
    assert.match(r.reason, /Checker budget exhausted/);
    assert.deepEqual(r, runs[0]);
  }
});

test('milliseconds option throws', () => {
  const board = new Chess(white), proof = certifyMate(board, 'w', { plies: 1 });
  assert.throws(() => checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1, milliseconds: 2000 }), /milliseconds budget removed/);
  assert.throws(() => checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1, milliseconds: 0 }), /milliseconds budget removed/);
});

test('result does not change when the clock jumps forward', t => {
  const board = new Chess(white), proof = certifyMate(board, 'w', { plies: 1 });
  const before = strip(checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1 }));
  let now = 0;
  t.mock.method(performance, 'now', () => (now += 1e9));
  const after = strip(checkMateCertificate(proof.certificate, board, { attacker: 'w', plies: 1 }));
  assert.deepEqual(after, before);
  assert.equal(after.verified, true);
});
