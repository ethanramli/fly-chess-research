// Action-centred public board/action projection, v4 (2026-10-25). Identical to
// public-action-relative-cue-v3 (header below) except that each token also drives
// one alpha/beta KC of the alpha1 reward store (MBON07 pool of a combined mapping,
// alpha-one-memory.mjs), as an odour activates every KC class; MBON01/MBON12 cells
// are unchanged when the cell budget is not exceeded.
// v3 header: Same frame contract, KC projection and value-cue
// perspective as public-action-relative-cue-v2; only the token family changes.
// v2 emitted generic tokens (mover type, capture type, vector, each relative
// piece alone) that recur on almost every board, so lessons on other boards
// rewrote a board's cells. v3 conjoins every action token with the action tag
// (moving piece, captured piece, promotion): act:vec:TAG:dx,dy and
// act:at:TAG:own|opp:PIECE:dx,dy. On the retention-probe boards this cut cell
// pushes against a taught board's certified move from 52 to 17 (scratch
// prototype; research/reports/stage1-encoder-crosstalk-2026-10-25).
// Features are public occupancy and the candidate move expressed relative to
// the landing square, from the actor's side. No attack, pin or outcome oracle.
// Engineering input interface; it bypasses modeled vision.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const tag = move => `${move.piece}x${move.captured ?? 'none'}${move.promotion ? '=' + move.promotion : ''}`;
const file = square => square.charCodeAt(0) - 97, rank = square => Number(square[1]) - 1;

export function createPublicActionRelativeEncoderV4(mapping, { seed = 14009, maxCells = 32,
  totalCurrent = 48, maxCellCurrent = 1.5, maxHistoryPlies = 512, taskFamily = 'capture-retention' } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 128
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5
    || taskFamily !== 'capture-retention')
    throw Error('Invalid action-relative encoder configuration');
  // Each feature drives one KC in each plastic compartment, so every registered
  // channel (PAM02->MBON01, PPL103->MBON12, PAM11->MBON07) can act on every feature.
  const compartments = ['MBON01', 'MBON12', 'MBON07'];
  const pools = compartments.map(type => [...new Set(mapping.groups
    .filter(g => g.mbonType === type).flatMap(g => g.kc))].sort((a, b) => a - b));
  if (pools.some(pool => !pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)))
    throw Error('Invalid compartment KC pools');
  const config = { seed, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies };
  const schema = 'public-action-relative-cue-v4';
  const identity = hash({ schema, config, pools, taskFamily });

  function relative(board, anchor, actor, exclude, prefix) {
    const tokens = [], forward = actor === 'w' ? 1 : -1;
    for (const piece of board.board().flat().filter(Boolean)) {
      if (piece.square === exclude) continue;
      const dx = file(piece.square) - file(anchor), dy = (rank(piece.square) - rank(anchor)) * forward;
      tokens.push(`${prefix}:${piece.color === actor ? 'own' : 'opp'}:${piece.type}:${dx},${dy}`);
    }
    return tokens;
  }

  function encode(frame, action, task) {
    if (frame && typeof frame.fen === 'function' && typeof frame.pgn === 'function')
      frame = { schema: 'public-lesson-frame-v1', fen: frame.fen(), pgn: frame.pgn(), action, task };
    if (frame?.schema !== 'public-lesson-frame-v1'
      || Object.keys(frame).sort().join(',') !== 'action,fen,pgn,schema,task'
      || typeof frame.fen !== 'string' || typeof frame.pgn !== 'string' || frame.pgn.length > 65536
      || frame.task?.objective !== 'capture-retention' || frame.task.plies !== 1
      || Object.keys(frame.task).sort().join(',') !== 'objective,plies')
      throw Error('Only public board/history/action/task frames; no teacher labels');
    const board = new Chess(); board.loadPgn(frame.pgn);
    if (board.fen() !== frame.fen) throw Error('Frame history/FEN mismatch');
    const history = board.history({ verbose: true });
    if (history.length > maxHistoryPlies) throw Error('Frame history exceeds bound');
    const actor = board.turn(), forward = actor === 'w' ? 1 : -1;
    const tokens = [`task:${frame.task.objective}:${frame.task.plies}`];
    let perspective = 'actor';
    if (frame.action !== null) {
      const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === frame.action);
      if (!move) throw Error('Illegal public frame action');
      const t = tag(move);
      tokens.push(`act:vec:${t}:${file(move.to) - file(move.from)},${(rank(move.to) - rank(move.from)) * forward}`,
        ...relative(board, move.to, actor, move.from, `act:at:${t}`));
    } else if (history.length) {
      // Value-channel cue after a public move: the move's own token family from
      // the mover's side; the moved piece itself is carried by the action tag, so
      // its landing square is excluded exactly as the action cue excludes its origin.
      const last = history.at(-1), mover = last.color, moverForward = mover === 'w' ? 1 : -1, t = tag(last);
      perspective = 'mover';
      tokens.push(`act:vec:${t}:${file(last.to) - file(last.from)},${(rank(last.to) - rank(last.from)) * moverForward}`,
        ...relative(board, last.to, mover, last.to, `act:at:${t}`));
    } else {
      // No public move: the v1 position cue anchored at the side to move's king.
      const anchor = board.board().flat().find(p => p && p.type === 'k' && p.color === actor)?.square;
      if (!anchor) throw Error('Position cue lacks an anchor');
      perspective = 'side-to-move';
      tokens.push('state:anchor:own-king', ...relative(board, anchor, actor, null, 'state:at'));
    }
    tokens.sort();
    const assignments = tokens.flatMap(token => pools.map((pool, p) =>
      ({ token, compartment: compartments[p], index: pool[bucket(seed, `${p}\0${token}`, pool.length)] })));
    const unique = [...new Set(assignments.map(a => a.index))];
    unique.sort((a, b) => bucket(seed, `budget:${a}`, 0x100000000) - bucket(seed, `budget:${b}`, 0x100000000) || a - b);
    const selected = unique.slice(0, maxCells).sort((a, b) => a - b), chosen = new Set(selected);
    const current = Math.min(maxCellCurrent, totalCurrent / selected.length);
    return { schema, identity, frameIdentity: hash(frame), perspective, tokens, assignments,
      stimulation: selected.map(index => ({ index, current })),
      accounting: { collisions: assignments.length - unique.length, droppedCells: unique.length - selected.length,
        droppedFeatures: assignments.filter(a => !chosen.has(a.index)).length, poolCells: pools.map(p => p.length) },
      scope: 'Action-centred symbolic frame; relative public occupancy only; projection may alias; no natural vision or learned consequence' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
