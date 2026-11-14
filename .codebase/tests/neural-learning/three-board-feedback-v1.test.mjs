import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { BOARD_IDS, CAP_KEEP, CIRCUITS, CONDITIONS, PASSES, capKept, decide, kcReading, lessonLabels, rankMoves, runBoard } from '../../src/neural-learning/three-board-feedback-v1.mjs';

// Tiny circuit: three Kenyon cells (0-2), MBON11 (3, attraction), MBON05 (4, avoidance), one cell per dopamine type (5-9).
// Learnable edges: KC0 and KC1 onto MBON11, KC0 and KC2 onto MBON05. Each move drives the Kenyon cells differently.
const KC_DRIVE = { a: [0.012, 0.004, 0.001], b: [0.006, 0.010, 0.002], c: [0.002, 0.001, 0.016] };
const DAN = { PAM07: [5], PAM02: [6], PAM03: [7], PPL101: [8], PPL103: [9] };
function tinySetup({ pulseCurrent = 0.75, saturation = 1.5 } = {}) {
  const incoming = [[], [], [], [0, 1], [0, 2], [], [], [], [], []], row = [0], col = [];
  for (const sources of incoming) { col.push(...sources); row.push(col.length); }
  const graph = { row: Int32Array.from(row), col: Int32Array.from(col), sign: Int8Array.from(col, () => 1), initial: Float32Array.from(col, () => 1),
    input: Int32Array.from([0]), output: Int32Array.from([4]) };
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, saturation });
  model.params.bias.fill(0);
  const mask = [0, 1, 2, 3], maskType = ['MBON11', 'MBON11', 'MBON05', 'MBON05'], maskPre = [0, 1, 0, 2];
  const pulses = { reward: [5, 6], punish: [8, 9] };
  const forward = (fen, move, pulse) => {
    model.forward(new Float32Array(1), [...KC_DRIVE[move].map((current, index) => ({ index, current })), ...(pulse ? pulses[pulse].map(index => ({ index, current: pulseCurrent })) : [])], null);
    return model.h[model.steps];
  };
  const record = { boardId: 'tiny', fen: 'unused', legal: ['a', 'b', 'c'], outcomes: { a: true, b: false, c: false },
    experiences: [{ move: 'a', pulse: true }, { move: 'a', pulse: true }, { move: 'c', pulse: false }, { move: 'c', pulse: false }] };
  const options = { record, forward, setMagnitude: (e, v) => model.setMagnitude(e, v), base: Float64Array.from(mask, e => model.params.magnitude[e]),
    mask, maskType, maskPre, cells: [0, 1, 2], weights: [2, 1, 1], danCells: DAN, scoreOf: h => h[3] - h[4] };
  return { model, options };
}

test('lesson labels: swapped reverses every label, learning off keeps the correct ones', () => {
  const exp = [{ move: 'a', pulse: true }, { move: 'c', pulse: false }];
  assert.deepEqual(lessonLabels(exp, 'correct').map(l => l.label), ['reward', 'punish']);
  assert.deepEqual(lessonLabels(exp, 'swapped').map(l => l.label), ['punish', 'reward']);
  assert.deepEqual(lessonLabels(exp, 'off').map(l => l.label), ['reward', 'punish']);
  assert.throws(() => lessonLabels(exp, 'absent'));
});

test('cell reading: current circuit divides by 1.5, quiet circuit divides by the scale and caps at 1', () => {
  assert.equal(kcReading(0.75, null), 0.5);
  assert.equal(kcReading(-1, null), 0);
  assert.equal(kcReading(0.007, 0.014), 0.5);
  assert.equal(kcReading(0.02, 0.014), 1);
});

test('cap share: only differences above the cap are lost, edge-weighted', () => {
  assert.equal(capKept([0.01, 0.002], [0.003, 0.002], [2, 1], 0.014), 1);
  assert.equal(capKept([0.02, 0.002], [0.01, 0.002], [1, 1], 0.014), 0.4); // 0.004 of 0.01 survives
  assert.equal(capKept([0.01], [0.01], [3], 0.014), null);
});

test('ranking: gap is rival minus best safe capture; ties count nothing above', () => {
  const r = rankMoves({ a: 1, b: 3, c: 2, d: 0.5 }, ['a', 'd']);
  assert.equal(r.bestSafe.move, 'a'); assert.equal(r.rival.move, 'b'); assert.equal(r.gap, 2); assert.equal(r.above, 2); assert.equal(r.range, 2.5);
});

test('learning off: same lessons and pulses, no gain changes, scores bit-identical at every checkpoint', () => {
  const { options } = tinySetup();
  const board = runBoard({ ...options, condition: 'off', kcScale: 0.014047 });
  assert.equal(board.checkpoints.length, PASSES + 1); assert.equal(board.lessons.length, PASSES * 4);
  for (const cp of board.checkpoints) assert.deepEqual(cp.scores, board.checkpoints[0].scores);
  assert(board.lessons.every(l => l.changed === 0));
  const reward = board.lessons.find(l => l.label === 'reward'), punish = board.lessons.find(l => l.label === 'punish');
  assert(reward.danMean.PAM07 > 0 && reward.danMean.PPL101 === 0, 'reward pulse reaches the reward cells only');
  assert(punish.danMean.PPL101 > 0 && punish.danMean.PAM07 === 0, 'punishment pulse reaches the punishment cells only');
  assert(reward.D.MBON05 < 0 && punish.D.MBON11 < 0);
});

test('correct and swapped lessons change gains; swapped delivers the opposite pulse on the same moves', () => {
  const { options } = tinySetup();
  const correct = runBoard({ ...options, condition: 'correct', kcScale: 0.014047 });
  const swapped = runBoard({ ...options, condition: 'swapped', kcScale: 0.014047 });
  assert.deepEqual(swapped.lessons.map(l => l.move), correct.lessons.map(l => l.move));
  assert(swapped.lessons.every((l, i) => l.label !== correct.lessons[i].label));
  assert(correct.lessons.some(l => l.changed > 0) && swapped.lessons.some(l => l.changed > 0));
  assert.notDeepEqual(correct.checkpoints[PASSES].scores, correct.checkpoints[0].scores);
  assert.notDeepEqual(correct.checkpoints[PASSES].scores, swapped.checkpoints[PASSES].scores);
});

test('fresh memory: every board starts from the same scores even after another board was taught', () => {
  const { model, options } = tinySetup();
  const untouched = Float32Array.from(model.params.magnitude);
  const first = runBoard({ ...options, condition: 'correct', kcScale: null });
  assert.notDeepEqual(Float32Array.from(model.params.magnitude), untouched, 'teaching changed the gains');
  const second = runBoard({ ...options, condition: 'correct', kcScale: null });
  assert.deepEqual(second.checkpoints[0].scores, first.checkpoints[0].scores);
  assert.deepEqual(second.checkpoints, first.checkpoints);
});

test('cap record: a scale below the strongest rate caps a cell and loses part of a move difference', () => {
  const { options } = tinySetup();
  const peak = Math.max(...Object.values(KC_DRIVE).flat());
  const tight = runBoard({ ...options, condition: 'off', kcScale: peak / 4 });
  assert(tight.lessons.some(l => l.cap.cappedCells > 0 && l.cap.worstKept < CAP_KEEP));
  const loose = runBoard({ ...options, condition: 'off', kcScale: 10 });
  assert(loose.lessons.every(l => l.cap.cappedCells === 0 && l.cap.worstKept === 1 && l.cap.comparisons > 0));
  const current = runBoard({ ...options, condition: 'off', kcScale: null });
  assert(current.lessons.every(l => l.cap === null), 'the current circuit has no cap');
});

test('step-size guard stops the board before any change', () => {
  const { model, options } = tinySetup({ pulseCurrent: 40, saturation: 10 }) // at saturation 1.5 a dopamine mean is at most 1, so the guard cannot trip;
  const before = Float32Array.from(model.params.magnitude);
  assert.throws(() => runBoard({ ...options, condition: 'correct', kcScale: null }), /Teaching step exceeds bound/);
  assert.deepEqual(Float32Array.from(model.params.magnitude), before);
});

// Synthetic result files for the decision rules. Each board has one safe capture (f6e4) and one rival (b8d7).
// The rival stays at 0.004; the safe capture rises so the gap closes by the given share after 6 passes.
const BASE_SCORE = 0.004;
function syntheticBoard(gap, closure, condition, circuit) {
  const experiences = [{ move: 'f6e4', pulse: true }, { move: 'f6e4', pulse: true }, { move: 'b8d7', pulse: false }, { move: 'b8d7', pulse: false }];
  const checkpoints = Array.from({ length: PASSES + 1 }, (_, pass) => {
    const share = condition === 'off' ? 0 : closure * pass / PASSES;
    const scores = { f6e4: BASE_SCORE - gap + gap * share, b8d7: BASE_SCORE };
    return { pass, scores, ...rankMoves(scores, ['f6e4']) };
  });
  const lessons = [];
  for (let pass = 1; pass <= PASSES; pass++) lessonLabels(experiences, condition).forEach(({ move, label }, index) => lessons.push({ pass, index, move, label,
    danMean: {}, D: { MBON05: -0.2 }, changed: condition === 'off' ? 0 : 1, atLimit: 0, cap: circuit === 'quiet' ? { worstKept: 1, comparisons: 3 } : null }));
  return { safeMoves: ['f6e4'], experiences, checkpoints, lessons };
}
// spec[circuit] = [{ gap, correct, swapped }, ...] for the three boards; closures as shares.
function syntheticResults(spec) {
  const results = {};
  for (const circuit of Object.keys(CIRCUITS)) {
    results[circuit] = {};
    for (const condition of CONDITIONS) results[circuit][condition] = { circuit, condition,
      boards: BOARD_IDS.map((boardId, i) => ({ boardId, ...syntheticBoard(spec[circuit][i].gap, spec[circuit][i][condition] ?? 0, condition, circuit) })) };
  }
  const first = results.current.correct.boards[0].checkpoints[0].scores;
  // The verified board packet: the probe copies each board's lessons from it, and the rules check the runs against it.
  const packet = BOARD_IDS.map(boardId => ({ boardId, legal: ['f6e4', 'b8d7'], outcomes: { f6e4: true, b8d7: false }, experiences: results.current.correct.boards[0].experiences.map(e => ({ ...e })) }));
  return { results, baseline: { boardId: BOARD_IDS[0], scores: { f6e4: first.f6e4, b8d7: first.b8d7 } }, packet };
}
const boards = (gap, correct, swapped) => [0, 1, 2].map(() => ({ gap, correct, swapped }));
const SMALL = 1e-8, LARGE = 1e-5; // tie tolerance here is about 1.4e-9, so the cutoff is about 1.4e-7

test('verdict: expand when the quiet circuit clears all three cutoffs on at least 2 boards that qualify in both circuits', () => {
  const { results, baseline, packet } = syntheticResults({ current: boards(LARGE, 0.05, 0.00), quiet: boards(LARGE, 0.50, 0.10) });
  const d = decide(results, baseline, packet);
  assert.equal(d.verdict, 'expand to 12 boards');
  assert(Math.abs(d.boards[0].quiet.advantage - 0.40) < 1e-9 && Math.abs(d.boards[0].current.advantage - 0.05) < 1e-9);
});

test('verdict: drop when the quiet circuit beats swapped by under 5 points on every board that qualifies in it', () => {
  const { results, baseline, packet } = syntheticResults({ current: boards(LARGE, 0.02, 0.00), quiet: boards(LARGE, 0.04, 0.01) });
  assert.equal(decide(results, baseline, packet).verdict, 'drop the quiet, rescaled circuit');
});

test('verdict: inconclusive when the result falls between the cutoffs', () => {
  // Quiet advantage 10 points: above the 5-point drop line, below the 20-point expansion line.
  const { results, baseline, packet } = syntheticResults({ current: boards(LARGE, 0.02, 0.00), quiet: boards(LARGE, 0.15, 0.05) });
  const d = decide(results, baseline, packet);
  assert.equal(d.verdict, 'inconclusive'); assert.match(d.reason, /between/);
});

test('verdict: one board qualifying in both circuits is inconclusive, even when the quiet circuit would expand or drop', () => {
  const current = [{ gap: LARGE, correct: 0.05, swapped: 0 }, { gap: SMALL, correct: 0, swapped: 0 }, { gap: SMALL, correct: 0, swapped: 0 }];
  const wouldExpand = decide(...Object.values(syntheticResults({ current, quiet: boards(LARGE, 0.50, 0.10) })));
  assert.equal(wouldExpand.verdict, 'inconclusive'); assert.match(wouldExpand.reason, /only 1 board/);
  assert.deepEqual(wouldExpand.boards.map(b => b.eligibleInBoth), [true, false, false]);
  // Under the 2026-11-14 draft this case read as "drop" (the drop rule only needed 2 boards in the quiet circuit). It is now inconclusive.
  const wouldDrop = decide(...Object.values(syntheticResults({ current, quiet: boards(LARGE, 0.03, 0.01) })));
  assert.equal(wouldDrop.verdict, 'inconclusive'); assert.match(wouldDrop.reason, /only 1 board/);
});

test('verdict: two boards qualifying in both circuits is enough to decide', () => {
  const current = [{ gap: LARGE, correct: 0.05, swapped: 0 }, { gap: LARGE, correct: 0.05, swapped: 0 }, { gap: SMALL, correct: 0, swapped: 0 }];
  assert.equal(decide(...Object.values(syntheticResults({ current, quiet: boards(LARGE, 0.50, 0.10) }))).verdict, 'expand to 12 boards');
});

test('verdict: expansion needs the quiet advantage to beat the current advantage by 10 points', () => {
  // Quiet advantage 40 points, current 35: rules (a) and (b) pass, (c) fails; 40 is above the drop line, so inconclusive.
  const d = decide(...Object.values(syntheticResults({ current: boards(LARGE, 0.40, 0.05), quiet: boards(LARGE, 0.50, 0.10) })));
  assert.equal(d.verdict, 'inconclusive'); assert(d.boards.every(b => !b.expandPass));
});

test('verdict: any failed required check makes the result inconclusive before the thresholds are read', () => {
  const expand = () => syntheticResults({ current: boards(LARGE, 0.05, 0.00), quiet: boards(LARGE, 0.50, 0.10) });
  const cases = {
    'a missing run': ({ results }) => { results.quiet.swapped = { failed: 'status failed: Teaching step exceeds bound' }; },
    'scores moving with learning off': ({ results }) => { results.quiet.off.boards[1].checkpoints[3].scores.f6e4 += 1e-12; },
    'the cap losing more than 1% during feedback': ({ results }) => { results.quiet.correct.boards[2].lessons[5].cap.worstKept = 0.985; },
    'a lesson over the step-size guard': ({ results }) => { results.current.correct.boards[0].lessons[0].D.MBON05 = -2.1; },
    'a wrong label': ({ results }) => { results.current.swapped.boards[0].lessons[0].label = 'reward'; },
    'the baseline not reproducing': ({ baseline }) => { baseline.scores.f6e4 += 1e-15; },
    'conditions starting from different scores': ({ results }) => { results.quiet.swapped.boards[0].checkpoints[0].scores.b8d7 += 1e-12; },
    'safe captures differing from the packet': ({ results }) => { results.current.off.boards[2].safeMoves = ['b8d7']; },
    'a checkpoint missing a legal move': ({ results }) => { delete results.current.correct.boards[1].checkpoints[4].scores.b8d7; },
    'checkpoints out of order': ({ results }) => { const c = results.quiet.correct.boards[0].checkpoints; [c[2], c[3]] = [c[3], c[2]]; },
  };
  for (const [name, breakIt] of Object.entries(cases)) {
    const input = expand(); breakIt(input);
    const d = decide(input.results, input.baseline, input.packet);
    assert.equal(d.verdict, 'inconclusive', name); assert.equal(d.reason, 'a required check failed', name); assert(d.failures.length > 0, name);
  }
});

// Exact cutoffs. G is the real first board's starting gap; with it, scores built to land exactly on a cutoff round a hair to the
// wrong side (20% computes as 0.19999999999994725). At a cutoff, "at least" is met and "under" is not.
const G = 6.5776e-6, ZERO = { gap: G, correct: 0, swapped: 0 };
const verdictFor = (quiet, current = ZERO) => decide(...Object.values(syntheticResults({ current: [0, 1, 2].map(() => current), quiet: [0, 1, 2].map(() => quiet) })));
const EXPAND = 'expand to 12 boards', DROP = 'drop the quiet, rescaled circuit', OPEN = 'inconclusive';

test('cutoff (a): closure of exactly 20% with correct lessons meets the requirement', () => {
  const at = verdictFor({ gap: G, correct: 0.20, swapped: -0.10 });
  assert(at.boards[0].quiet.conditions.correct.closure < 0.20, 'the computed value rounds below 20%');
  assert.equal(at.verdict, EXPAND);
  assert.equal(verdictFor({ gap: G, correct: 0.19, swapped: -0.10 }).verdict, OPEN);
  assert.equal(verdictFor({ gap: G, correct: 0.21, swapped: -0.10 }).verdict, EXPAND);
});

test('cutoff (b): an advantage of exactly 20 points over swapped meets the requirement', () => {
  const at = verdictFor({ gap: G, correct: 0.50, swapped: 0.30 });
  assert(at.boards[0].quiet.advantage < 0.20, 'the computed value rounds below 20 points');
  assert.equal(at.verdict, EXPAND);
  assert.equal(verdictFor({ gap: G, correct: 0.50, swapped: 0.31 }).verdict, OPEN);
  assert.equal(verdictFor({ gap: G, correct: 0.50, swapped: 0.29 }).verdict, EXPAND);
});

test('cutoff (c): exactly 10 points more advantage than the current circuit meets the requirement', () => {
  const quiet = { gap: G, correct: 0.50, swapped: 0.20 };
  const at = verdictFor(quiet, { gap: G, correct: 0.30, swapped: 0.10 });
  assert(at.boards[0].quiet.advantage - at.boards[0].current.advantage < 0.10, 'the computed value rounds below 10 points');
  assert.equal(at.verdict, EXPAND);
  assert.equal(verdictFor(quiet, { gap: G, correct: 0.31, swapped: 0.10 }).verdict, OPEN);
  assert.equal(verdictFor(quiet, { gap: G, correct: 0.29, swapped: 0.10 }).verdict, EXPAND);
});

test('drop cutoff: an advantage of exactly 5 points over swapped does not count as under 5', () => {
  const at = verdictFor({ gap: G, correct: 0.05, swapped: 0 });
  assert(at.boards[0].quiet.advantage < 0.05, 'the computed value rounds below 5 points');
  assert.equal(at.verdict, OPEN);
  assert.equal(verdictFor({ gap: G, correct: 0.04, swapped: 0 }).verdict, DROP);
  assert.equal(verdictFor({ gap: G, correct: 0.06, swapped: 0 }).verdict, OPEN);
});

// Lesson records are checked against the packet: four lessons per pass, six passes, in order, with the condition's labels.
const expandInput = () => syntheticResults({ current: boards(LARGE, 0.05, 0.00), quiet: boards(LARGE, 0.50, 0.10) });
const lessonVerdict = breakIt => { const input = expandInput(); breakIt(input.results); return decide(input.results, input.baseline, input.packet); };

test('lessons: a run that records one lesson per pass (6 in all) is inconclusive, not expand', () => {
  const d = lessonVerdict(results => {
    const b = results.quiet.correct.boards[0];
    b.experiences = b.experiences.slice(0, 1); // the run's own lesson list agrees with its 6 records
    b.lessons = b.lessons.filter(l => l.index === 0);
  });
  assert.equal(d.verdict, OPEN); assert.match(d.failures.join('\n'), /6 recorded, 24 expected/);
});

test('lessons: 24 records where a repeated lesson hides a missing one are inconclusive', () => {
  const d = lessonVerdict(results => {
    const lessons = results.quiet.correct.boards[1].lessons, k = 2 * 4 + 2; // pass 3, third lesson
    lessons[k] = { ...lessons[k - 1] };
  });
  assert.equal(d.verdict, OPEN); assert.match(d.failures.join('\n'), /missing, repeated, out of order/);
  assert.match(d.failures.join('\n'), /24 recorded, 24 expected/);
});

test('lessons: two lessons swapped within a pass are inconclusive', () => {
  const d = lessonVerdict(results => { const l = results.current.swapped.boards[2].lessons; [l[5], l[6]] = [l[6], l[5]]; });
  assert.equal(d.verdict, OPEN); assert.match(d.failures.join('\n'), /current swapped 5XRGyGSj:13/);
});

test('lessons: an extra lesson or a short packet is inconclusive', () => {
  assert.equal(lessonVerdict(results => { const l = results.quiet.off.boards[0].lessons; l.push({ ...l.at(-1) }); }).verdict, OPEN);
  const input = expandInput(); input.packet[1].experiences.pop();
  assert.match(decide(input.results, input.baseline, input.packet).failures.join('\n'), /3 lessons, expected 4/);
});
