// Experimental, label-blind geometry for candidate-relative slider relations.
// It preserves the existing connectome; this is an engineered symbolic input,
// not natural vision, an attack oracle, or a learned consequence label.
import { createHash } from 'node:crypto';
import { createRelationalChessCueEncoder } from './relational-chess-cue-v3.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const key = move => move.from + move.to + (move.promotion ?? '');
const coords = square => [square.charCodeAt(0) - 97, Number(square[1]) - 1];

function isSliderOnRay(type, dx, dy) {
  const diagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;
  const orthogonal = (dx === 0) !== (dy === 0);
  return type === 'q' ? diagonal || orthogonal
    : type === 'r' ? orthogonal
      : type === 'b' ? diagonal : false;
}

export function createBoundRayRelationalCueEncoder(mapping, {
  seed = 14009, maxCells = 14, totalCurrent = 21, maxCellCurrent = 1.5,
  maxRelationCells = 4, maxHistoryPlies = 512,
} = {}, allLegal = false) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || typeof allLegal !== 'boolean'
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(maxCells) || maxCells < 2 || maxCells > 128
    || !Number.isSafeInteger(maxRelationCells) || maxRelationCells < 1 || maxRelationCells >= maxCells
    || !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512
    || !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192
    || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5)
    throw Error('Invalid bound-ray cue configuration');
  const pool = [...new Set(mapping.groups.flatMap(group => group.kc))].sort((a, b) => a - b);
  if (!pool.length || pool.some(index => !Number.isSafeInteger(index) || index < 0))
    throw Error('Invalid mapped KC pool');
  const schema = allLegal ? 'bound-ray-relational-action-cue-v2' : 'bound-ray-relational-cue-v1';
  const config = Object.freeze({ seed, maxCells, totalCurrent, maxCellCurrent, maxRelationCells, maxHistoryPlies,
    ...(allLegal ? { actionDomain: 'all-legal' } : {}) });
  const baseEncoder = createRelationalChessCueEncoder(mapping, {
    seed, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies,
  });
  const identity = digest({ schema, mapping, config, pool,
    baseCueIdentity: baseEncoder.identity });

  function encode(board, candidate, task = { objective: 'capture-retention', plies: 1 }) {
    if (task?.objective !== 'capture-retention' || task.plies !== 1
      || Object.keys(task).some(name => !['objective', 'plies'].includes(name)))
      throw Error('Bound-ray cue supports only the declared one-reply capture-retention task');
    const before = board.fen(), pgn = board.pgn(), history = board.history({ verbose: true });
    if (history.length > maxHistoryPlies || pgn.length > 65536 || board.isGameOver())
      throw Error('Task history exceeds the bound-ray cue contract');
    const move = board.moves({ verbose: true }).find(item => key(item) === (typeof candidate === 'string' ? candidate : candidate && key(candidate)));
    if (!move || (!allLegal && !move.captured)) throw Error(allLegal
      ? 'Bound-ray action cue requires a legal action' : 'Bound-ray cue requires a legal capture');
    const base = baseEncoder.encode(board, key(move), task);
    const [fx, fy] = coords(move.from), [tx, ty] = coords(move.to), direction = board.turn() === 'w' ? 1 : -1;
    const pieces = board.board().flat().filter(Boolean).filter(piece => piece.square !== move.from && piece.square !== move.to);
    const rayTokens = new Set();
    for (const slider of pieces) {
      if (!['b', 'r', 'q'].includes(slider.type)) continue;
      const [sx, sy] = coords(slider.square), dx = sx - tx, dy = sy - ty;
      if (!isSliderOnRay(slider.type, dx, dy)) continue;
      const role = slider.color === board.turn() ? 'self' : 'opponent';
      const vx = Math.abs(dx), vy = direction * dy;
      rayTokens.add(`slider-line:${move.piece}:${role}:${slider.type}:${vx},${vy}`);
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps < 2) continue;
      const stepX = Math.sign(dx), stepY = Math.sign(dy);
      for (let step = 1; step < steps; step++) {
        const bx = tx + stepX * step, by = ty + stepY * step;
        const between = pieces.find(piece => {
          const [px, py] = coords(piece.square);
          return px === bx && py === by;
        });
        if (!between) continue;
        const blockerRole = between.color === board.turn() ? 'self' : 'opponent';
        rayTokens.add(`slider-context:${move.piece}:${role}:${slider.type}:${vx},${vy}:${blockerRole}:${between.type}:${Math.abs(bx - tx)},${direction * (by - ty)}`);
      }
    }

    const relationAssignments = [...rayTokens].sort().map(token => ({ family: 'relation', token,
      index: pool[bucket(seed, `relation:${token}`, pool.length)] }));
    const baseAssignments = base.assignments.map(row => ({ family: 'board-action', token: row.token,
      index: row.index }));
    const relationIndices = [...new Set(relationAssignments.map(row => row.index))];
    relationIndices.sort((a, b) => bucket(seed, `relation-budget:${a}`, 0x100000000)
      - bucket(seed, `relation-budget:${b}`, 0x100000000) || a - b);
    const selected = relationIndices.slice(0, maxRelationCells);
    const selectedSet = new Set(selected), relationSet = new Set(relationIndices);
    const baseIndices = [...new Set(baseAssignments.map(row => row.index))].filter(index => !relationSet.has(index));
    baseIndices.sort((a, b) => bucket(seed, `board-action-budget:${a}`, 0x100000000)
      - bucket(seed, `board-action-budget:${b}`, 0x100000000) || a - b);
    const baseChosen = baseIndices.slice(0, maxCells - selected.length);
    selected.push(...baseChosen);
    for (const index of baseChosen) selectedSet.add(index);
    for (const index of relationIndices) {
      if (selected.length >= maxCells) break;
      if (!selectedSet.has(index)) { selected.push(index); selectedSet.add(index); }
    }
    if (selected.length < maxCells) {
      const overflow = [...new Set([...relationIndices, ...baseAssignments.map(row => row.index)])]
        .filter(index => !selectedSet.has(index));
      overflow.sort((a, b) => bucket(seed, `overflow:${a}`, 0x100000000)
        - bucket(seed, `overflow:${b}`, 0x100000000) || a - b);
      selected.push(...overflow.slice(0, maxCells - selected.length));
    }
    if (selected.length !== maxCells) throw Error('Cue cannot meet its fixed stimulation budget');
    const selectedSetFinal = new Set(selected), current = Math.min(maxCellCurrent, totalCurrent / selected.length);
    if (board.fen() !== before || board.pgn() !== pgn) throw Error('Cue encoder changed the task');
    const assignments = [...baseAssignments, ...relationAssignments];
    const tokens = assignments.map(row => row.token).sort();
    return { schema, identity, baseIdentity: base.identity,
      move: key(move), actor: board.turn(), fen: before, historyPlies: history.length, tokens,
      assignments, stimulation: [...selected].sort((a, b) => a - b).map(index => ({ index, current })),
      relation: { tokens: [...rayTokens].sort(), projectedCells: relationIndices.length,
        selectedCells: relationIndices.filter(index => selectedSetFinal.has(index)).length,
        droppedTokens: relationAssignments.filter(row => !selectedSetFinal.has(row.index)).length,
        meaning: 'Candidate-target slider alignment and intervening piece geometry; no legality, consequence, or outcome label' },
      accounting: { featureCount: tokens.length, uniqueProjectedCells: new Set(assignments.map(row => row.index)).size,
        collisions: assignments.length - new Set(assignments.map(row => row.index)).size,
        stimulatedCells: selected.length, droppedCells: new Set(assignments.map(row => row.index)).size - selected.length,
        totalCurrent: current * selected.length, currentPerCell: current, poolCells: pool.length },
      interface: 'Public board/action geometry with a fixed-budget bound relation allocation; engineered symbolic input, not natural vision or a task-answer oracle' };
  }
  return Object.freeze({ schema, identity, config,
    pool: Object.freeze(pool), encode });
}

// C01 shares public geometry/dose; only the declared legal action domain expands.
export function createAllLegalBoundRayCueEncoder(mapping, config = {}) {
  return createBoundRayRelationalCueEncoder(mapping, config, true);
}
