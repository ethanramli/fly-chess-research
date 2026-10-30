// Checked teacher continuation -> public neural frames. No parameter updates.
import { createHash } from 'node:crypto';
import { copyBoard, uci } from '../search-and-feedback/puzzle-search.mjs';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function verifiedLessonFrames(board, move, task, proof) {
  if (task?.objective !== 'capture-retention' || task.plies !== 1)
    throw Error('Only certified immediate capture retention is implemented');
  const checked = verifiedExperience(board, move, task, proof);
  if (!checked.learningAllowed) return { status: 'unknown', frames: [], evidence: null };
  const before = { fen: board.fen(), pgn: board.pgn() }, hypothetical = copyBoard(board);
  const frames = [];
  const frame = action => ({ schema: 'public-lesson-frame-v1', fen: hypothetical.fen(),
    pgn: hypothetical.pgn(), task: structuredClone(task), action });
  const apply = action => {
    const legal = hypothetical.moves({ verbose: true }).find(m => uci(m) === action);
    if (!legal) throw Error('Continuation is illegal');
    frames.push(frame(action)); hypothetical.move(legal);
  };
  apply(move);
  // A failure has one certified refutation. A success has one illustrative
  // legal reply: only the certificate, not this line, proves complete coverage.
  const replies = checked.status === 'failure' ? proof.certificate.recaptures : proof.certificate.replies;
  const reply = [...replies].sort()[0] ?? null;
  if (reply !== null) apply(reply);
  frames.push(frame(null));
  if (board.fen() !== before.fen || board.pgn() !== before.pgn) throw Error('Real task changed');
  return { status: checked.status, frames,
    evidence: { ...checked, context: { ...before, task: structuredClone(task) }, move,
      continuation: reply === null ? [move] : [move, reply],
      scope: 'One illustrative continuation; exhaustive immediate reply coverage belongs to the rechecked certificate' } };
}

// The encoder receives ONLY public frames, including a candidate-free endpoint.
// Certificate/status/scope stay outside the neural input. Feedback/plasticity
// and atomic receipt publication must be integrated separately before training.
export function presentVerifiedLesson({ board, move, task, proof, episode, encodeFrame, input }) {
  if (episode.active) throw Error('Cannot replace an active episode');
  const lesson = verifiedLessonFrames(board, move, task, proof);
  if (lesson.status === 'unknown') return { skipped: true, frames: [], evidence: null };
  if (lesson.frames.length > episode.maxFrames) throw Error('Lesson exceeds frame budget');
  // Check and encode the complete bounded continuation before any neural frame.
  const prepared = lesson.frames.map(frame => {
    const stimulation = encodeFrame(structuredClone(frame));
    if (!Array.isArray(stimulation) || stimulation.length < 1 || stimulation.length > 128
      || new Set(stimulation.map(c => c.index)).size !== stimulation.length
      || stimulation.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || c.index >= episode.model.n
        || !Number.isFinite(c.current) || c.current <= 0 || c.current > 1.5))
      throw Error('Invalid bounded frame stimulation');
    return { frame, frameIdentity: digest(frame), stimulation };
  });
  episode.begin();
  try {
    const receipts = prepared.map(({ frame, frameIdentity, stimulation }) => ({ frame, frameIdentity,
      prediction: [...episode.present(input, stimulation, frameIdentity)] }));
    return { skipped: false, frames: receipts, evidence: lesson.evidence,
      scope: 'Continuous neural exposure only; no consequence pulse or persistent learning' };
  } finally { episode.end(); }
}
