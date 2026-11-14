// Three-board feedback test (documentation/design/neural-learning/three-board-feedback-test-2026-11-14.md).
// Shared by probe-wide-learning-v3.mjs (runs one circuit and condition) and apply-three-board-rules-v1.mjs (applies the fixed rules).
// The learning rule, pulses and modulation matrix are copied unchanged from probe-wide-learning-v2.mjs.
export const MIN_GAIN = 0.2, MAX_GAIN = 1.8, ACT = 1.5, ETA = 0.5, PULSE = 0.75, PASSES = 6, CAP_KEEP = 0.99;
export const BOARD_IDS = ['Q04sIPQ5:13', 'SjmcbcGu:16', '5XRGyGSj:13'];
export const CIRCUITS = { current: { bias: null, kcScale: null }, quiet: { bias: 0, kcScale: 0.014047 } }; // null bias: trainer default 0.01
export const CONDITIONS = ['correct', 'swapped', 'off'];
export const VALENCE = new Map([['MBON11', 1], ['MBON12', 1], ['MBON02', 1], ['MBON05', -1], ['MBON01', -1], ['MBON15', -1]]);
export const DAN_TYPES = ['PAM07', 'PAM02', 'PAM03', 'PPL101', 'PPL103'], REWARD_TYPES = ['PAM07', 'PAM02'], PUNISH_TYPES = ['PPL101', 'PPL103'];
export const W = { PAM07: { MBON05: -1 }, PPL101: { MBON11: -1 }, PAM02: { MBON01: -1, MBON02: 0.3 }, PPL103: { MBON12: -1 - 0.3, MBON15: 0.3 - 1 }, PAM03: { MBON02: -1, MBON01: -0.3 } };
export const RULES = { closure: 0.20, advantage: 0.20, overCurrent: 0.10, drop: 0.05, eligibleTolerances: 100 };

const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;

// Label delivered per lesson. Swapped reverses every label; learning off delivers the correct labels but never changes a gain.
export function lessonLabels(experiences, condition) {
  if (!CONDITIONS.includes(condition)) throw Error(`Unknown condition ${condition}`);
  return experiences.map(e => ({ move: e.move, label: (condition === 'swapped' ? !e.pulse : e.pulse) ? 'reward' : 'punish' }));
}

// How a Kenyon cell's rate enters the rule: current circuit rate / 1.5; quiet circuit min(1, rate / kcScale).
export const kcReading = (rate, kcScale) => kcScale === null ? Math.max(0, rate) / ACT : Math.min(1, Math.max(0, rate) / kcScale);

// Mean firing per dopamine type (rate / 1.5, as in v2) and the learning signal per output type.
export function dopamineSignal(h, danCells) {
  const danMean = Object.fromEntries(DAN_TYPES.map(t => [t, avg(danCells[t].map(j => Math.max(0, h[j]) / ACT))]));
  const D = Object.fromEntries([...VALENCE.keys()].map(m => [m, DAN_TYPES.reduce((sum, t) => sum + (W[t][m] ?? 0) * danMean[t], 0)]));
  return { danMean, D };
}

// Best safe capture and strongest rival (best move that is not a verified safe capture). gap > 0: the safe capture is behind.
export function rankMoves(scores, safeMoves) {
  const safe = new Set(safeMoves), list = Object.entries(scores).map(([move, score]) => ({ move, score }));
  const best = xs => xs.reduce((a, b) => (b.score > a.score ? b : a));
  const safeList = list.filter(s => safe.has(s.move)), otherList = list.filter(s => !safe.has(s.move));
  if (!safeList.length || !otherList.length) throw Error('Board needs a safe capture and another legal move');
  const bestSafe = best(safeList), rival = best(otherList), values = list.map(s => s.score);
  return { bestSafe, rival, gap: rival.score - bestSafe.score, above: list.filter(s => s.score > bestSafe.score).length,
    maxAbs: Math.max(...values.map(Math.abs)), range: Math.max(...values) - Math.min(...values) };
}

// Share of the edge-weighted rate difference between two moves that survives capping at scale; null when the rates are identical.
export function capKept(a, b, weights, scale) {
  let original = 0, kept = 0;
  for (let k = 0; k < weights.length; k++) {
    original += weights[k] * Math.abs(a[k] - b[k]);
    kept += weights[k] * Math.abs(Math.min(a[k], scale) - Math.min(b[k], scale));
  }
  return original === 0 ? null : kept / original;
}

// One board from a fresh memory state: 7 checkpoints (before teaching, then after each pass) and 24 lesson records.
// forward(fen, move, pulse) returns the endpoint state; pulse is 'reward', 'punish' or null. setMagnitude changes one learnable edge.
// mask[i] is an edge, maskType[i] its output type, maskPre[i] its presynaptic cell; cells/weights list distinct presynaptic cells and edge counts.
export function runBoard({ record, condition, kcScale, forward, setMagnitude, base, mask, maskType, maskPre, cells, weights, danCells, scoreOf, log = () => {} }) {
  const gains = new Float64Array(mask.length).fill(1);
  mask.forEach((e, i) => setMagnitude(e, base[i])); // fresh memory: every learnable edge back to its starting value
  const safeMoves = record.legal.filter(m => record.outcomes[m] === true);
  const ratesOf = h => Float64Array.from(cells, j => Math.max(0, h[j]));
  const before = new Map(); // move -> learnable-cell rates before teaching
  let rival = null, rivalRates = null;
  const checkpoint = pass => {
    const scores = {}, rates = new Map();
    for (const move of record.legal) { const h = forward(record.fen, move, null); scores[move] = scoreOf(h); rates.set(move, ratesOf(h)); }
    if (pass === 0) for (const [m, r] of rates) before.set(m, r);
    const ranked = rankMoves(scores, safeMoves);
    rival = ranked.rival.move; rivalRates = rates.get(rival);
    const gainsAtLimit = gains.filter(g => g === MIN_GAIN || g === MAX_GAIN).length;
    log(`${record.boardId} pass ${pass}: safe ${ranked.bestSafe.move} rival ${ranked.rival.move} gap ${ranked.gap.toExponential(4)} above ${ranked.above}`);
    return { pass, scores, ...ranked, gainsAtLimit, meanAbsGainDev: avg(Array.from(gains, g => Math.abs(g - 1))) };
  };
  const checkpoints = [checkpoint(0)], lessons = [];
  const labels = lessonLabels(record.experiences, condition);
  for (let pass = 1; pass <= PASSES; pass++) {
    const passRates = [];
    labels.forEach(({ move, label }, index) => {
      const h = forward(record.fen, move, label);
      const { danMean, D } = dopamineSignal(h, danCells);
      if (Object.values(D).some(d => ETA * Math.abs(d) > 1)) throw Error(`Teaching step exceeds bound on ${record.boardId} pass ${pass} lesson ${index}: ${JSON.stringify(D)}`); // checked before any change
      const rates = ratesOf(h);
      let cap = null;
      if (kcScale !== null) {
        const kept = [...before.values(), ...passRates].map(other => capKept(rates, other, weights, kcScale)).filter(x => x !== null);
        let active = 0, atCap = 0;
        const capped = [];
        rates.forEach((r, k) => { if (r > 0) { active += weights[k]; if (r >= kcScale) { atCap += weights[k]; capped.push(k); } } });
        cap = { worstKept: kept.length ? Math.min(...kept) : null, comparisons: kept.length, activeShareAtCap: active ? atCap / active : 0,
          cappedCells: capped.length, cappedCellsActiveInRival: capped.filter(k => rivalRates[k] > 0).length, rival };
      }
      passRates.push(rates);
      let changed = 0;
      if (condition !== 'off') mask.forEach((e, i) => {
        const k = kcReading(h[maskPre[i]], kcScale);
        const next = Math.min(MAX_GAIN, Math.max(MIN_GAIN, gains[i] + ETA * D[maskType[i]] * (k + gains[i] - 1)));
        if (next !== gains[i]) { changed++; gains[i] = next; setMagnitude(e, base[i] * next); }
      });
      lessons.push({ pass, index, move, label, danMean, D, changed, atLimit: gains.filter(g => g === MIN_GAIN || g === MAX_GAIN).length, cap });
    });
    checkpoints.push(checkpoint(pass));
  }
  return { boardId: record.boardId, safeMoves, experiences: record.experiences.map(e => ({ move: e.move, pulse: e.pulse })), checkpoints, lessons };
}

// Decision rules, fixed before data. results[circuit][condition] is a result.json object or { failed: reason };
// baseline is { boardId, scores: { move: score } } from the replay's valence-baseline/probe.json.
export function decide(results, baseline) {
  const failures = [];
  const fail = reason => failures.push(reason);
  for (const circuit of Object.keys(CIRCUITS)) for (const condition of CONDITIONS) {
    const r = results[circuit]?.[condition];
    if (!r || r.failed) { fail(`${circuit} ${condition}: run missing or failed${r?.failed ? ` (${r.failed})` : ''}`); continue; }
    if (r.circuit !== circuit || r.condition !== condition) fail(`${circuit} ${condition}: file says ${r.circuit} ${r.condition}`);
    if (JSON.stringify(r.boards.map(b => b.boardId)) !== JSON.stringify(BOARD_IDS)) fail(`${circuit} ${condition}: wrong boards`);
    for (const b of r.boards) {
      if (b.checkpoints.length !== PASSES + 1 || b.lessons.length !== PASSES * b.experiences.length) fail(`${circuit} ${condition} ${b.boardId}: incomplete record`);
      const labels = lessonLabels(b.experiences, condition);
      if (b.lessons.some(l => l.label !== labels[l.index].label || l.move !== labels[l.index].move)) fail(`${circuit} ${condition} ${b.boardId}: delivered labels do not match the condition`);
      // Check 2: the step-size guard (the probe stops on it; this rechecks the records).
      if (b.lessons.some(l => Object.values(l.D).some(d => ETA * Math.abs(d) > 1))) fail(`${circuit} ${condition} ${b.boardId}: a lesson exceeds the step-size guard`);
      // Check 1: learning off changes nothing.
      if (condition === 'off') {
        const start = b.checkpoints[0].scores;
        if (b.lessons.some(l => l.changed !== 0) || b.checkpoints.some(c => Object.keys(start).some(m => !Object.is(c.scores[m], start[m])))) fail(`${circuit} off ${b.boardId}: scores moved with learning off`);
      }
      // Check 3: the cap keeps at least 99% of every move difference during feedback.
      if (circuit === 'quiet' && b.lessons.some(l => !l.cap || (l.cap.worstKept !== null && l.cap.worstKept < CAP_KEEP))) fail(`quiet ${condition} ${b.boardId}: cap keeps under 99% of a move difference during feedback, or the cap record is missing`);
    }
  }
  if (failures.length) return { verdict: 'inconclusive', reason: 'a required check failed', failures, boards: [] };
  // Fresh start: the three conditions of a circuit begin from identical scores.
  for (const circuit of Object.keys(CIRCUITS)) BOARD_IDS.forEach((id, i) => {
    const s = CONDITIONS.map(c => results[circuit][c].boards[i].checkpoints[0].scores);
    if (s.some(x => Object.keys(s[0]).some(m => !Object.is(x[m], s[0][m])))) fail(`${circuit} ${id}: conditions do not start from the same scores`);
  });
  // Check 4: the current circuit reproduces the replay baseline exactly.
  const start = results.current.correct.boards.find(b => b.boardId === baseline.boardId)?.checkpoints[0].scores ?? {};
  for (const [move, score] of Object.entries(baseline.scores)) if (!Object.is(start[move], score)) fail(`current ${baseline.boardId}: ${move} starts at ${start[move]}, baseline ${score}`);
  if (failures.length) return { verdict: 'inconclusive', reason: 'a required check failed', failures, boards: [] };

  const boards = BOARD_IDS.map((boardId, i) => {
    const row = { boardId };
    for (const circuit of Object.keys(CIRCUITS)) {
      const of = c => results[circuit][c].boards[i], first = of('correct').checkpoints[0];
      const tolerance = 1e-9 + 1e-7 * first.maxAbs, eligible = first.gap >= RULES.eligibleTolerances * tolerance;
      const conditions = Object.fromEntries(CONDITIONS.map(c => {
        const cps = of(c).checkpoints, a = cps[0], z = cps[PASSES];
        return [c, { closure: (a.gap - z.gap) / a.gap, closureByPass: cps.map(cp => (a.gap - cp.gap) / a.gap),
          safe: { from: a.bestSafe, to: z.bestSafe, change: z.bestSafe.score - a.bestSafe.score },
          rival: { from: a.rival, to: z.rival, change: z.rival.score - a.rival.score }, gapChange: z.gap - a.gap, safeOnTop: z.above === 0 }];
      }));
      row[circuit] = { gap: first.gap, tolerance, eligible, gapShareOfRange: first.gap / first.range, movesAboveSafe: first.above,
        conditions, advantage: conditions.correct.closure - conditions.swapped.closure };
    }
    row.eligibleInBoth = row.current.eligible && row.quiet.eligible;
    row.expandPass = row.eligibleInBoth && row.quiet.conditions.correct.closure >= RULES.closure && row.quiet.advantage >= RULES.advantage
      && row.quiet.advantage - row.current.advantage >= RULES.overCurrent;
    return row;
  });
  const both = boards.filter(b => b.eligibleInBoth), quietEligible = boards.filter(b => b.quiet.eligible);
  if (both.length < 2) return { verdict: 'inconclusive', reason: `only ${both.length} board(s) qualify in both circuits; at least 2 are needed`, failures, boards };
  if (boards.filter(b => b.expandPass).length >= 2) return { verdict: 'expand to 12 boards', reason: `${boards.filter(b => b.expandPass).length} boards meet all three expansion cutoffs`, failures, boards };
  if (quietEligible.every(b => b.quiet.advantage < RULES.drop)) return { verdict: 'drop the quiet, rescaled circuit', reason: 'the quiet circuit beats swapped labels by under 5 points on every board that qualifies in it', failures, boards };
  return { verdict: 'inconclusive', reason: 'the result falls between the expansion and drop cutoffs', failures, boards };
}
