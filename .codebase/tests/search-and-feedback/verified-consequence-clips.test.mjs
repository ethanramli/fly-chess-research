import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { verifiedConsequenceClips } from '../../src/search-and-feedback/verified-consequence-clips.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

function fixture() {
  const board = new Chess('4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1');
  const successor = new Chess(board.fen()); successor.move({ from: 'f1', to: 'f8' });
  return { board, task: { objective: 'forced-mate', plies: 3 },
    proof: certifyMate(successor, 'w', { plies: 2, maxNodes: 4096, milliseconds: 2000 }) };
}

test('consequence clips independently bind earlier concession and later payoff to separate actor contexts', () => {
  const { board, task, proof } = fixture(), original = board.pgn();
  const lesson = verifiedConsequenceClips(board, 'f1f8', task, proof);
  assert.deepEqual(lesson.clips.map(c => c.move), ['f1f8', 'h5h7']);
  assert.deepEqual(lesson.clips.map(c => c.context.task.plies), [3, 1]);
  assert.deepEqual(lesson.clips[1].provenance.precedingMoves, ['f1f8', 'e8f8']);
  for (const clip of lesson.clips) {
    const context = new Chess(); context.loadPgn(clip.context.pgn);
    assert.equal(context.fen(), clip.context.fen); assert.equal(context.turn(), 'w');
    assert.equal(verifiedExperience(context, clip.move, clip.context.task, clip.proof).status, 'success');
  }
  assert.equal(lesson.clips[0].explanation.mateDespiteMaterialConcession, true);
  assert.equal(lesson.clips[1].explanation.sequence[0].captured, 'r');
  assert.equal(board.pgn(), original);
  const capped = verifiedConsequenceClips(board, 'f1f8', task, proof, { maxClips: 1 });
  assert.equal(capped.clips.length, 1);
  assert.throws(() => verifiedConsequenceClips(board, 'f1f8', task, proof, { maxCertificateNodes: 1 }));
});

test('unknown supplies no clips and a changed support position cannot reuse a successful certificate', () => {
  const { board, task, proof } = fixture();
  assert.deepEqual(verifiedConsequenceClips(board, 'f1f8', task, { status: 'unknown' }).clips, []);
  const changed = new Chess('4r2k/6pr/8/7Q/6K1/8/8/5R2 w - - 0 1');
  assert.throws(() => verifiedConsequenceClips(changed, 'f1f8', task, proof));
  const successor = new Chess(changed.fen()); successor.move({ from: 'f1', to: 'f8' });
  const failed = certifyMate(successor, 'w', { plies: 2, maxNodes: 4096, milliseconds: 2000 });
  const lesson = verifiedConsequenceClips(changed, 'f1f8', task, failed);
  assert.equal(lesson.status, 'failure');
  assert.ok(lesson.clips.every(c => c.status === 'failure'));
});
