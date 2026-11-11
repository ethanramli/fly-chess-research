// Fly connections packet v1: graph-free chess teacher packets and seeded experience tapes.
// Nothing here propagates the neural graph. Caller-supplied Eyes v2 is used only to hash each legal
// candidate's rendered input. Pulses are teaching-event labels, not neural outcomes.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { uci as uciOf } from '../search-and-feedback/puzzle-search.mjs';
import { certifyCaptureRetentionAction, checkCaptureRetentionAction } from '../search-and-feedback/capture-retention-action-domain.mjs';
import { gameIdOf } from '../puzzle-learning/capture-choice-positions-v1.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';

export const BOARD_SCHEMA = 'fly-connections-board-v1';
export const PACKET_SCHEMA = 'fly-connections-packet-v1';
export const GROUPS = Object.freeze(['A', 'B', 'R', 'testA', 'testB']);
export const CAPTURE_CRITERION = 'capture-retention-one-ply-nonking-safe-v1';
export const R_CRITERION = 'experimental-contingency-v1';
export const TASK = Object.freeze({ objective: 'capture-retention', plies: 1 });
export const TIE_RULE = 'abs(diff)<=1e-9+1e-7*max(abs(scores))';
export const NONKING_SCOPE = 'does not meet nonking-capture criterion';
export const R_SCOPE = 'experimental-contingency legal membership; no chess consequence claimed';
const MEMBER_SCHEMA = 'fly-connections-membership-proof-v1';
const INELIGIBLE_SCHEMA = 'fly-connections-board-ineligible-v1';
const MARKS = [8, 16, 32];
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Fixed selection order: SHA-256 of board and action identity, independent of scores and neural state.
const ordered = (boardId, moves) => [...moves].sort((a, b) => byText(digest(['order-v1', boardId, a]), digest(['order-v1', boardId, b])));
const flagsFor = (moves, target) => Object.fromEntries(moves.map(m => [m, m === target]));
// Same hash as Eyes v2 collision checks: sorted [index,current] pairs.
export const inputHash = (eyes, fen, move) => digest(eyes.encode(fen, move).stimulation.map(({ index, current }) => [index, current]).sort((a, b) => a[0] - b[0]));
const twoOf = list => [list[0], list[list.length > 1 ? 1 : 0]];

// Independent source read: GameId and the standard-start main line of the supplied PGN text.
function sourceLine(pgn, gameId) {
  if (typeof pgn !== 'string' || gameIdOf(pgn) !== gameId) throw Error('Row GameId does not match the supplied source PGN');
  if (/^\[(SetUp|FEN) "/m.test(pgn)) throw Error('Only standard-start PGN is supported; Setup/FEN games are rejected');
  const game = new Chess();
  game.loadPgn(pgn);
  const headers = game.getHeaders();
  if ('SetUp' in headers || 'FEN' in headers) throw Error('Only standard-start PGN is supported; Setup/FEN games are rejected');
  return game.history({ verbose: true }).map(move => move.from + move.to + (move.promotion ?? ''));
}

function applyUci(board, move) {
  if (typeof move !== 'string' || !UCI.test(move)) throw Error(`Malformed UCI move ${JSON.stringify(move)}`);
  const from = move.slice(0, 2), to = move.slice(2, 4);
  const done = board.move(move.length === 5 ? { from, to, promotion: move[4] } : { from, to });
  if (!done || uciOf(done) !== move) throw Error(`Move ${move} is not the exact legal move`);
}

// Rebuilds the board from the full UCI history (repetition, castling and en passant retained). No FEN-only path.
export function replayPacketBoard(record) {
  const { gameId, ply, fen, history, boardId } = record;
  if (!Array.isArray(history) || ply !== history.length) throw Error('ply must equal the history length');
  const board = new Chess();
  for (const move of history) applyUci(board, move);
  if (board.fen() !== fen) throw Error('Recorded FEN does not match the replayed history');
  if (boardId !== `${gameId}:${ply}`) throw Error('boardId must equal gameId:ply');
  return board;
}

const legalActions = board => new Map(board.moves({ verbose: true }).map(m => [uciOf(m), m]));

// Legal-membership proof for a king, quiet or experimental action. It never claims a chess consequence.
function membershipProof(board, move, scope, history) {
  const action = legalActions(board).get(move);
  if (!action) throw Error(`${move} is not legal in this board`);
  const certificate = { schema: MEMBER_SCHEMA, rootFen: board.fen(), historySha256: digest(history), move,
    piece: action.piece, captured: action.captured ?? null, scope };
  return { status: 'membership', certificate, certificateSha256: digest(certificate) };
}

function checkMembership(board, move, proof, history, scope) {
  const action = legalActions(board).get(move);
  const c = proof?.certificate;
  if (!action || proof?.status !== 'membership' || c?.schema !== MEMBER_SCHEMA || c.rootFen !== board.fen()
    || c.historySha256 !== digest(history) || c.move !== move || c.piece !== action.piece
    || c.captured !== (action.captured ?? null) || c.scope !== scope || proof.certificateSha256 !== digest(c))
    throw Error(`Membership proof for ${move} does not bind to this action`);
}

// Certificate from the existing generator, then the existing independent checker. Unknown is returned as-is.
function captureProof(board, move, maxReplies) {
  const options = { maxReplies };
  const proof = certifyCaptureRetentionAction(board, move, TASK, options);
  if (proof.status === 'unknown') return proof;
  const check = checkCaptureRetentionAction(board, move, TASK, proof, options);
  if (check.verified !== true || check.learningAllowed !== true || check.status !== proof.status)
    throw Error(`Independent recheck rejects the certificate for ${move}`);
  return proof;
}

// Four experiences per A/B board: two safe then two unsafe, each in fixed selection order; one-member classes repeat.
function prescribed(boardId, safe, unsafe, proofs) {
  return [
    ...twoOf(ordered(boardId, safe)).map(move => ({ move, pulse: true, proofSha: proofs[move].certificateSha256 })),
    ...twoOf(ordered(boardId, unsafe)).map(move => ({ move, pulse: false, proofSha: proofs[move].certificateSha256 })),
  ];
}

// Builds one board record from a source row. Ineligible boards return a structured result, never an unsafe label.
export function buildBoardRecord(row, { group, pgn, eyes, maxReplies = 256 } = {}) {
  if (!GROUPS.includes(group)) throw Error(`Unknown group ${group}`);
  if (typeof eyes?.encode !== 'function' || typeof eyes.identity !== 'string') throw Error('Eyes v2 encoder with identity required');
  const { gameId, ply, fen, history } = row;
  const source = sourceLine(pgn, gameId);
  if (!Array.isArray(history) || history.length !== ply || source.length < ply || !same(history, source.slice(0, ply))) {
    const firstDiff = Array.isArray(history) ? history.findIndex((m, i) => m !== source[i]) : -1;
    throw Error(`Row ${gameId}:${ply} history is not the exact UCI prefix of the source PGN `
      + `(row has ${Array.isArray(history) ? history.length : 'no'} moves, source has ${source.length}, first difference at index ${firstDiff})`);
  }
  const boardId = `${gameId}:${ply}`;
  const prefix = source.slice(0, ply);
  const board = replayPacketBoard({ gameId, ply, fen, history: prefix, boardId });
  const actions = legalActions(board);
  if (!actions.size || actions.size > 256) throw Error('Board needs 1..256 legal actions');
  const moves = [...actions.keys()].sort(byText);
  const isR = group === 'R';
  const ineligible = (reason, extra = {}) => ({ schema: INELIGIBLE_SCHEMA, eligible: false, boardId, gameId, ply, group, reason, ...extra });

  const proofs = {}, kinds = {}, unknown = [];
  for (const move of moves) {
    const action = actions.get(move);
    if (!isR && action.captured && action.piece !== 'k') {
      const proof = captureProof(board, move, maxReplies);
      if (proof.status === 'unknown') { unknown.push(move); continue; }
      proofs[move] = proof;
      kinds[move] = proof.status === 'success' ? 'safe' : 'unsafe';
    } else {
      proofs[move] = membershipProof(board, move, isR ? R_SCOPE : NONKING_SCOPE, prefix);
      kinds[move] = 'membership';
    }
  }
  if (unknown.length) return ineligible('unknown-certificate', { unknownMoves: unknown });
  const safe = moves.filter(m => kinds[m] === 'safe'), unsafe = moves.filter(m => kinds[m] === 'unsafe');
  if (!isR && !safe.length) return ineligible('no-safe-nonking-capture');
  if (!isR && !unsafe.length) return ineligible('no-unsafe-nonking-capture');

  const inputHashes = Object.fromEntries(moves.map(m => [m, inputHash(eyes, board.fen(), m)]));
  let rTargets = [], outcomes, experiences = [];
  if (isR) {
    const order = ordered(boardId, moves);
    const second = order.find(m => inputHashes[m] !== inputHashes[order[0]]);
    if (second === undefined) return ineligible('no-distinct-rendered-targets');
    rTargets = [order[0], second];
    outcomes = { R1: flagsFor(moves, rTargets[0]), R2: flagsFor(moves, rTargets[1]) };
  } else {
    outcomes = Object.fromEntries(moves.map(m => [m, kinds[m] === 'safe']));
    if (group === 'A' || group === 'B') experiences = prescribed(boardId, safe, unsafe, proofs);
  }
  return { schema: BOARD_SCHEMA, boardId, gameId, ply, fen: board.fen(), history: prefix, group,
    criterion: isR ? R_CRITERION : CAPTURE_CRITERION, legal: moves, outcomes, proofs, inputHashes,
    eyesIdentity: eyes.identity, experiences, rTargets };
}

// Independent verification of a board record. Throws on any mismatch; never mutates the record.
export function verifyPacketBoard(record, { phase = 'chess' } = {}) {
  if (record?.schema !== BOARD_SCHEMA) throw Error('Not an eligible board record');
  const { group } = record;
  if (!GROUPS.includes(group)) throw Error(`Unknown group ${group}`);
  const isR = group === 'R';
  if (isR ? !['R1', 'R2'].includes(phase) : phase !== 'chess') throw Error(`Phase ${phase} is invalid for group ${group}`);
  if (record.criterion !== (isR ? R_CRITERION : CAPTURE_CRITERION)) throw Error('Criterion identity mismatch');
  const board = replayPacketBoard(record);
  const actions = legalActions(board);
  const moves = [...actions.keys()].sort(byText);
  if (moves.length > 256 || !same(record.legal, moves)) throw Error('Legal action domain mismatch');
  for (const field of ['proofs', 'inputHashes']) if (!same(Object.keys(record[field] ?? {}), moves)) throw Error(`${field} domain mismatch`);

  const kinds = {};
  for (const move of moves) {
    const action = actions.get(move), proof = record.proofs[move];
    if (!isR && action.captured && action.piece !== 'k') {
      if (proof?.status === 'unknown') throw Error(`Unknown certificate for ${move} cannot be used`);
      const check = checkCaptureRetentionAction(board, move, TASK, proof, {});
      if (check.verified !== true || check.learningAllowed !== true || check.status !== proof.status
        || !['success', 'failure'].includes(check.status)) throw Error(`Certificate for ${move} fails the independent check`);
      kinds[move] = check.status === 'success' ? 'safe' : 'unsafe';
    } else {
      checkMembership(board, move, proof, record.history, isR ? R_SCOPE : NONKING_SCOPE);
      kinds[move] = 'membership';
    }
  }
  if (isR) {
    const order = ordered(record.boardId, moves);
    const second = order.find(m => record.inputHashes[m] !== record.inputHashes[order[0]]);
    if (second === undefined || !same(record.rTargets, [order[0], second])) throw Error('R targets do not match the fixed selection rule');
    if (!same(record.experiences, [])) throw Error('R records carry no training experiences');
    const outcomes = { R1: flagsFor(moves, record.rTargets[0]), R2: flagsFor(moves, record.rTargets[1]) };
    if (!same(record.outcomes, outcomes)) throw Error('R outcomes do not match the contingency rule');
    return { board, outcomes: outcomes[phase], legal: moves };
  }
  const safe = moves.filter(m => kinds[m] === 'safe'), unsafe = moves.filter(m => kinds[m] === 'unsafe');
  if (!safe.length || !unsafe.length) throw Error('A/B/test boards need a safe and an unsafe nonking capture');
  const outcomes = Object.fromEntries(moves.map(m => [m, kinds[m] === 'safe']));
  if (!same(record.outcomes, outcomes)) throw Error('Outcomes do not match the verified certificates');
  const expected = group === 'A' || group === 'B' ? prescribed(record.boardId, safe, unsafe, record.proofs) : [];
  if (!same(record.experiences, expected)) throw Error('Experiences do not match the verified prescribed set');
  if (!same(record.rTargets, [])) throw Error('Chess records carry no R targets');
  return { board, outcomes, legal: moves };
}

// Seeded experience tape. Seed permutes board and action order; arms share this tape.
export function buildExperienceTape(boards, seed) {
  if (!Number.isSafeInteger(seed)) throw Error('seed must be a safe integer');
  const seenBoards = new Set(), seenGames = new Set();
  for (const group of GROUPS) {
    if (!Array.isArray(boards?.[group])) throw Error(`boards.${group} must be an array`);
    for (const record of boards[group]) {
      if (record?.group !== group) throw Error(`Board ${record?.boardId} is tagged ${record?.group}, not ${group}`);
      if (seenBoards.has(record.boardId) || seenGames.has(record.gameId)) throw Error(`Duplicate board or game ${record.boardId}`);
      seenBoards.add(record.boardId);
      seenGames.add(record.gameId);
      if (group === 'R') { verifyPacketBoard(record, { phase: 'R1' }); verifyPacketBoard(record, { phase: 'R2' }); }
      else verifyPacketBoard(record);
    }
  }
  for (const group of ['A', 'B', 'R']) if (!boards[group].length) throw Error(`Group ${group} needs at least one board`);

  const rng = mulberry32(seed);
  const permute = (list, next) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const shuffle = list => permute(list, rng);
  const events = [], probeAfter = [], ranges = [];
  let rankingPasses = 0;
  const probe = phase => probeAfter.push({ cursor: events.length, phase });
  const push = (phase, record, move, pulse, proofSha) => {
    const sequence = events.length;
    events.push({ sequence, eventId: digest({ seed, sequence, phase, boardId: record.boardId, move, criterion: record.criterion }),
      phase, group: record.group, boardId: record.boardId, move, pulse, criterion: record.criterion, proofSha });
    rankingPasses += record.legal.length;
  };
  const phaseRun = (phase, fill) => {
    const start = events.length;
    fill();
    ranges.push({ phase, start, end: events.length });
  };
  // A and B: board order permuted, then the four prescribed actions of each board permuted. Probes at 8/16/32 and end.
  const train = group => phaseRun(group, () => {
    const n = boards[group].length;
    shuffle(boards[group]).forEach((record, index) => {
      for (const e of shuffle(record.experiences)) push(group, record, e.move, e.pulse, e.proofSha);
      const k = index + 1;
      if (k === n) probe(`${group}-end`);
      else if (MARKS.includes(k)) probe(`${group}-${k}`);
    });
  });
  // R: board order permuted; four cycles, each cycle presents both targets in permuted order.
  const rounds = phase => phaseRun(phase, () => {
    const targetIndex = phase === 'R1' ? 0 : 1;
    shuffle(boards.R).forEach(record => {
      for (let cycle = 0; cycle < 4; cycle++) {
        for (const move of shuffle(record.rTargets)) push(phase, record, move, move === record.rTargets[targetIndex], record.proofs[move].certificateSha256);
      }
    });
    probe(`${phase}-end`);
  });
  train('A');
  rounds('R1');
  train('B');
  rounds('R2');

  // Pulse-count-preserving shuffle within each complete phase, from a separate stream so the primary order is unchanged.
  const shuffledPulses = events.map(e => e.pulse);
  const pulseRng = mulberry32(seed ^ 0x9e3779b9);
  for (const { start, end } of ranges) {
    permute(events.slice(start, end).map(e => e.pulse), pulseRng).forEach((p, i) => { shuffledPulses[start + i] = p; });
  }
  const sum = (list, f) => list.reduce((total, x) => total + f(x), 0);
  const abLegal = sum([...boards.A, ...boards.B], r => r.legal.length);
  const rLegal = sum(boards.R, r => r.legal.length);
  const byPhase = Object.fromEntries(ranges.map(({ phase, start, end }) => [phase, {
    events: end - start,
    pulses: events.slice(start, end).filter(e => e.pulse).length,
    shuffledPulses: shuffledPulses.slice(start, end).filter(Boolean).length,
  }]));
  const counts = {
    boards: Object.fromEntries(GROUPS.map(g => [g, boards[g].length])),
    events: events.length,
    positivePulses: events.filter(e => e.pulse).length,
    byPhase,
    rankingPasses,
    teachingReplayPasses: events.length,
    probes: {
      initial: 1,
      checkpoints: probeAfter.length,
      rankingPasses: abLegal * (1 + probeAfter.length) + rLegal * probeAfter.filter(p => p.phase.startsWith('R')).length,
    },
  };
  return { seed, events, shuffledPulses, sha256: digest({ seed, events, shuffledPulses }), counts,
    initialProbe: { cursor: 0, phase: 'T0' }, probeAfter };
}
