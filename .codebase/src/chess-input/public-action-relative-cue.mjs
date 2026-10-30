// Action-centred public board/action projection (2026-10-24). Replaces the
// absolute board-token cue for new registrations: under v1, two moves on one
// board shared about 86% of stimulated cells, so opposite lessons cancelled.
// Features are public occupancy and the candidate move expressed relative to
// the landing square, from the actor's side. No attack, pin or outcome oracle.
// Engineering input interface; it bypasses modeled vision.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const file = square => square.charCodeAt(0) - 97, rank = square => Number(square[1]) - 1;

export function createPublicActionRelativeEncoder(mapping, { seed = 14009, maxCells = 32,
  totalCurrent = 48, maxCellCurrent = 1.5, maxHistoryPlies = 512, taskFamily = 'capture-retention' } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 128
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5
    || taskFamily !== 'capture-retention')
    throw Error('Invalid action-relative encoder configuration');
  // Each feature drives one KC in each plastic compartment, so both registered
  // valence channels (PAM02->MBON01, PPL103->MBON12) can act on every feature.
  const pools = ['MBON01', 'MBON12'].map(type => [...new Set(mapping.groups
    .filter(g => g.mbonType === type).flatMap(g => g.kc))].sort((a, b) => a - b));
  if (pools.some(pool => !pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)))
    throw Error('Invalid compartment KC pools');
  const config = { seed, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies };
  const schema = 'public-action-relative-cue-v1';
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
    if (frame.action !== null) {
      const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === frame.action);
      if (!move) throw Error('Illegal public frame action');
      tokens.push(`act:mover:${move.piece}`, `act:captures:${move.captured ?? 'none'}`,
        `act:vector:${move.piece}:${file(move.to) - file(move.from)},${(rank(move.to) - rank(move.from)) * forward}`);
      if (move.promotion) tokens.push(`act:promotes:${move.promotion}`);
      tokens.push(...relative(board, move.to, actor, move.from, 'act:at'));
    } else {
      // Position cue for the separate value channel: anchored where the last
      // public move landed (or the side to move's king when there is no history).
      const last = history.at(-1), anchor = last?.to ?? board.board().flat()
        .find(p => p && p.type === 'k' && p.color === actor)?.square;
      if (!anchor) throw Error('Position cue lacks an anchor');
      tokens.push(`state:anchor:${last ? 'last-move' : 'own-king'}`, ...relative(board, anchor, actor, null, 'state:at'));
    }
    tokens.sort();
    const assignments = tokens.flatMap(token => pools.map((pool, p) =>
      ({ token, compartment: p ? 'MBON12' : 'MBON01', index: pool[bucket(seed, `${p}\0${token}`, pool.length)] })));
    const unique = [...new Set(assignments.map(a => a.index))];
    unique.sort((a, b) => bucket(seed, `budget:${a}`, 0x100000000) - bucket(seed, `budget:${b}`, 0x100000000) || a - b);
    const selected = unique.slice(0, maxCells).sort((a, b) => a - b), chosen = new Set(selected);
    const current = Math.min(maxCellCurrent, totalCurrent / selected.length);
    return { schema, identity, frameIdentity: hash(frame), tokens, assignments,
      stimulation: selected.map(index => ({ index, current })),
      accounting: { collisions: assignments.length - unique.length, droppedCells: unique.length - selected.length,
        droppedFeatures: assignments.filter(a => !chosen.has(a.index)).length, poolCells: pools.map(p => p.length) },
      scope: 'Action-centred symbolic frame; relative public occupancy only; projection may alias; no natural vision or learned consequence' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
