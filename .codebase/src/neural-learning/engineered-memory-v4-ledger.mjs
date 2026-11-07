// Engineered memory v4 ledger: pure functions over replayed boards and capture-retention certificates.
// No brain, retina or graph access. Schedules are built before any outcome is read.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { mulberry32 } from './memory-assay-fixture.mjs';
import {
  certifyCaptureRetentionAction, checkCaptureRetentionAction,
} from '../search-and-feedback/capture-retention-action-domain.mjs';

export const TASK = { objective: 'capture-retention', plies: 1 };
export const MAX_REPLIES = 256;
const VALUE = { safe: 1, unsafe: -1, quiet: -1, unknown: null };

const sha256hex = text => createHash('sha256').update(text, 'utf8').digest('hex');
const uciOf = move => move.from + move.to + (move.promotion ?? '');
const byUci = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const count = (xs, v) => xs.filter(x => x === v).length;

export function positionId(p) {
  return `${p.gameId}:${p.ply}`;
}

// Replays the history from the start position. Legal moves come from the replayed board, sorted by UCI.
export function replayPosition(p) {
  const board = new Chess();
  for (const u of p.history) {
    board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4) || undefined });
  }
  if (board.fen() !== p.fen) throw Error(`History replay does not reach the recorded FEN at ${positionId(p)}`);
  const legal = board.moves({ verbose: true }).map(uciOf).sort(byUci);
  return { board, legal };
}

// Forward partial Fisher-Yates: returns the first m elements of a shuffled copy of list.
export function partialFisherYates(list, m, rng) {
  const a = [...list], n = a.length;
  if (!Number.isInteger(m) || m < 0 || m > n) throw Error(`Invalid sample size ${m} for ${n} items`);
  for (let i = 0; i < m; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, m);
}

// Up to four legal moves per position, fixed by seed and position id only.
export function scheduleFor(seed, id, legal) {
  const rng = mulberry32((seed ^ parseInt(sha256hex(id).slice(0, 8), 16)) >>> 0);
  return partialFisherYates(legal, Math.min(4, legal.length), rng);
}

// Practice positions must already be in practice order. Reads only gameId, ply, fen and history.
export function buildSchedules(seeds, practice) {
  const legals = practice.map(p => ({ id: positionId(p), legal: replayPosition(p).legal }));
  const schedules = {};
  for (const seed of seeds) {
    schedules[seed] = legals.map(({ id, legal }) => ({ id, moves: scheduleFor(seed, id, legal) }));
  }
  return { schedules, sha256: sha256hex(JSON.stringify(schedules)) };
}

// Certifies one legal move on a replayed board. The board is unchanged on return.
export function certifyMove(board, uci) {
  const before = board.fen();
  const move = board.moves({ verbose: true }).find(m => uciOf(m) === uci);
  if (!move) throw Error(`Move is not legal in this position: ${uci}`);
  let result;
  if (move.piece === 'k' && move.captured) {
    // King captures are outside the checker's scope.
    result = { uci, category: 'unknown', value: null, status: 'scope-unknown', proof: null, certificateSha256: null };
  } else {
    const options = { maxReplies: MAX_REPLIES };
    const proof = certifyCaptureRetentionAction(board, uci, TASK, options);
    const check = checkCaptureRetentionAction(board, uci, TASK, proof, options);
    if ((proof.status === 'success' || proof.status === 'failure')
      && (check.verified !== true || check.status !== proof.status)) {
      throw Error(`Independent check disagrees with the certificate for ${uci}`);
    }
    const category = proof.status === 'success' ? 'safe'
      : proof.status === 'failure' ? (move.captured ? 'unsafe' : 'quiet') : 'unknown';
    result = { uci, category, value: VALUE[category], status: proof.status, proof,
      certificateSha256: proof.certificateSha256 ?? null };
  }
  if (board.fen() !== before) throw Error(`certifyMove changed the board at ${uci}`);
  return result;
}

// Map id -> Map uci -> certifyMove result. Stops on any mismatch with the positions file.
export function certifyPositions(positions) {
  const out = new Map();
  for (const p of positions) {
    const id = positionId(p);
    const { board, legal } = replayPosition(p);
    const fileUcis = p.moves.map(m => m.uci).sort(byUci);
    if (fileUcis.length !== legal.length || fileUcis.some((u, i) => u !== legal[i])) {
      throw Error(`Legal move set differs from positions file at ${id}`);
    }
    const perMove = new Map();
    for (const { uci, outcome } of p.moves) {
      const cert = certifyMove(board, uci);
      if (cert.category !== outcome) throw Error(`Checked category differs from positions file at ${id} ${uci}`);
      perMove.set(uci, cert);
    }
    out.set(id, perMove);
  }
  return out;
}

// groups: output of inputCollisions(eyes, items). A group stops the run only when a +1 and a -1 member share its eye input.
export function classifyCollisions(groups, items) {
  const stop = [], unknownMixed = [];
  for (const group of groups) {
    const answers = new Set(group.items.map(i => items[i].answer));
    if (answers.has(1) && answers.has(-1)) stop.push(group);
    else unknownMixed.push(group);
  }
  return { stop, unknownMixed };
}

// schedule: one seed's array of { id, moves }. Slots follow schedule order; unknown slots keep their index with value null.
export function buildLedger(schedule, certs) {
  const ledger = [];
  for (const { id, moves } of schedule) {
    for (const uci of moves) {
      const cert = certs.get(id)?.get(uci);
      if (!cert) throw Error(`No certificate for ${id} ${uci}`);
      ledger.push({ slot: ledger.length, id, uci, category: cert.category, value: cert.value,
        certificateSha256: cert.certificateSha256 });
    }
  }
  return ledger;
}

// Shuffles the known values over the known-slot mask. Unknown slots are not part of the output.
export function permuteKnownValues(ledger, seed) {
  const known = ledger.filter(slot => slot.value !== null);
  const indices = partialFisherYates(known.map((_, i) => i), known.length, mulberry32((seed ^ 0x5eed) >>> 0));
  const values = indices.map(t => known[t].value);
  const original = known.map(slot => slot.value);
  if (count(values, 1) !== count(original, 1) || count(values, -1) !== count(original, -1)) {
    throw Error('Permutation changed the count of +1 or -1 values');
  }
  return { values, indices };
}

export function positiveCount(ledger) {
  return count(ledger.map(slot => slot.value), 1);
}
