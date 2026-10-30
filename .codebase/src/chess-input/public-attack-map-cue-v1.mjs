// Attack-map action cue v1 (2026-10-27, researcher decision option A after the step-1
// representation ceiling, research/reports/stage1-representation-ceiling-2026-10-27).
// Same frame contract and three compartment KC pools (MBON01, MBON12, MBON07) as
// public-action-relative-cue-v4. Tokens: act:capture or act:quiet and, on the board after
// the move, each enemy piece type that can reach the landing square (chess.js attackers:
// pseudo-legal, pins ignored), marked kline when it stands on a clear straight line with
// its own king, else free; att:none when no enemy piece reaches it. No constant task token.
// Each token drives cellsPerToken hashed KCs in every pool, within a 128-cell budget. The
// surrogate screens (research/reports/stage1-attack-map-cue-2026-10-27) chose the coarse
// capture tag and 20 cells per token: with one cell per token, held-out choices followed
// each cell's scratch weight rather than what was learned.
// Restricted class: an engineered attack judgement given to the Fly, not natural vision,
// not a legality or recapture verdict and not a teacher label. Claims must state it.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const xy = square => [square.charCodeAt(0) - 97, Number(square[1]) - 1];
const square = (x, y) => String.fromCharCode(97 + x) + (y + 1);

// Enemy attackers of `to` on `after` (the side to move is the enemy of the mover).
function attackTokens(after, to) {
  const enemy = after.turn(), hits = after.attackers(to, enemy);
  if (!hits.length) return ['att:none'];
  const king = after.board().flat().find(p => p && p.type === 'k' && p.color === enemy)?.square;
  const kingLine = from => {
    if (!king || from === king) return false;
    const [ax, ay] = xy(from), [kx, ky] = xy(king), dx = kx - ax, dy = ky - ay;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy), n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i < n; i++) if (after.get(square(ax + sx * i, ay + sy * i))) return false;
    return true;
  };
  return [...new Set(hits.map(from => `att:${after.get(from).type}:${kingLine(from) ? 'kline' : 'free'}`))];
}

export function createPublicAttackMapEncoderV1(mapping, { seed = 14009, cellsPerToken = 20, maxCells = 128,
  totalCurrent = 192, maxCellCurrent = 1.5, maxHistoryPlies = 512, taskFamily = 'capture-retention' } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(cellsPerToken) || cellsPerToken < 1 || cellsPerToken > 32
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 128
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5
    || taskFamily !== 'capture-retention')
    throw Error('Invalid attack-map encoder configuration');
  const compartments = ['MBON01', 'MBON12', 'MBON07'];
  const pools = compartments.map(type => [...new Set(mapping.groups
    .filter(g => g.mbonType === type).flatMap(g => g.kc))].sort((a, b) => a - b));
  if (pools.some(pool => !pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)))
    throw Error('Invalid compartment KC pools');
  const config = { seed, cellsPerToken, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies };
  const schema = 'public-attack-map-cue-v1';
  const identity = hash({ schema, config, pools, taskFamily });

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
    let perspective = 'actor', tokens;
    if (frame.action !== null) {
      const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === frame.action);
      if (!move) throw Error('Illegal public frame action');
      const after = new Chess(board.fen()); after.move(move);
      tokens = [move.captured ? 'act:capture' : 'act:quiet', ...attackTokens(after, move.to)];
    } else if (history.length) {
      // Value-channel cue after a public move: the same tokens for that move, from the mover's side.
      const move = history.at(-1); perspective = 'mover';
      tokens = [move.captured ? 'act:capture' : 'act:quiet', ...attackTokens(board, move.to)];
    } else throw Error('Attack-map cue needs an action or a public last move');
    tokens.sort();
    const assignments = tokens.flatMap(token => pools.flatMap((pool, p) => Array.from({ length: cellsPerToken }, (_, r) =>
      ({ token, compartment: compartments[p], index: pool[bucket(seed, `${p}\0${token}\0${r}`, pool.length)] }))));
    const unique = [...new Set(assignments.map(a => a.index))];
    unique.sort((a, b) => bucket(seed, `budget:${a}`, 0x100000000) - bucket(seed, `budget:${b}`, 0x100000000) || a - b);
    const selected = unique.slice(0, maxCells).sort((a, b) => a - b), chosen = new Set(selected);
    const current = Math.min(maxCellCurrent, totalCurrent / selected.length);
    return { schema, identity, frameIdentity: hash(frame), perspective, tokens, assignments,
      stimulation: selected.map(index => ({ index, current })),
      accounting: { collisions: assignments.length - unique.length, droppedCells: unique.length - selected.length,
        droppedFeatures: assignments.filter(a => !chosen.has(a.index)).length, poolCells: pools.map(p => p.length) },
      scope: 'Engineered attack map of the landing square (pseudo-legal, pins ignored) plus own-king line marks; restricted class given to the Fly; no legality verdict or outcome label' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
