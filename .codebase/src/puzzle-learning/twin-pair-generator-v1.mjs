// Builds twin pairs (one board where a move is good, one where the same move is bad) for the eye test and Phases A-C.
// Every pair is certified by the teacher's checkers and must give different eye input.
// It reads no data by itself and never touches sealed sets.
import { createHash } from 'node:crypto';
import { Chess, validateFen } from 'chess.js';
import { certifyLandingSquare, combinedAnswer } from '../search-and-feedback/landing-square-certificate.mjs';
import { certifyCaptureRetention } from '../search-and-feedback/capture-retention-certificate.mjs';
import { inputCollisions } from '../chess-input/eyes-v2.mjs';

const bucket = (salt, gameId) => createHash('sha256').update(`${salt}:${gameId}`).digest().readUInt32BE(0) / 0x100000000;
const ANSWER = Object.freeze({ success: 'good', failure: 'bad' });
const uciOf = move => move.from + move.to + (move.promotion ?? '');

export function oldSplit(gameId) {
  const v = bucket('lichess-game-split-v1', gameId);
  return v < 0.8 ? 'train' : v < 0.9 ? 'validation' : 'final';
}

export function restartSplit(gameId) {
  const v = bucket('fly-restart-split-v1', gameId);
  return v < 0.70 ? 'train' : v < 0.80 ? 'development' : v < 0.85 ? 'locked-a'
    : v < 0.90 ? 'locked-b' : v < 0.95 ? 'locked-c1' : 'locked-c2';
}

// Old validation and final games are excluded by the hash alone, so no sealed file needs to be opened.
export function eligibleRestartGame(gameId, oldTrainIds) {
  return oldSplit(gameId) === 'train' && !oldTrainIds.has(gameId);
}

export function replayGame(pgn) {
  const game = new Chess();
  game.loadPgn(pgn);
  const headers = game.getHeaders();
  if ('SetUp' in headers || 'FEN' in headers) throw Error('Standard start required');
  const replay = new Chess();
  return game.history({ verbose: true }).map((move, ply) => {
    const entry = { ply, fen: replay.fen(), uci: uciOf(move) };
    replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    return entry;
  });
}

export function applyEdit(fen, edit) {
  try {
    const board = new Chess(fen);
    if (edit.piece === null) board.remove(edit.square);
    else if (!board.put(edit.piece, edit.square)) throw Error('put failed');
    const next = board.fen();
    if (!validateFen(next).ok) throw Error('invalid');
    return next;
  } catch {
    throw Error('Edit gives an invalid board');
  }
}

// Returns { reason } when the board cannot be used, otherwise the landing result and task answer.
function evaluate(fen, move, task) {
  const legal = new Chess(fen).moves({ verbose: true }).some(m => uciOf(m) === move);
  if (!legal) return { reason: 'move illegal on a board' };
  let landing;
  try {
    landing = certifyLandingSquare(new Chess(fen), move);
  } catch (error) {
    if (/King moves/.test(error.message)) return { reason: 'king move' };
    throw error;
  }
  if (landing.status === 'unknown') return { reason: 'unknown' };
  if (task === 'combined') return { landing, answer: combinedAnswer(landing.certificate) };
  if (task === 'landing') return { landing, answer: ANSWER[landing.status] };
  if (!landing.certificate.capture) return { reason: 'not a capture' };
  const retention = certifyCaptureRetention(new Chess(fen), move);
  if (retention.status === 'unknown') return { reason: 'unknown' };
  return { landing, answer: ANSWER[retention.status] };
}

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

function singleIdea(kind, a, b) {
  if (kind === 'pin') return same(a.attackers, b.attackers) && !same(a.pinnedAttackers, b.pinnedAttackers);
  if (kind === 'recapture') return !same(a.attackers, b.attackers) && same(a.pinnedAttackers, b.pinnedAttackers)
    && a.moverValue === b.moverValue && a.capturedValue === b.capturedValue;
  if (kind === 'value') return same(a.attackers, b.attackers) && same(a.pinnedAttackers, b.pinnedAttackers)
    && a.capture && b.capture && a.capturedValue !== b.capturedValue;
  return false;
}

export function makeTwinPair({ fen, move, edit, task, eyes }) {
  if (!['capture', 'landing', 'combined'].includes(task)) throw Error(`Unknown task: ${task}`);
  const reject = reason => ({ accepted: false, reason });
  let twin;
  try {
    twin = applyEdit(fen, edit);
  } catch {
    return reject('invalid edit');
  }
  const a = evaluate(fen, move, task);
  if (a.reason) return reject(a.reason);
  const b = evaluate(twin, move, task);
  if (b.reason) return reject(b.reason);
  if (a.answer === b.answer) return reject('same answer');
  if (!singleIdea(edit.kind, a.landing.certificate, b.landing.certificate)) return reject('edit changes more than one idea');
  if (eyes && inputCollisions(eyes, [{ fen, action: move, answer: a.answer }, { fen: twin, action: move, answer: b.answer }]).length)
    return reject('input collision');
  const [good, bad] = a.answer === 'good' ? [{ fen, r: a }, { fen: twin, r: b }] : [{ fen: twin, r: b }, { fen, r: a }];
  return {
    accepted: true,
    kind: edit.kind,
    move,
    good: { fen: good.fen, certificateSha256: good.r.landing.certificateSha256 },
    bad: { fen: bad.fen, certificateSha256: bad.r.landing.certificateSha256 },
  };
}

const FILTERS = Object.freeze({
  'phase-b': c => !c.capture && c.pinnedAttackers.length === 0,
  'idea-1': c => c.capture && c.pinnedAttackers.length === 0 && c.capturedValue < c.moverValue,
  'idea-2': c => !c.capture,
  'idea-3': c => c.capture && c.pinnedAttackers.length === 0 && c.recaptures.length > 0,
});

export function trainingFilter(set, certificate) {
  if (!Object.hasOwn(FILTERS, set)) throw Error(`Unknown training set: ${set}`);
  return FILTERS[set](certificate);
}
