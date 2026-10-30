// Budget revised 2026-10-29: v2 cells and currents reproduced exactly; new facts in a separate extra budget (default 64 cells, 96 current) — extra budget size is TENTATIVE pending a verified KC coding-level source (research/literature/kc-sparse-coding-2026-10-29).
// Attack-map action cue v3 (2026-10-29), for Stage 2 king safety, check and mate.
// Objective strings found in the Stage 2 sources (2026-10-29 grep):
//   .codebase/src/puzzle-learning/lichess-stage2-avoid-mate-panel.mjs sets task objective
//     'forced-mate' with plies 1 or 3 (strata actual-mate, escapable-check) and
//     'avoid-mate' with plies 3 (all other strata).
//   .codebase/scripts/puzzle-learning/lichess-stage2-runtime-factory.mjs and
//     .codebase/src/puzzle-learning/lichess-stage2-brain-factory.mjs contain no objective string.
//   'avoid-loss' appears in none of these files; it is not accepted.
// Accepted objectives: 'capture-retention' (plies 1), 'forced-mate' (plies 1 or 3), 'avoid-mate' (plies 3).
// taskFamily gates them: 'capture-retention' accepts only capture-retention, 'king-safety' accepts
// forced-mate and avoid-mate.
//
// Policy (option A, researcher binding): the cue states only local, visible facts about the position
// after the candidate move. It never states consequences (no "allows mate", "no escape", "defends
// mate"), never counts escape or safe squares and never combines facts into a verdict. Mate is learned
// from verified feedback only.
//
// v2 part: the stimulation of createPublicAttackMapEncoderV2 with the same options, used as-is, so the
// v2 cells, currents and tokens are identical by construction. v2 accepts only the capture-retention
// task with plies 1; its tokens do not depend on the task, so the v2 part is always computed with that
// task (V2_TASK) whatever the v3 taskFamily is.
// Extra part (new in v3): tokens chk:, ekz:, okz: are hashed into their own budget of extraMaxCells
// cells (default 64, at most 64), disjoint from the v2 cells, with a hash namespace 'v3x' distinct from v2.
// Stimulation is the v2 part followed by the extra part.
//   chk:yes | chk:no                  side to move after the candidate move (enemy) is in check.
//   ekz:<dx>,<dy>:<att|safe>:<own|opp|empty>
//                                     the up-to-8 on-board squares around the ENEMY king (side to move
//                                     after the move). Offsets are file and rank steps from that king in
//                                     the mover's orientation: dx = file step, dy = rank step toward the
//                                     mover's opponent's back rank (dy is negated when the mover is Black).
//                                     att = attacked by at least one mover piece (after.attackers(sq, mover));
//                                     own/opp = occupant relative to the mover, empty if no occupant.
//   okz:<dx>,<dy>:<att|safe>:<own|opp|empty>
//                                     the same zone around the MOVER's king, with att = attacked by at
//                                     least one enemy piece. dy is again in the mover's orientation.
// Zone tokens use kingZoneCellsPerToken (default 4) cells per pool; chk tokens use chkCellsPerToken
// (default 8). Extra cells: current = min(maxCellCurrent, extraTotalCurrent / extraSelected) (default 96).
// Restricted class: an engineered local input given to the Fly. Not natural vision, not a teacher label,
// not a legality, check-safety or mate verdict.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { createPublicAttackMapEncoderV2 } from './public-attack-map-cue-v2.mjs';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const xy = square => [square.charCodeAt(0) - 97, Number(square[1]) - 1];
const square = (x, y) => String.fromCharCode(97 + x) + (y + 1);
const objectivesByFamily = {
  'capture-retention': { 'capture-retention': [1] },
  'king-safety': { 'forced-mate': [1, 3], 'avoid-mate': [3] },
};
const V2_TASK = { objective: 'capture-retention', plies: 1 };

// Zone tokens around `king` (a square) for `prefix` ('ekz' or 'okz'). `attackers` is the colour
// whose attacks are marked; the mover's orientation is used for the offsets.
function zoneTokens(after, prefix, king, mover, attackers) {
  const [kx, ky] = xy(king), tokens = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const x = kx + dx, y = ky + dy;
    if (!(dx || dy) || x < 0 || x > 7 || y < 0 || y > 7) continue;
    const at = square(x, y), piece = after.get(at);
    const rel = mover === 'w' ? dy : -dy;
    const att = after.attackers(at, attackers).length ? 'att' : 'safe';
    const own = !piece ? 'empty' : piece.color === mover ? 'own' : 'opp';
    tokens.push(`${prefix}:${dx},${rel}:${att}:${own}`);
  }
  return tokens;
}

function kingSquare(after, color) {
  return after.board().flat().find(p => p && p.type === 'k' && p.color === color)?.square;
}

// chk, ekz and okz tokens of the position `after` (the side to move is the enemy of the mover).
function extraTokens(after) {
  const enemy = after.turn(), mover = enemy === 'w' ? 'b' : 'w';
  const enemyKing = kingSquare(after, enemy), moverKing = kingSquare(after, mover);
  return [`chk:${after.inCheck() ? 'yes' : 'no'}`,
    ...(enemyKing ? zoneTokens(after, 'ekz', enemyKing, mover, mover) : []),
    ...(moverKing ? zoneTokens(after, 'okz', moverKing, mover, enemy) : [])].sort();
}

export function createPublicAttackMapEncoderV3(mapping, { seed = 14009, cellsPerToken = 20, kingZoneCellsPerToken = 4,
  chkCellsPerToken = 8, maxCells = 128, totalCurrent = 192, maxCellCurrent = 1.5, maxHistoryPlies = 512,
  taskFamily = 'capture-retention', extraMaxCells = 64, extraTotalCurrent = 96 } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(cellsPerToken) || cellsPerToken < 1 || cellsPerToken > 32
    || !Number.isSafeInteger(kingZoneCellsPerToken) || kingZoneCellsPerToken < 1 || kingZoneCellsPerToken > 8
    || !Number.isSafeInteger(chkCellsPerToken) || chkCellsPerToken < 1 || chkCellsPerToken > 32
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 128
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5
    || !Number.isSafeInteger(extraMaxCells) || extraMaxCells < 0 || extraMaxCells > 64
    || !Number.isFinite(extraTotalCurrent) || extraTotalCurrent <= 0 || extraTotalCurrent > 96
    || !Object.hasOwn(objectivesByFamily, taskFamily))
    throw Error('Invalid attack-map encoder configuration');
  const v2 = createPublicAttackMapEncoderV2(mapping, { seed, cellsPerToken, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies });
  const compartments = ['MBON01', 'MBON12', 'MBON07'];
  const pools = compartments.map(type => [...new Set(mapping.groups
    .filter(g => g.mbonType === type).flatMap(g => g.kc))].sort((a, b) => a - b));
  if (pools.some(pool => !pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)))
    throw Error('Invalid compartment KC pools');
  const config = { seed, cellsPerToken, kingZoneCellsPerToken, chkCellsPerToken, maxCells, totalCurrent, maxCellCurrent,
    maxHistoryPlies, extraMaxCells, extraTotalCurrent };
  const schema = 'public-attack-map-cue-v3';
  const identity = hash({ schema, config, pools, taskFamily });
  const cellsFor = token => /^[eo]kz:/.test(token) ? kingZoneCellsPerToken : chkCellsPerToken;
  const objectives = objectivesByFamily[taskFamily];

  function encode(frame, action, task) {
    if (frame && typeof frame.fen === 'function' && typeof frame.pgn === 'function')
      frame = { schema: 'public-lesson-frame-v1', fen: frame.fen(), pgn: frame.pgn(), action, task };
    if (frame?.schema !== 'public-lesson-frame-v1'
      || Object.keys(frame).sort().join(',') !== 'action,fen,pgn,schema,task'
      || typeof frame.fen !== 'string' || typeof frame.pgn !== 'string' || frame.pgn.length > 65536
      || !Object.hasOwn(objectives, frame.task?.objective) || !objectives[frame.task.objective].includes(frame.task.plies)
      || Object.keys(frame.task).sort().join(',') !== 'objective,plies')
      throw Error('Only public board/history/action/task frames of the accepted objectives; no teacher labels');
    const board = new Chess(); board.loadPgn(frame.pgn);
    if (board.fen() !== frame.fen) throw Error('Frame history/FEN mismatch');
    const history = board.history({ verbose: true });
    if (history.length > maxHistoryPlies) throw Error('Frame history exceeds bound');
    let perspective = 'actor', after;
    if (frame.action !== null) {
      const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === frame.action);
      if (!move) throw Error('Illegal public frame action');
      after = new Chess(board.fen()); after.move(move);
    } else if (history.length) {
      // Value-channel cue after a public move: the same cue for that move, from the mover's side.
      perspective = 'mover';
      after = board;
    } else throw Error('Attack-map cue needs an action or a public last move');
    const base = v2.encode({ schema: 'public-lesson-frame-v1', fen: frame.fen, pgn: frame.pgn, action: frame.action, task: V2_TASK });
    // Extra part: separate budget, disjoint from the v2 cells, namespace 'v3x'.
    const v2Cells = new Set(base.stimulation.map(s => s.index));
    const tokens = extraTokens(after);
    const assignments = tokens.flatMap(token => pools.flatMap((pool, p) => Array.from({ length: cellsFor(token) }, (_, r) =>
      ({ token, compartment: compartments[p], index: pool[bucket(seed, `v3x\0${p}\0${token}\0${r}`, pool.length)] }))));
    const collisionsWithV2 = assignments.filter(a => v2Cells.has(a.index)).length;
    const unique = [...new Set(assignments.map(a => a.index).filter(i => !v2Cells.has(i)))];
    unique.sort((a, b) => bucket(seed, `v3x\0budget:${a}`, 0x100000000) - bucket(seed, `v3x\0budget:${b}`, 0x100000000) || a - b);
    const extraSelected = unique.slice(0, extraMaxCells).sort((a, b) => a - b);
    const extraCurrent = extraSelected.length ? Math.min(maxCellCurrent, extraTotalCurrent / extraSelected.length) : 0;
    return { schema, identity, frameIdentity: hash(frame), perspective,
      tokens: [...base.tokens, ...tokens], assignments: [...base.assignments, ...assignments],
      stimulation: [...base.stimulation, ...extraSelected.map(index => ({ index, current: extraCurrent }))],
      accounting: { ...base.accounting, extra: { assignments: assignments.length, collisionsWithV2,
        dropped: unique.length - extraSelected.length, cells: extraSelected.length } },
      scope: 'Engineered local attack map after the candidate move: v2 landing-square attacks conjoined with capture/quiet, pin marks and a separate extra budget for check flag and king-zone attack and occupancy around both kings; restricted class given to the Fly; no legality, check-safety, mate or outcome verdict' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
