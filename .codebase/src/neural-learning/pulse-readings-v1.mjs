// Pulse readings check (documentation/design/neural-learning/pulse-scale-check-2026-11-15.md).
// Shared by record-pulse-readings-v1.mjs (graph machine: records every legal move with no pulse, a reward pulse and a punishment pulse,
// connection weights fixed) and report-pulse-scale-v1.mjs (offline: how the quiet circuit's scale affects move differences and update size).
// Rule, pulses, cap share and cell reading come unchanged from three-board-feedback-v1.mjs, which is not edited: completed runs pin its hash.
import { BOARD_IDS, CAP_KEEP, CIRCUITS, DAN_TYPES, ETA, LESSONS_PER_PASS, MAX_GAIN, MIN_GAIN, PASSES, VALENCE, capKept, dopamineSignal, kcReading, lessonLabels } from './three-board-feedback-v1.mjs';

export const OLD_SCALE = CIRCUITS.quiet.kcScale; // 0.014047
export const PULSES = ['none', 'reward', 'punish'];
export const MASK_EDGES = 6046;
const MICRO = 1e6; // scales are searched in steps of 0.000001

const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const median = xs => { const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const spread = xs => xs.length ? { min: Math.min(...xs), median: median(xs), max: Math.max(...xs) } : null;

// Graph machine. One forward per legal move and pulse, weights never changed. weightsDigest() fingerprints every weight the forward uses;
// it is compared before and after, so a capture that changed a weight fails instead of recording readings from a moved circuit.
export function captureReadings({ boards, forward, cells, danCells, scoreOf, weightsDigest, write, log = () => {} }) {
  const before = weightsDigest();
  let records = 0;
  for (const board of boards) {
    for (const move of board.legal) for (const pulse of PULSES) {
      const h = forward(board.fen, move, pulse === 'none' ? null : pulse);
      const { danMean, D } = dopamineSignal(h, danCells);
      write({ boardId: board.boardId, move, pulse, score: scoreOf(h), danMean, D, rates: Array.from(cells, j => Math.max(0, h[j])) });
      records++;
    }
    log(`${board.boardId}: ${board.legal.length} moves x ${PULSES.length} pulses recorded`);
  }
  const after = weightsDigest();
  if (after !== before) throw Error(`Connection weights changed during capture: ${before} before, ${after} after`);
  return { records, weightsDigestBefore: before, weightsDigestAfter: after, weightsUnchanged: true };
}

// Offline. Refuses a recording that is incomplete, unfinished, from another board packet, or whose mapping does not cover the learnable connections.
// Returns boardId -> { board (packet record), reading(move, pulse) }.
export function validateRecording({ manifest, summary, mapping, records, packet, expectedPacketHash, maskEdges = MASK_EDGES }) {
  const problems = [], fail = p => problems.push(p);
  if (manifest?.status !== 'complete') fail(`run status is ${manifest?.status ?? 'missing'}, not complete`);
  if (!Object.entries(manifest?.pins ?? {}).some(([path, hash]) => path.endsWith('boards.jsonl') && hash === expectedPacketHash)) fail('the run did not pin this board packet');
  if (summary?.weightsUnchanged !== true) fail('the summary does not confirm unchanged weights');
  if (summary?.records !== records.length) fail(`the summary lists ${summary?.records} records, the file holds ${records.length}`);
  const nCells = mapping?.weights?.length ?? 0;
  if (!mapping || ['edge', 'type', 'cell'].some(key => mapping[key]?.length !== maskEdges)) fail(`the mapping does not list ${maskEdges} learnable connections`);
  else {
    if (mapping.cells?.length !== nCells) fail('the mapping lists a different number of cells and cell weights');
    const count = new Array(nCells).fill(0);
    mapping.cell.forEach((k, i) => { if (Number.isInteger(k) && k >= 0 && k < nCells) count[k]++; else fail(`connection ${i} points to cell ${k}`); });
    if (count.some((c, k) => c !== mapping.weights[k])) fail('cell weights do not equal each cell\'s number of learnable connections');
    if (mapping.type.some(t => !VALENCE.has(t))) fail('a connection has an unknown output type');
  }
  const readings = new Map();
  for (const id of BOARD_IDS) {
    const board = packet.find(r => r.boardId === id);
    if (!board) { fail(`packet: board ${id} missing`); continue; }
    if (board.experiences.length !== LESSONS_PER_PASS) fail(`packet ${id}: ${board.experiences.length} lessons, expected ${LESSONS_PER_PASS}`);
    readings.set(id, { board, byKey: new Map() });
  }
  for (const r of records) {
    const entry = readings.get(r.boardId), key = `${r.move} ${r.pulse}`;
    if (!entry) { fail(`record for unexpected board ${r.boardId}`); continue; }
    if (!entry.board.legal.includes(r.move) || !PULSES.includes(r.pulse)) { fail(`${r.boardId}: unexpected record ${key}`); continue; }
    if (entry.byKey.has(key)) { fail(`${r.boardId}: ${key} recorded twice`); continue; }
    if (!Array.isArray(r.rates) || r.rates.length !== nCells || r.rates.some(x => !Number.isFinite(x) || x < 0)) fail(`${r.boardId} ${key}: rates missing, wrong length or invalid`);
    if ([...VALENCE.keys()].some(m => !Number.isFinite(r.D?.[m])) || DAN_TYPES.some(t => !Number.isFinite(r.danMean?.[t]))) fail(`${r.boardId} ${key}: feedback signals missing`);
    entry.byKey.set(key, r);
  }
  for (const [id, { board, byKey }] of readings) {
    const missing = board.legal.flatMap(m => PULSES.filter(p => !byKey.has(`${m} ${p}`)).map(p => `${m} ${p}`));
    if (missing.length) fail(`${id}: ${missing.length} readings missing (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', ...' : ''})`);
  }
  if (problems.length) throw Error(`Recording rejected:\n- ${problems.slice(0, 20).join('\n- ')}${problems.length > 20 ? `\n- and ${problems.length - 20} more` : ''}`);
  return new Map([...readings].map(([id, { board, byKey }]) => [id, { board, reading: (move, pulse) => byKey.get(`${move} ${pulse}`) }]));
}

// Smallest share of any comparison's difference that survives the cap; identical pairs are skipped, as in the probe.
export const worstKept = (pairs, weights, scale) => pairs.reduce((worst, { a, b }) => Math.min(worst, capKept(a, b, weights, scale) ?? 1), 1);
export const differingPairs = (pairs, weights) => pairs.filter(({ a, b }) => capKept(a, b, weights, Infinity) !== null);

// Smallest scale, in steps of 0.000001, at which every comparison keeps at least 99%. The kept share cannot fall as the scale rises,
// and at the largest reading nothing is capped (100% kept), so a binary search over whole steps finds the boundary.
// Also returns the share kept one step below it, so the boundary can be seen from both sides.
export function smallestPassingScale(pairs, weights) {
  pairs = differingPairs(pairs, weights);
  if (!pairs.length) return null;
  let top = 0;
  for (const { a, b } of pairs) for (let k = 0; k < weights.length; k++) top = Math.max(top, a[k], b[k]);
  let lo = 0, hi = Math.ceil(top * MICRO); // lo fails (nothing survives at 0), hi passes
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (worstKept(pairs, weights, mid / MICRO) >= CAP_KEEP) hi = mid; else lo = mid; }
  return { scale: hi / MICRO, worstKept: worstKept(pairs, weights, hi / MICRO), oneStepBelow: lo ? { scale: lo / MICRO, worstKept: worstKept(pairs, weights, lo / MICRO) } : null };
}

// The probe's cap comparisons with weights fixed: each lesson's pulsed rates against every legal move's rates with no pulse,
// and against the earlier lessons of the same pass. With weights fixed every pass repeats, so one pass gives all six.
export function protocolLessons(entry, condition) {
  const { board, reading } = entry, unpulsed = board.legal.map(m => reading(m, 'none').rates);
  const labels = lessonLabels(board.experiences, condition);
  return labels.map(({ move, label }, index) => {
    const rates = reading(move, label).rates;
    return { index, move, label, pairs: [...unpulsed, ...labels.slice(0, index).map(l => reading(l.move, l.label).rates)].map(b => ({ a: rates, b })) };
  });
}
export const samePulsePairs = ({ board, reading }, pulse) =>
  board.legal.flatMap((m, i) => board.legal.slice(i + 1).map(n => ({ a: reading(m, pulse).rates, b: reading(n, pulse).rates })));

// Replays the probe's update arithmetic over 6 passes of the board's lessons, using the fixed readings recorded for each lesson's move and pulse.
// The expression is the one in three-board-feedback-v1.mjs runBoard, so the arithmetic is the same; only the readings are held fixed.
export function replayGains(lessons, mapping, scale) {
  const gains = new Float64Array(mapping.edge.length).fill(1), byPass = [];
  let guardTrips = 0;
  for (let pass = 1; pass <= PASSES; pass++) {
    for (const { rates, D } of lessons) {
      if (Object.values(D).some(d => ETA * Math.abs(d) > 1)) guardTrips++;
      for (let i = 0; i < gains.length; i++) {
        const k = kcReading(rates[mapping.cell[i]], scale);
        gains[i] = Math.min(MAX_GAIN, Math.max(MIN_GAIN, gains[i] + ETA * D[mapping.type[i]] * (k + gains[i] - 1)));
      }
    }
    byPass.push(Float64Array.from(gains));
  }
  return { gains, byPass, guardTrips };
}
const changeOf = g => { const d = Array.from(g, x => Math.abs(x - 1)); return { meanAbsChange: avg(d), maxAbsChange: Math.max(...d), changed: d.filter(x => x > 0).length, atLimit: g.filter(x => x === MIN_GAIN || x === MAX_GAIN).length }; };
const divergenceOf = (a, b) => { const d = Array.from(a, (x, i) => Math.abs(x - b[i])); return { meanAbs: avg(d), maxAbs: Math.max(...d), rms: Math.sqrt(avg(d.map(x => x * x))), differing: d.filter(x => x > 0).length }; };

// The whole offline report. Scales replayed: the old one, each comparison set's smallest passing scale, and any extra scales asked for.
export function buildReport({ manifest, summary, mapping, records, packet, expectedPacketHash, maskEdges = MASK_EDGES, extraScales = [] }) {
  const boards = validateRecording({ manifest, summary, mapping, records, packet, expectedPacketHash, maskEdges });
  const { weights } = mapping, entries = BOARD_IDS.map(id => [id, boards.get(id)]);
  const weighted = (a, b) => weights.reduce((sum, w, k) => sum + w * Math.abs(a[k] - b[k]), 0); // edge-weighted summed rate difference
  const describe = pairs => { const live = differingPairs(pairs, weights), at = worstKept(live, weights, OLD_SCALE);
    return { comparisons: pairs.length, identical: pairs.length - live.length, atOldScale: { scale: OLD_SCALE, worstKept: at, failing: live.filter(p => capKept(p.a, p.b, weights, OLD_SCALE) < CAP_KEEP).length },
      smallestPassing: smallestPassingScale(live, weights) }; };

  // How much moves differ, with and without each pulse, and how far each pulse moves a move's own rates.
  const differences = entries.map(([boardId, entry]) => {
    const { board, reading } = entry, row = { boardId, moves: board.legal.length, betweenMoves: {}, pulseShift: {}, peakRate: {}, activeShareAtOldCap: {} };
    for (const pulse of PULSES) {
      row.betweenMoves[pulse] = spread(samePulsePairs(entry, pulse).map(p => weighted(p.a, p.b)));
      let active = 0, atCap = 0, peak = 0;
      for (const m of board.legal) reading(m, pulse).rates.forEach((r, k) => { peak = Math.max(peak, r); if (r > 0) { active += weights[k]; if (r >= OLD_SCALE) atCap += weights[k]; } });
      row.peakRate[pulse] = peak; row.activeShareAtOldCap[pulse] = active ? atCap / active : 0;
      if (pulse !== 'none') row.pulseShift[pulse] = spread(board.legal.map(m => weighted(reading(m, pulse).rates, reading(m, 'none').rates)));
    }
    return row;
  });

  // Comparison sets. Protocol: the probe's own cap check (correct labels are the learning-off run; swapped labels are that condition's first pass).
  // Same pulse: different moves receiving the same pulse; the no-pulse set is the original calibration.
  const sets = {};
  for (const condition of ['correct', 'swapped']) {
    const perBoard = entries.map(([boardId, entry]) => {
      const full = protocolLessons(entry, condition);
      const lessons = full.map(l => ({ index: l.index, move: l.move, label: l.label, worstKeptAtOldScale: worstKept(differingPairs(l.pairs, weights), weights, OLD_SCALE) }));
      return { boardId, lessons, all: describe(full.flatMap(l => l.pairs)) };
    });
    const failingLessons = perBoard.reduce((s, b) => s + b.lessons.filter(l => l.worstKeptAtOldScale < CAP_KEEP).length, 0) * PASSES;
    sets[`protocol, ${condition} labels`] = { kind: 'protocol', condition, lessons: BOARD_IDS.length * LESSONS_PER_PASS * PASSES, failingLessonsAtOldScale: failingLessons, ...combine(perBoard) };
  }
  for (const pulse of PULSES) sets[`same pulse: ${pulse}`] = { kind: 'same pulse', pulse, ...combine(entries.map(([boardId, entry]) => ({ boardId, all: describe(samePulsePairs(entry, pulse)) }))) };

  // Update replay at the old and candidate scales, for correct and swapped lessons, from the same fixed readings.
  const scales = [...new Set([OLD_SCALE, ...Object.values(sets).map(s => s.smallestPassing?.scale).filter(x => x != null), ...extraScales])].sort((a, b) => a - b);
  const replay = scales.map(scale => {
    const perBoard = entries.map(([boardId, entry]) => {
      const run = condition => replayGains(lessonLabels(entry.board.experiences, condition).map(({ move, label }) => entry.reading(move, label)), mapping, scale);
      const correct = run('correct'), swapped = run('swapped');
      // Share of a lesson's reading, over the learnable connections, that the pulse adds on top of the same move without a pulse.
      // A high share means updates follow the pulse more than the move, the pattern that lifted every move together before.
      const pulseShare = ({ move, label }) => {
        const pulsed = entry.reading(move, label).rates, unpulsed = entry.reading(move, 'none').rates;
        let added = 0, total = 0;
        for (const c of mapping.cell) { const k = kcReading(pulsed[c], scale); total += k; added += Math.max(0, k - kcReading(unpulsed[c], scale)); }
        return total ? added / total : 0;
      };
      return { boardId, correct: changeOf(correct.gains), swapped: changeOf(swapped.gains), divergence: divergenceOf(correct.gains, swapped.gains),
        divergenceByPass: correct.byPass.map((g, p) => divergenceOf(g, swapped.byPass[p]).meanAbs), guardTrips: correct.guardTrips + swapped.guardTrips,
        pulseShareOfReading: avg(lessonLabels(entry.board.experiences, 'correct').map(pulseShare)),
        lessonShareAtCap: capShare(lessonLabels(entry.board.experiences, 'correct').map(({ move, label }) => entry.reading(move, label).rates), weights, scale) };
    });
    const passes = Object.fromEntries(Object.entries(sets).map(([name, s]) => [name, worstKeptOverBoards(s, entries, scale, weights) >= CAP_KEEP]));
    return { scale, passes99: passes, boards: perBoard };
  });
  return { schema: 'pulse-scale-report-v1', oldScale: OLD_SCALE, keepRequired: CAP_KEEP, maskEdges: mapping.edge.length, learnableCells: weights.length,
    note: 'Readings were recorded with fixed weights. The replay estimates update size from those fixed readings; actual learning, where readings change as gains change, is not measured.',
    differences, sets, replay };
}
// Edge-weighted share of active readings at or above the scale. Zero means the scale caps nothing, so passing 99% is automatic there.
const capShare = (rateSets, weights, scale) => { let active = 0, atCap = 0;
  for (const rates of rateSets) rates.forEach((r, k) => { if (r > 0) { active += weights[k]; if (r >= scale) atCap += weights[k]; } });
  return active ? atCap / active : 0; };
// A set's result over all boards: worst kept at the old scale, total failing comparisons, and the smallest scale that passes every board.
function combine(perBoard) {
  const passing = perBoard.map(b => b.all.smallestPassing).filter(Boolean);
  const top = passing.reduce((best, s) => (s.scale > (best?.scale ?? -1) ? s : best), null);
  const total = key => perBoard.reduce((sum, b) => sum + b.all[key], 0);
  return { comparisons: total('comparisons'), identical: total('identical'),
    atOldScale: { scale: OLD_SCALE, worstKept: Math.min(...perBoard.map(b => b.all.atOldScale.worstKept)), failing: perBoard.reduce((sum, b) => sum + b.all.atOldScale.failing, 0) },
    // The boundary board sets the scale for the whole set; one step below, that board fails.
    smallestPassing: top && { ...top, boundaryBoard: perBoard.find(b => b.all.smallestPassing === top).boardId }, boards: perBoard };
}
function worstKeptOverBoards(set, entries, scale, weights) {
  const pairs = entries.flatMap(([, entry]) => set.kind === 'protocol' ? protocolLessons(entry, set.condition).flatMap(l => l.pairs) : samePulsePairs(entry, set.pulse));
  return worstKept(differingPairs(pairs, weights), weights, scale);
}
