import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedLessonFrames, presentVerifiedLesson } from '../../src/puzzle-learning/verified-lesson-frames.mjs';
import { NeuralEpisode } from '../../src/neural-learning/neural-episode.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
const task = { objective: 'capture-retention', plies: 1 };
const board = () => new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
function episode() {
  const graph = { row: Int32Array.from([0,0]), col: new Int32Array(), sign: new Int8Array(),
    initial: new Float32Array(), input: Int32Array.from([0]), output: Int32Array.from([0]) };
  return new NeuralEpisode(new SparseTrainer(graph, { inputDim: 1, outputs: 1 }), { identity: 'a'.repeat(64) });
}
test('verified refutation and surviving line replay exact history without altering real task', () => {
  for (const move of ['e1e5', 'a1a4']) {
    const b = board(), original = b.pgn(), proof = certifyCaptureRetention(b, move);
    const lesson = verifiedLessonFrames(b, move, task, proof), replay = board();
    for (const f of lesson.frames) {
      assert.equal(f.fen, replay.fen()); assert.equal(f.pgn, replay.pgn());
      assert.deepEqual(Object.keys(f).sort(), ['action','fen','pgn','schema','task']);
      if (f.action) replay.move({ from: f.action.slice(0,2), to: f.action.slice(2,4) });
    }
    assert.equal(lesson.frames.at(-1).action, null); assert.equal(b.pgn(), original);
    if (move === 'e1e5') assert.deepEqual(lesson.evidence.continuation, ['e1e5','e8e5']);
  }
});
test('neural delivery excludes teacher labels; forged and unknown evidence produce no frames', () => {
  const b = board(), move = 'e1e5', proof = certifyCaptureRetention(b, move), e = episode(), seen = [];
  const options = { board: b, move, task, proof, episode: e, input: [0], encodeFrame: f => {
    seen.push(f); assert.equal(f.status, undefined); assert.equal(f.certificate, undefined);
    return [{ index: 0, current: 1 }];
  } };
  const result = presentVerifiedLesson(options);
  assert.equal(result.frames.length, 3); assert.equal(e.active, false);
  assert.equal(result.evidence.status, 'failure'); assert.equal(seen.length, 3);
  const before = e.snapshot();
  assert.throws(() => presentVerifiedLesson({ ...options, proof: { ...proof, status: 'success' } }));
  assert.deepEqual(e.snapshot(), before);
  assert.equal(presentVerifiedLesson({ ...options, proof: { status: 'unknown', certificate: null } }).skipped, true);
  assert.deepEqual(e.snapshot(), before); assert.equal(seen.length, 3);
  assert.throws(() => presentVerifiedLesson({ ...options, encodeFrame: () => [{ index: 999, current: 1 }] }), /stimulation/);
  assert.deepEqual(e.snapshot(), before);
});
