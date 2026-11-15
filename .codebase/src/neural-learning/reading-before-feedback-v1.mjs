// Three-board test with the reading before feedback (documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md).
// Shared by probe-wide-learning-v4.mjs (runs one circuit and condition) and apply-three-board-rules-v2.mjs (applies the fixed rules).
// Circuits, pulses, matrix, learning step, gain limits, cap check and cutoffs are those of three-board-feedback-v1.mjs, which is not edited:
// completed runs pin its hash. One change: every lesson is two forward passes of the lesson move. The first has no pulse, and its Kenyon-cell
// rates are the reading before feedback. The second delivers the pulse, and only its dopamine signal enters the rule.
import { createHash } from 'node:crypto';
import { CAP_KEEP, ETA, MAX_GAIN, MIN_GAIN, PASSES, PUNISH_TYPES, REWARD_TYPES, capKept, decide as decideV1, dopamineSignal, kcReading, lessonLabels, rankMoves } from './three-board-feedback-v1.mjs';

export const RULE = 'reading before feedback';
export const PULSED_TYPES = { reward: REWARD_TYPES, punish: PUNISH_TYPES };
export const digestOf = a => createHash('sha256').update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;

// One board from a fresh memory state: 7 checkpoints and 24 lessons of two forward passes each. Arguments as in three-board-feedback-v1.mjs runBoard.
// forward() returns a buffer the next forward overwrites, so everything a lesson needs from its first pass is copied before the second.
export function runBoard({ record, condition, kcScale, forward, setMagnitude, base, mask, maskType, maskPre, cells, weights, danCells, scoreOf, log = () => {} }) {
  const gains = new Float64Array(mask.length).fill(1);
  mask.forEach((e, i) => setMagnitude(e, base[i])); // fresh memory: every learnable edge back to its starting value
  const safeMoves = record.legal.filter(m => record.outcomes[m] === true);
  const ratesOf = h => Float64Array.from(cells, j => Math.max(0, h[j]));
  let forwardCount = 0; // forward passes so far on this board; a lesson's two passes must be consecutive
  const run = (move, pulse) => { forwardCount++; return forward(record.fen, move, pulse); };
  const before = new Map(); // move -> learnable-cell rates before teaching
  let rival = null, rivalRates = null;
  const checkpoint = pass => {
    const scores = {}, readingDigests = {}, rates = new Map();
    for (const move of record.legal) { const h = run(move, null); scores[move] = scoreOf(h); const r = ratesOf(h); rates.set(move, r); readingDigests[move] = digestOf(r); }
    if (pass === 0) for (const [m, r] of rates) before.set(m, r);
    const ranked = rankMoves(scores, safeMoves);
    rival = ranked.rival.move; rivalRates = rates.get(rival);
    log(`${record.boardId} pass ${pass}: safe ${ranked.bestSafe.move} rival ${ranked.rival.move} gap ${ranked.gap.toExponential(4)} above ${ranked.above}`);
    return { pass, scores, readingDigests, ...ranked, gainsAtLimit: gains.filter(g => g === MIN_GAIN || g === MAX_GAIN).length, meanAbsGainDev: avg(Array.from(gains, g => Math.abs(g - 1))) };
  };
  const checkpoints = [checkpoint(0)], lessons = [];
  const labels = lessonLabels(record.experiences, condition);
  for (let pass = 1; pass <= PASSES; pass++) {
    const passReadings = [];
    labels.forEach(({ move, label }, index) => {
      // First pass, no pulse: the reading before feedback.
      const hBefore = run(move, null);
      const rates = ratesOf(hBefore), reading = Float64Array.from(maskPre, j => kcReading(hBefore[j], kcScale));
      const beforeFeedback = { forwardCount, pulse: null, score: scoreOf(hBefore), danMean: dopamineSignal(hBefore, danCells).danMean, readingDigest: digestOf(rates), gainsDigest: digestOf(gains) };
      // Second pass, the lesson's pulse: the learning signal.
      const { danMean, D } = dopamineSignal(run(move, label), danCells);
      const feedback = { forwardCount, pulse: label, gainsDigest: digestOf(gains) };
      if (Object.values(D).some(d => ETA * Math.abs(d) > 1)) throw Error(`Teaching step exceeds bound on ${record.boardId} pass ${pass} lesson ${index}: ${JSON.stringify(D)}`); // checked before any change
      let cap = null;
      if (kcScale !== null) { // the cap check of v1, applied to the reading the rule uses
        const kept = [...before.values(), ...passReadings].map(other => capKept(rates, other, weights, kcScale)).filter(x => x !== null);
        let active = 0, atCap = 0;
        const capped = [];
        rates.forEach((r, k) => { if (r > 0) { active += weights[k]; if (r >= kcScale) { atCap += weights[k]; capped.push(k); } } });
        cap = { reading: RULE, worstKept: kept.length ? Math.min(...kept) : null, comparisons: kept.length, activeShareAtCap: active ? atCap / active : 0,
          cappedCells: capped.length, cappedCellsActiveInRival: capped.filter(k => rivalRates[k] > 0).length, rival };
      }
      passReadings.push(rates);
      let changed = 0;
      if (condition !== 'off') mask.forEach((e, i) => {
        const next = Math.min(MAX_GAIN, Math.max(MIN_GAIN, gains[i] + ETA * D[maskType[i]] * (reading[i] + gains[i] - 1)));
        if (next !== gains[i]) { changed++; gains[i] = next; setMagnitude(e, base[i] * next); }
      });
      lessons.push({ pass, index, move, label, danMean, D, changed, atLimit: gains.filter(g => g === MIN_GAIN || g === MAX_GAIN).length, cap, beforeFeedback, feedback });
    });
    checkpoints.push(checkpoint(pass));
  }
  return { boardId: record.boardId, safeMoves, experiences: record.experiences.map(e => ({ move: e.move, pulse: e.pulse })), checkpoints, lessons };
}

// The required checks this rule adds (5 extended, 3 revised, 6 and 7 new), then every check and verdict of three-board-feedback-v1.mjs decide.
export function decide(results, baseline, packet) {
  const failures = [], fail = reason => failures.push(reason);
  for (const [circuit, byCondition] of Object.entries(results)) for (const [condition, r] of Object.entries(byCondition)) {
    if (!r || r.failed || !Array.isArray(r.boards)) continue; // a missing or failed run is reported by the v1 checks
    // Check 5, extended: the run used this rule.
    if (r.rule !== RULE) fail(`${circuit} ${condition}: file says rule ${r.rule ?? 'missing'}, not ${RULE}`);
    for (const b of r.boards) {
      const name = `${circuit} ${condition} ${b.boardId}`, cps = b.checkpoints ?? [];
      for (const l of b.lessons ?? []) {
        const at = `${name} pass ${l.pass} lesson ${l.index}`, bf = l.beforeFeedback, fb = l.feedback;
        // Check 6: a fresh, pulse-free reading of the lesson move, taken immediately before its pulse.
        if (!bf || !fb || bf.pulse !== null || fb.pulse !== l.label) { fail(`${at}: reading before feedback missing, pulsed, or not followed by the lesson's pulse`); continue; }
        if (fb.forwardCount !== bf.forwardCount + 1) fail(`${at}: another forward pass ran between the reading and the pulse`);
        if (bf.gainsDigest !== fb.gainsDigest) fail(`${at}: gains changed between the reading and the pulse`);
        // The first lesson of a pass follows a checkpoint with no change in between; with learning off nothing ever changes.
        const ref = condition === 'off' ? cps[0] : l.index === 0 ? cps[l.pass - 1] : null;
        if (ref && ref.readingDigests?.[l.move] !== bf.readingDigest) fail(`${at}: reading before feedback differs from ${l.move}'s reading at checkpoint ${ref.pass}`);
        // Check 7: the pulse raises its own dopamine types above the reading pass.
        for (const t of PULSED_TYPES[l.label] ?? []) if (!(l.danMean?.[t] > bf.danMean?.[t])) fail(`${at}: the ${l.label} pulse did not raise ${t} above the reading pass`);
        // Check 3, revised: the cap keeps at least 99% of every move difference in the reading the rule uses.
        if (circuit === 'quiet' && (l.cap?.reading !== RULE || (l.cap.worstKept !== null && !(l.cap.worstKept >= CAP_KEEP))))
          fail(`${at}: the cap keeps under 99% of a move difference in the reading before feedback, or the cap record is missing`);
      }
    }
  }
  const v1 = decideV1(results, baseline, packet);
  if (failures.length) return { verdict: 'inconclusive', reason: 'a required check failed', failures: [...failures, ...v1.failures], boards: [] };
  return v1;
}
