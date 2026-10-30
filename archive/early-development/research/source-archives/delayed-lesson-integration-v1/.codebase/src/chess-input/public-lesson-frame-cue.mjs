// Symbolic public board/history/action projection, including terminal endpoints.
// Absolute geometry is deliberate; no outcome, attack oracle or teacher label.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;

export function createPublicLessonFrameEncoder(mapping, { seed = 14009, maxCells = 64,
  totalCurrent = 24, maxCellCurrent = 1.5, maxHistoryPlies = 512 } = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(maxCells) || maxCells < 1 || maxCells > 128
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5)
    throw Error('Invalid public frame encoder configuration');
  const pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a,b) => a-b);
  if (!pool.length || pool.some(i => !Number.isSafeInteger(i) || i < 0)) throw Error('Invalid KC pool');
  const config = { seed, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies };
  const identity = hash({ schema: 'public-lesson-frame-cue-v1', mapping, config, pool });
  function encode(frame) {
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
    if (frame.action !== null && !board.moves({ verbose: true }).some(m =>
      m.from + m.to + (m.promotion ?? '') === frame.action)) throw Error('Illegal public frame action');
    const [, turn, rights, ep, halfmove, fullmove] = frame.fen.split(' ');
    const tokens = [`turn:${turn}`, `castle:${rights}`, `ep:${ep}`, `halfmove:${halfmove}`,
      `fullmove:${fullmove}`, `task:${frame.task.objective}:${frame.task.plies}`, `action:${frame.action ?? 'none'}`];
    for (const piece of board.board().flat().filter(Boolean)) tokens.push(`piece:${piece.color}:${piece.type}:${piece.square}`);
    for (let i = 0; i < history.length; i++) {
      const m = history[i]; tokens.push(`history:${i}:${m.color}:${m.from}${m.to}${m.promotion ?? ''}`);
    }
    tokens.sort();
    const assignments = tokens.map(token => ({ token, index: pool[bucket(seed, token, pool.length)] }));
    const unique = [...new Set(assignments.map(a => a.index))];
    unique.sort((a,b) => bucket(seed, `budget:${a}`, 0x100000000) - bucket(seed, `budget:${b}`, 0x100000000) || a-b);
    const selected = unique.slice(0,maxCells).sort((a,b) => a-b), chosen = new Set(selected);
    const current = Math.min(maxCellCurrent, totalCurrent / selected.length);
    return { schema: 'public-lesson-frame-cue-v1', identity, frameIdentity: hash(frame), tokens, assignments,
      stimulation: selected.map(index => ({ index, current })),
      accounting: { collisions: tokens.length - unique.length, droppedCells: unique.length - selected.length,
        droppedFeatures: assignments.filter(a => !chosen.has(a.index)).length, poolCells: pool.length },
      scope: 'Bounded absolute symbolic frame; projection may alias; no natural vision or learned consequence' };
  }
  return Object.freeze({ identity, config: Object.freeze(config), encode });
}
