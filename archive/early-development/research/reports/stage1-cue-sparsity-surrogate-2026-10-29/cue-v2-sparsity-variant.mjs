// TEST-ONLY VARIANT (2026-10-29, sparsity surrogate). Copy of public-attack-map-cue-v2.mjs with only
// the configuration caps relaxed (cellsPerToken <= 80, maxCells <= 1024, totalCurrent <= 1.5*maxCells).
// Not an engineering or learner encoder; do not promote. Tokens, hashing and budget logic unchanged.
// Attack-map action cue v2 (2026-10-28, researcher decision at stop S2 after smoke r13,
// research/reports/stage1-smoke-r13-2026-10-27). Cue v1 with two changes:
// (a) every attack token is conjoined with the move's capture/quiet tag, so a safe quiet move
//     (act:quiet|att:none) no longer shares cells with a safe capture (act:capture|att:none);
// (b) a true pin mark: an attacker on a clear line with its own king is marked pin when the
//     first piece beyond it on that line is a mover's slider that moves along the line (rook or
//     queen orthogonally, bishop or queen diagonally), else kline; other attackers stay free.
//     The pin is geometric: it does not check whether the attacker could still move along the
//     pin line, so it is not a legality or recapture verdict.
// Same frame contract, KC pools, cell hashing and budget as v1 (one act token plus the conjoined
// attack tokens). Restricted class: an engineered attack judgement given to the Fly, not natural
// vision and not a teacher label. Claims must state it.
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
  const mark = from => {
    if (!king || from === king) return 'free';
    const [ax, ay] = xy(from), [kx, ky] = xy(king), dx = ax - kx, dy = ay - ky;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return 'free';
    const sx = Math.sign(dx), sy = Math.sign(dy), n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i < n; i++) if (after.get(square(kx + sx * i, ky + sy * i))) return 'free';
    const sliders = sx && sy ? 'bq' : 'rq';
    for (let x = ax + sx, y = ay + sy; x >= 0 && x < 8 && y >= 0 && y < 8; x += sx, y += sy) {
      const piece = after.get(square(x, y));
      if (piece) return piece.color !== enemy && sliders.includes(piece.type) ? 'pin' : 'kline';
    }
    return 'kline';
  };
  return [...new Set(hits.map(from => `att:${after.get(from).type}:${mark(from)}`))];
}

function moveTokens(after, move) {
  const act = move.captured ? 'act:capture' : 'act:quiet';
  return [act, ...attackTokens(after, move.to).map(token => `${act}|${token}`)];
}

export function createPublicAttackMapEncoderV2(mapping, { seed = 14009, cellsPerToken = 20, maxCells = 128,
  totalCurrent = 192, maxCellCurrent = 1.5, maxHistoryPlies = 512, taskFamily = 'capture-retention' } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(cellsPerToken) || cellsPerToken < 1 || cellsPerToken > 80
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 1024
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 1.5 * maxCells
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5
    || taskFamily !== 'capture-retention')
    throw Error('Invalid attack-map encoder configuration');
  const compartments = ['MBON01', 'MBON12', 'MBON07'];
  const pools = compartments.map(type => [...new Set(mapping.groups
    .filter(g => g.mbonType === type).flatMap(g => g.kc))].sort((a, b) => a - b));
  if (pools.some(pool => !pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)))
    throw Error('Invalid compartment KC pools');
  const config = { seed, cellsPerToken, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies };
  const schema = 'public-attack-map-cue-v2';
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
      tokens = moveTokens(after, move);
    } else if (history.length) {
      // Value-channel cue after a public move: the same tokens for that move, from the mover's side.
      perspective = 'mover';
      tokens = moveTokens(board, history.at(-1));
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
      scope: 'Engineered attack map of the landing square, conjoined with capture/quiet, with own-king line and geometric pin marks; restricted class given to the Fly; no legality verdict or outcome label' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
