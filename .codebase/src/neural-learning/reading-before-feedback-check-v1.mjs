// Offline check of the reading-before-feedback rule on saved data (documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md).
// Inputs: the fixed-weight recording from record-pulse-readings-v1.mjs (every legal move with no pulse, a reward pulse and a punishment pulse),
// the saved quiet learning-off run of probe-wide-learning-v3.mjs, and the number of output cells per type from the annotation file. No graph.
// It replays the rule's 24 updates per board with each move's pulse-free rates and the recorded learning signals, then estimates how far the
// changed gains would push the safe capture's output-cell input above the rival's, with all rates held fixed. It can rule the rule out; it cannot show learning.
import { BOARD_IDS, CIRCUITS, DAN_TYPES, ETA, LESSONS_PER_PASS, MAX_GAIN, MIN_GAIN, PASSES, RULES, VALENCE, lessonLabels, rankMoves } from './three-board-feedback-v1.mjs';
import { replayGains, validateRecording } from './pulse-readings-v1.mjs';

export const SCALE = CIRCUITS.quiet.kcScale; // 0.014047: the rule reads pulse-free rates, the readings this scale was calibrated on
export const OUTPUT_TYPES = [...VALENCE.keys()];
export const HALF = 12; // lessons in passes 1-3, half of each board's 24

// Output cells per type, counted as the probes count them: one per annotation row whose exact hemibrain_type is an output type and whose
// cell class is not Kenyon_Cell. The probes also skip rows whose root is not in the graph; this count cannot see the graph, so it assumes all are.
export async function countOutputCells(lines) {
  const counts = Object.fromEntries(OUTPUT_TYPES.map(t => [t, 0])), roots = new Set();
  let col = null, repeatedRoots = 0;
  for await (const line of lines) {
    const fields = line.split('\t');
    if (!col) {
      if (!['root_id', 'cell_class', 'hemibrain_type'].every(key => fields.includes(key))) throw Error('Missing annotation column');
      col = { root: fields.indexOf('root_id'), cls: fields.indexOf('cell_class'), type: fields.indexOf('hemibrain_type') };
      continue;
    }
    const type = fields[col.type];
    if (!VALENCE.has(type) || fields[col.cls] === 'Kenyon_Cell') continue;
    counts[type]++;
    if (roots.has(fields[col.root])) repeatedRoots++; else roots.add(fields[col.root]);
  }
  if (!col) throw Error('Empty annotation file');
  return { counts, repeatedRoots };
}

// Estimated push toward the safe capture, with rates fixed. A learnable connection from Kenyon cell j onto an output cell of type m adds
// base x gain x rate(j) to that cell's input. The score averages attraction cells minus avoidance cells, so one unit of input on a type-m cell
// moves the score by valence(m) / (cells in m's group). Summed over connections, using (safe rate - rival rate), this gives the change in the
// safe-minus-rival input difference that the gain changes cause, weighted as the score weights output cells.
export function pushOf(gains, mapping, safeRates, rivalRates, scoreWeight) {
  const byType = Object.fromEntries(OUTPUT_TYPES.map(t => [t, 0])), byCell = new Float64Array(mapping.weights.length);
  for (let i = 0; i < gains.length; i++) {
    const c = mapping.cell[i], term = mapping.base[i] * (gains[i] - 1) * (safeRates[c] - rivalRates[c]);
    byType[mapping.type[i]] += term;
    byCell[c] += scoreWeight[mapping.type[i]] * term;
  }
  const net = OUTPUT_TYPES.reduce((sum, t) => sum + scoreWeight[t] * byType[t], 0);
  return { byType, net, byCell };
}

// Self-check, part 1: the saved learning-off run and the recording must agree exactly, so the replay starts from the circuit the probe saw.
// Every lesson's dopamine means and learning signals, and every starting move score, must be bit-identical.
function compareSavedRun(run, boards, packet) {
  const problems = [], fail = p => problems.push(p);
  if (run?.circuit !== 'quiet' || run?.condition !== 'off') fail(`saved run is ${run?.circuit} ${run?.condition}, not quiet off`);
  const saved = Array.isArray(run?.boards) ? run.boards : [];
  if (saved.length !== BOARD_IDS.length || BOARD_IDS.some((id, i) => saved[i]?.boardId !== id)) fail('saved run does not hold the three boards in packet order');
  let lessons = 0, scores = 0;
  for (const [i, id] of BOARD_IDS.entries()) {
    const { reading } = boards.get(id), board = packet.find(r => r.boardId === id), s = saved[i]?.boardId === id ? saved[i] : null;
    const labels = lessonLabels(board.experiences, 'correct');
    if (s?.lessons?.length !== PASSES * labels.length) fail(`${id}: saved run has ${s?.lessons?.length ?? 0} lessons, expected ${PASSES * labels.length}`);
    for (let k = 0; k < PASSES * labels.length; k++) {
      const want = labels[k % labels.length], got = s?.lessons?.[k], r = reading(want.move, want.label);
      const same = got && got.pass === Math.floor(k / labels.length) + 1 && got.index === k % labels.length && got.move === want.move && got.label === want.label
        && DAN_TYPES.every(t => Object.is(got.danMean?.[t], r.danMean[t])) && OUTPUT_TYPES.every(m => Object.is(got.D?.[m], r.D[m]));
      if (same) lessons++; else fail(`${id}: lesson ${k} (${want.move}, ${want.label}) differs from the recording or is missing`);
    }
    const start = s?.checkpoints?.[0]?.pass === 0 ? s.checkpoints[0].scores ?? {} : {};
    if (Object.keys(start).length !== board.legal.length) fail(`${id}: saved run has ${Object.keys(start).length} starting scores, expected ${board.legal.length}`);
    for (const move of board.legal) if (Number.isFinite(start[move]) && Object.is(start[move], reading(move, 'none').score)) scores++; else fail(`${id}: starting score of ${move} differs from the recording or is missing`);
  }
  return { lessonsMatching: lessons, startingScoresMatching: scores, problems };
}

// The whole check. Returns the self-check, per-board replay results and the screen's answer: 'self-check failed', 'too few boards',
// 'ruled out' or 'not ruled out'. Rule-out conditions are fixed on the protocol page before data.
export function checkReadingBeforeFeedback({ recording, savedRun, outputCells }) {
  const boards = validateRecording(recording), { mapping, packet } = recording;
  if (!Array.isArray(mapping.base) || mapping.base.length !== mapping.edge.length || mapping.base.some(x => !(x > 0))) throw Error('Recording rejected: mapping lacks a positive starting weight per connection');
  if (OUTPUT_TYPES.some(t => !(Number.isInteger(outputCells?.[t]) && outputCells[t] > 0))) throw Error(`Output-cell counts missing or not positive: ${JSON.stringify(outputCells)}`);
  const group = sign => OUTPUT_TYPES.filter(t => Math.sign(VALENCE.get(t)) === sign).reduce((sum, t) => sum + outputCells[t], 0);
  const groupSize = { 1: group(1), '-1': group(-1) };
  const scoreWeight = Object.fromEntries(OUTPUT_TYPES.map(t => [t, VALENCE.get(t) / groupSize[Math.sign(VALENCE.get(t))]]));

  const savedRunCheck = compareSavedRun(savedRun, boards, packet);
  const perBoard = BOARD_IDS.map(boardId => {
    const { board, reading } = boards.get(boardId);
    const scores = Object.fromEntries(board.legal.map(m => [m, reading(m, 'none').score]));
    const ranked = rankMoves(scores, board.legal.filter(m => board.outcomes[m] === true));
    const tolerance = 1e-9 + 1e-7 * ranked.maxAbs, eligible = ranked.gap >= RULES.eligibleTolerances * tolerance;
    const safeRates = reading(ranked.bestSafe.move, 'none').rates, rivalRates = reading(ranked.rival.move, 'none').rates;
    const replay = condition => {
      const lessons = lessonLabels(board.experiences, condition).map(({ move, label }) => ({ rates: reading(move, 'none').rates, D: reading(move, label).D }));
      const { gains, byPass, guardTrips } = replayGains(lessons, mapping, SCALE);
      const final = pushOf(gains, mapping, safeRates, rivalRates, scoreWeight), half = pushOf(byPass[HALF / LESSONS_PER_PASS - 1], mapping, safeRates, rivalRates, scoreWeight);
      return { lessons, gains, final, half, guardTrips };
    };
    const correct = replay('correct'), swapped = replay('swapped');
    const cellsAbs = Array.from(correct.final.byCell, Math.abs), totalAbs = cellsAbs.reduce((a, b) => a + b, 0);
    const top = cellsAbs.indexOf(Math.max(...cellsAbs)), largestPositive = Math.max(0, ...correct.final.byCell);
    // Self-check, parts 2 and 3: the first update equals the rule written out by hand (its gain term is zero), and the push summed by type
    // equals the push summed by cell.
    const first = correct.lessons[0], afterFirst = replayGains([first], mapping, SCALE).byPass[0];
    const firstStepMatches = mapping.cell.every((c, i) => { // gain 1 + 0.5 x signal x (reading + 1 - 1), within the gain limits
      const k = Math.min(1, first.rates[c] / SCALE);
      return Object.is(afterFirst[i], Math.min(MAX_GAIN, Math.max(MIN_GAIN, 1 + ETA * first.D[mapping.type[i]] * (k + 1 - 1))));
    });
    const sumsAgree = Math.abs(correct.final.byCell.reduce((a, b) => a + b, 0) - correct.final.net) <= 1e-9 * totalAbs;
    // The three rule-out conditions; a board passes when all three hold. They are independent: none implies another.
    const conditions = {
      withoutTopCell: correct.final.net - largestPositive > 0, // still favours the safe capture without the one cell that helps most
      beatsSwapped: correct.final.net > swapped.final.net, // correct labels push further than swapped labels
      byHalfway: correct.half.net > 0, // already favours the safe capture after 12 lessons, where fixed readings are closest to the real run
    };
    return { boardId, safe: ranked.bestSafe, rival: ranked.rival, gap: ranked.gap, eligible,
      correct: { byType: correct.final.byType, net: correct.final.net, netAfter12: correct.half.net, guardTrips: correct.guardTrips },
      swapped: { byType: swapped.final.byType, net: swapped.final.net, netAfter12: swapped.half.net, guardTrips: swapped.guardTrips },
      topCell: { cell: mapping.cells[top], rootId: mapping.cellRootIds?.[top] ?? null, contribution: correct.final.byCell[top], shareOfChange: totalAbs ? cellsAbs[top] / totalAbs : null },
      largestPositiveContribution: largestPositive,
      twelveLessonShare: correct.final.net !== 0 ? correct.half.net / correct.final.net : null,
      conditions, passesAll: Object.values(conditions).every(Boolean), selfCheck: { firstStepMatches, sumsAgree } };
  });
  const selfCheck = { savedRun: savedRunCheck, firstStepMatches: perBoard.every(b => b.selfCheck.firstStepMatches), sumsAgree: perBoard.every(b => b.selfCheck.sumsAgree) };
  selfCheck.passes = !savedRunCheck.problems.length && selfCheck.firstStepMatches && selfCheck.sumsAgree;
  const eligible = perBoard.filter(b => b.eligible), surviving = eligible.filter(b => b.passesAll);
  const count = key => eligible.filter(b => b.conditions[key]).length;
  const screen = !selfCheck.passes ? { answer: 'self-check failed', reason: 'the saved data or the replay arithmetic did not check out; no screen is read' }
    : eligible.length < 2 ? { answer: 'too few boards', reason: `only ${eligible.length} board(s) qualify; the protocol needs 2` }
    : surviving.length < 2 ? { answer: 'ruled out', reason: `${surviving.length} qualifying board(s) pass all three conditions; at least 2 are needed` }
    : { answer: 'not ruled out', reason: `${surviving.length} qualifying boards pass all three conditions` };
  return { schema: 'reading-before-feedback-check-v1', rule: 'reading before feedback', scale: SCALE, outputCells, groupSize: { attraction: groupSize[1], avoidance: groupSize[-1] },
    note: 'Rates and learning signals are fixed at their learning-off values. The push estimates the first-order change in output-cell input; actual learning, where rates and signals change as gains change, is not measured.',
    selfCheck, conditionCounts: { qualifying: eligible.length, withoutTopCell: count('withoutTopCell'), beatsSwapped: count('beatsSwapped'), byHalfway: count('byHalfway'), all: surviving.length },
    screen, boards: perBoard };
}
