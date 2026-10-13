import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

const open = '6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1';
const blocked = '6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1';
const bishopBlocked = '1b4k1/8/3P4/4p3/p6r/8/8/RK2R3 w - - 0 1';
const rookBlocked = '1b4k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1';

test('teacher certificate distinguishes an immediate recapture from the same ray blocked by a pawn', () => {
  for (const [fen, expected] of [[open, 'failure'], [blocked, 'success']]) {
    const board = new Chess(fen), before = board.pgn();
    const proof = certifyCaptureRetention(board, 'a1a4');
    assert.equal(proof.status, expected);
    assert.equal(board.pgn(), before);
    const checked = checkCaptureRetentionCertificate(board, 'a1a4', proof);
    assert.equal(checked.verified, true);
    assert.equal(checked.status, expected);
    assert.equal(checked.experimentalPulse, expected === 'failure');
    const event = verifiedExperience(board, 'a1a4', { objective: 'capture-retention', plies: 1 }, proof);
    assert.equal(event.status, expected);
    assert.equal(event.learningAllowed, true);
    assert.equal(board.pgn(), before);
  }
});

test('two-candidate fixtures reverse which rook capture survives when the blocker relation changes', () => {
  const cases = [
    [bishopBlocked, { 'a1a4': 'failure', 'e1e5': 'success' }],
    [rookBlocked, { 'a1a4': 'success', 'e1e5': 'failure' }],
  ];
  for (const [fen, expected] of cases) {
    const board = new Chess(fen);
    for (const [move, status] of Object.entries(expected)) {
      const proof = certifyCaptureRetention(board, move);
      assert.equal(proof.status, status);
      assert.equal(verifiedExperience(board, move, { objective: 'capture-retention', plies: 1 }, proof).status, status);
    }
  }
});

test('certificate checker rejects omitted, fabricated and modified reply evidence', () => {
  const board = new Chess(open), proof = certifyCaptureRetention(board, 'a1a4');
  for (const mutate of [
    value => { value.certificate.replies.pop(); },
    value => { value.certificate.recaptures = []; },
    value => { value.status = 'success'; },
    value => { value.certificateSha256 = '0'.repeat(64); },
  ]) {
    const forged = structuredClone(proof); mutate(forged);
    assert.throws(() => verifiedExperience(board, 'a1a4', { objective: 'capture-retention', plies: 1 }, forged));
  }
});

test('unknown capture consequence is not taught; non-captures and wrong horizons are rejected', () => {
  const board = new Chess(open), unknown = verifiedExperience(board, 'a1a4',
    { objective: 'capture-retention', plies: 1 }, { status: 'unknown', certificate: null, certificateSha256: null });
  assert.equal(unknown.learningAllowed, false);
  assert.equal(unknown.experimentalPulse, null);
  assert.throws(() => certifyCaptureRetention(board, 'a1a2'), /legal capture/);
  assert.throws(() => verifiedExperience(board, 'a1a4', { objective: 'capture-retention', plies: 3 },
    certifyCaptureRetention(board, 'a1a4')), /Invalid bounded consequence/);
});
