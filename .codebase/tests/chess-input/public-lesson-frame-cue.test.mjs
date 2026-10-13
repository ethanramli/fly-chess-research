import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createPublicLessonFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { verifiedLessonFrames } from '../../src/puzzle-learning/verified-lesson-frames.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
const mapping = { readyForCandidateExperiment: true, groups: [{ kc: Array.from({ length: 128 }, (_,i) => i) }] };
const task = { objective: 'capture-retention', plies: 1 };
const frame = board => ({ schema: 'public-lesson-frame-v1', fen: board.fen(), pgn: board.pgn(), task, action: null });
test('terminal endpoint encodes without a dummy action; teacher labels and mismatched history rejected', () => {
  const encoder = createPublicLessonFrameEncoder(mapping), board = new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  assert.equal(board.isCheckmate(), true);
  const f = frame(board), cue = encoder.encode(f);
  assert.ok(cue.tokens.includes('action:none')); assert.deepEqual(encoder.encode(f), cue);
  assert.throws(() => encoder.encode({ ...f, status: 'success' }), /teacher labels/);
  assert.throws(() => encoder.encode({ ...f, fen: new Chess().fen() }), /mismatch/);
  assert.throws(() => encoder.encode({ ...f, action: 'h8h7' }), /Illegal/);
  assert.ok(cue.stimulation.length <= 64); assert.ok(cue.stimulation.every(c => c.current <= 1.5));
});
test('actual checked failure and survival endpoints differ at both feature and projected-cue levels', () => {
  const board = new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const encoder = createPublicLessonFrameEncoder(mapping);
  const cues = ['e1e5','a1a4'].map(move => {
    const lesson = verifiedLessonFrames(board,move,task,certifyCaptureRetention(board,move));
    return lesson.frames.map(f => encoder.encode(f));
  });
  assert.notDeepEqual(cues[0].at(-1).tokens, cues[1].at(-1).tokens);
  assert.notDeepEqual(cues[0].at(-1).stimulation, cues[1].at(-1).stimulation);
  for (const sequence of cues) for (const cue of sequence)
    assert.ok(cue.tokens.every(t => !t.startsWith('status:') && !t.startsWith('certificate:')));
});
