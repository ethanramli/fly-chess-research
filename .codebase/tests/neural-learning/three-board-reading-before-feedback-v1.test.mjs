import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { BOARD_IDS, CAP_KEEP, CIRCUITS, CONDITIONS, ETA, MAX_GAIN, MIN_GAIN, PASSES, dopamineSignal, kcReading, lessonLabels, rankMoves, runBoard as runBoardV1 } from '../../src/neural-learning/three-board-feedback-v1.mjs';
import { RULE, decide, runBoard } from '../../src/neural-learning/reading-before-feedback-v1.mjs';

// Tiny circuit: Kenyon cells 0-2, MBON11 (3, attraction), MBON05 (4, avoidance), one cell per dopamine type (5-9).
// Unlike the v1 test circuit, the PAM07 cell (5) excites Kenyon cell 1, so a reward pulse changes a Kenyon-cell rate, and MBON11 excites
// Kenyon cell 2, so learned gains change later readings. The real graph has both kinds of path. Learnable edges: KC0 and KC1 onto MBON11,
// KC0 and KC2 onto MBON05.
const KC_DRIVE = { a: [0.012, 0.004, 0.001], b: [0.006, 0.010, 0.002], c: [0.002, 0.001, 0.016] };
const DAN = { PAM07: [5], PAM02: [6], PAM03: [7], PPL101: [8], PPL103: [9] };
function tinySetup() {
  const incoming = [[], [5], [3], [0, 1], [0, 2], [], [], [], [], []], row = [0], col = [];
  for (const sources of incoming) { col.push(...sources); row.push(col.length); }
  const graph = { row: Int32Array.from(row), col: Int32Array.from(col), sign: Int8Array.from(col, () => 1), initial: Float32Array.from(col, () => 1),
    input: Int32Array.from([0]), output: Int32Array.from([4]) };
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, saturation: 1.5 });
  model.params.bias.fill(0);
  const mask = [2, 3, 4, 5], maskType = ['MBON11', 'MBON11', 'MBON05', 'MBON05'], maskPre = [0, 1, 0, 2]; // edges 0 and 1 (PAM07 -> KC1, MBON11 -> KC2) are not learnable
  const pulses = { reward: [5, 6], punish: [8, 9] };
  let calls = 0;
  const forward = (fen, move, pulse) => {
    calls++;
    model.forward(new Float32Array(1), [...KC_DRIVE[move].map((current, index) => ({ index, current })), ...(pulse ? pulses[pulse].map(index => ({ index, current: 0.75 })) : [])], null);
    return model.h[model.steps];
  };
  const record = { boardId: 'tiny', fen: 'unused', legal: ['a', 'b', 'c'], outcomes: { a: true, b: false, c: false },
    experiences: [{ move: 'a', pulse: true }, { move: 'a', pulse: true }, { move: 'c', pulse: false }, { move: 'c', pulse: false }] };
  const options = { record, forward, setMagnitude: (e, v) => model.setMagnitude(e, v), base: Float64Array.from(mask, e => model.params.magnitude[e]),
    mask, maskType, maskPre, cells: [0, 1, 2], weights: [2, 1, 1], danCells: DAN, scoreOf: h => h[3] - h[4] };
  return { model, options, calls: () => calls };
}
const learned = (model, mask) => Array.from(mask, e => model.params.magnitude[e]);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const PACKET_PATH = join(root, 'research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/inputs/boards.jsonl');

test('lesson: the rule reads the pulse-free pass and takes only the learning signal from the pulsed pass', () => {
  const kcScale = CIRCUITS.quiet.kcScale;
  const mine = tinySetup(), board = runBoard({ ...mine.options, condition: 'correct', kcScale });
  // The same 24 lessons written out separately: reading from a pass with no pulse, signal from the pass with the pulse.
  const ref = tinySetup(), { options: o } = ref, gains = [1, 1, 1, 1];
  for (let pass = 1; pass <= PASSES; pass++) for (const { move, label } of lessonLabels(o.record.experiences, 'correct')) {
    const k = o.maskPre.map(j => kcReading(o.forward('', move, null)[j], kcScale)), { D } = dopamineSignal(o.forward('', move, label), DAN);
    gains.forEach((g, i) => { gains[i] = Math.min(MAX_GAIN, Math.max(MIN_GAIN, g + ETA * D[o.maskType[i]] * (k[i] + g - 1))); o.setMagnitude(o.mask[i], o.base[i] * gains[i]); });
  }
  assert.deepEqual(learned(mine.model, o.mask), learned(ref.model, o.mask));
  assert.equal(board.lessons.length, PASSES * 4);
  // The v1 rule reads the pulsed pass. Here the reward pulse raises Kenyon cell 1, so v1 ends with different gains.
  const old = tinySetup(); runBoardV1({ ...old.options, condition: 'correct', kcScale });
  assert.notDeepEqual(learned(old.model, o.mask), learned(mine.model, o.mask));
  // One extra forward pass per lesson: 7 checkpoints x 3 moves + 24 lessons x 2 passes.
  assert.equal(mine.calls(), 7 * 3 + 24 * 2);
});

test('record: each reading before feedback is fresh, pulse-free and taken immediately before its pulse', () => {
  for (const condition of CONDITIONS) {
    const { options } = tinySetup(), b = runBoard({ ...options, condition, kcScale: CIRCUITS.quiet.kcScale });
    for (const l of b.lessons) {
      assert.equal(l.beforeFeedback.pulse, null); assert.equal(l.feedback.pulse, l.label);
      assert.equal(l.feedback.forwardCount, l.beforeFeedback.forwardCount + 1);
      assert.equal(l.feedback.gainsDigest, l.beforeFeedback.gainsDigest);
      if (l.index === 0 || condition === 'off') assert.equal(l.beforeFeedback.readingDigest, b.checkpoints[condition === 'off' ? 0 : l.pass - 1].readingDigests[l.move]);
      for (const t of l.label === 'reward' ? ['PAM07', 'PAM02'] : ['PPL101', 'PPL103']) assert(l.danMean[t] > l.beforeFeedback.danMean[t], `${condition}: ${l.label} raises ${t}`);
    }
    if (condition !== 'off') assert(b.lessons.some(l => l.index > 0 && l.beforeFeedback.readingDigest !== b.checkpoints[l.pass - 1].readingDigests[l.move]), `${condition}: later readings see the changed gains`);
  }
});

test('check 3 on the reading the rule uses: a pulse that breaks the cap in v1 leaves the pulse-free reading inside it', () => {
  const { options } = tinySetup();
  const peakWithoutPulse = Math.max(...['a', 'b', 'c'].flatMap(m => options.cells.map(j => options.forward('', m, null)[j])));
  const peakWithReward = Math.max(...options.cells.map(j => options.forward('', 'a', 'reward')[j]));
  assert(peakWithReward > 2 * peakWithoutPulse, 'the reward pulse pushes Kenyon cell 1 well above every pulse-free rate');
  const kcScale = 1.01 * peakWithoutPulse;
  const old = runBoardV1({ ...tinySetup().options, condition: 'off', kcScale });
  assert(old.lessons.some(l => l.cap.worstKept < CAP_KEEP), 'v1 reads the pulsed rates, and the cap loses part of a move difference');
  const now = runBoard({ ...tinySetup().options, condition: 'off', kcScale });
  assert(now.lessons.every(l => l.cap.reading === RULE && l.cap.worstKept === 1 && l.cap.cappedCells === 0 && l.cap.comparisons > 0));
  assert(runBoard({ ...tinySetup().options, condition: 'off', kcScale: null }).lessons.every(l => l.cap === null), 'the current circuit has no cap');
});

test('step-size guard and fresh memory are unchanged from v1', () => {
  const { model, options } = tinySetup(), untouched = Float32Array.from(model.params.magnitude);
  const first = runBoard({ ...options, condition: 'correct', kcScale: null });
  assert.notDeepEqual(Float32Array.from(model.params.magnitude), untouched);
  assert.deepEqual(runBoard({ ...options, condition: 'correct', kcScale: null }).checkpoints, first.checkpoints);
  const loud = { ...options, forward: (f, m, p) => { const h = options.forward(f, m, p); if (p) h[5] = 10; return h; } };
  const before = Float32Array.from(model.params.magnitude);
  assert.throws(() => runBoard({ ...loud, condition: 'correct', kcScale: null }), /Teaching step exceeds bound/);
  for (const e of options.mask) assert.equal(model.params.magnitude[e], options.base[options.mask.indexOf(e)], 'fresh memory restored, then no change before the guard');
  assert.notDeepEqual(Float32Array.from(model.params.magnitude), before);
});

test('rules: genuine tiny runs raise none of the new check failures', () => {
  const results = {};
  for (const circuit of Object.keys(CIRCUITS)) {
    results[circuit] = {};
    // The tiny circuit is not calibrated: its pulse-free rates exceed 0.014047, so its quiet stand-in uses a scale above every rate.
    for (const condition of CONDITIONS) results[circuit][condition] = { rule: RULE, circuit, condition, boards: [runBoard({ ...tinySetup().options, condition, kcScale: circuit === 'quiet' ? 1 : null })] };
  }
  const d = decide(results, { boardId: 'tiny', scores: {} }, []);
  assert.equal(d.verdict, 'inconclusive'); // the tiny board is not one of the three development boards
  assert(!d.failures.some(f => /rule|reading|pulse|cap/.test(f)), d.failures.join('\n'));
});

// Synthetic result files, as in the v1 test, with the records this rule adds. Each board has one safe capture (f6e4) and one rival (b8d7).
const BASE_SCORE = 0.004, LARGE = 1e-5;
function syntheticBoard(closure, condition, circuit) {
  const experiences = [{ move: 'f6e4', pulse: true }, { move: 'f6e4', pulse: true }, { move: 'b8d7', pulse: false }, { move: 'b8d7', pulse: false }];
  const checkpoints = Array.from({ length: PASSES + 1 }, (_, pass) => {
    const share = condition === 'off' ? 0 : closure * pass / PASSES, scores = { f6e4: BASE_SCORE - LARGE + LARGE * share, b8d7: BASE_SCORE };
    return { pass, scores, readingDigests: { f6e4: 'reading f6e4', b8d7: 'reading b8d7' }, ...rankMoves(scores, ['f6e4']) };
  });
  const lessons = [];
  let count = 0;
  for (let pass = 1; pass <= PASSES; pass++) lessonLabels(experiences, condition).forEach(({ move, label }, index) => {
    count += 2;
    const raised = label === 'reward' ? { PAM07: 0.3, PAM02: 0.3 } : { PPL101: 0.3, PPL103: 0.3 }, quiet = { PAM07: 0, PAM02: 0, PAM03: 0, PPL101: 0, PPL103: 0 };
    lessons.push({ pass, index, move, label, danMean: { ...quiet, ...raised }, D: { MBON05: -0.2 }, changed: condition === 'off' ? 0 : 1, atLimit: 0,
      cap: circuit === 'quiet' ? { reading: RULE, worstKept: 1, comparisons: 3 } : null,
      beforeFeedback: { forwardCount: count - 1, pulse: null, danMean: quiet, readingDigest: `reading ${move}`, gainsDigest: `gains ${count}` },
      feedback: { forwardCount: count, pulse: label, gainsDigest: `gains ${count}` } });
  });
  return { safeMoves: ['f6e4'], experiences, checkpoints, lessons };
}
function expandInput() {
  const closures = { current: { correct: 0.05, swapped: 0 }, quiet: { correct: 0.50, swapped: 0.10 } }, results = {};
  for (const circuit of Object.keys(CIRCUITS)) {
    results[circuit] = {};
    for (const condition of CONDITIONS) results[circuit][condition] = { rule: RULE, circuit, condition,
      boards: BOARD_IDS.map(boardId => ({ boardId, ...syntheticBoard(closures[circuit][condition] ?? 0, condition, circuit) })) };
  }
  const first = results.current.correct.boards[0].checkpoints[0].scores;
  const packet = BOARD_IDS.map(boardId => ({ boardId, legal: ['f6e4', 'b8d7'], outcomes: { f6e4: true, b8d7: false }, experiences: results.current.correct.boards[0].experiences.map(e => ({ ...e })) }));
  return { results, baseline: { boardId: BOARD_IDS[0], scores: { f6e4: first.f6e4, b8d7: first.b8d7 } }, packet };
}

test('rules: with every check passing, the v1 verdicts and cutoffs apply unchanged', () => {
  const { results, baseline, packet } = expandInput();
  assert.equal(decide(results, baseline, packet).verdict, 'expand to 12 boards');
  results.quiet.correct.boards.forEach(b => { b.checkpoints.forEach((c, p) => { c.scores.f6e4 = BASE_SCORE - LARGE + LARGE * 0.04 * p / PASSES; }); });
  results.quiet.swapped.boards.forEach(b => { b.checkpoints.forEach((c, p) => { c.scores.f6e4 = BASE_SCORE - LARGE + LARGE * 0.01 * p / PASSES; }); });
  assert.equal(decide(results, baseline, packet).verdict, 'drop the quiet, rescaled circuit');
});

test('rules: each new or revised required check, failing alone, makes the result inconclusive', () => {
  const lesson = (r, circuit, condition, board, k) => r[circuit][condition].boards[board].lessons[k];
  const cases = {
    'file says rule': r => { delete r.quiet.correct.rule; }, // check 5, extended: a run of the v1 rule
    'reading before feedback missing, pulsed': r => { lesson(r, 'quiet', 'correct', 0, 3).beforeFeedback.pulse = 'reward'; }, // check 6
    'reading before feedback missing, pulsed, or not followed': r => { delete lesson(r, 'current', 'swapped', 1, 9).beforeFeedback; },
    'not followed by the lesson\'s pulse': r => { lesson(r, 'quiet', 'off', 2, 0).feedback.pulse = 'punish'; },
    'another forward pass ran between the reading and the pulse': r => { lesson(r, 'current', 'correct', 2, 14).feedback.forwardCount += 1; },
    'gains changed between the reading and the pulse': r => { lesson(r, 'quiet', 'swapped', 1, 21).feedback.gainsDigest = 'changed'; },
    'differs from f6e4\'s reading at checkpoint 1': r => { lesson(r, 'quiet', 'correct', 0, 4).beforeFeedback.readingDigest = 'pulsed reading'; },
    'differs from b8d7\'s reading at checkpoint 0': r => { lesson(r, 'current', 'off', 1, 2).beforeFeedback.readingDigest = 'pulsed reading'; },
    'the reward pulse did not raise PAM07': r => { lesson(r, 'current', 'correct', 0, 0).danMean.PAM07 = 0; }, // check 7
    'the punish pulse did not raise PPL103': r => { const l = lesson(r, 'quiet', 'off', 2, 6); l.danMean.PPL103 = l.beforeFeedback.danMean.PPL103; },
    'cap keeps under 99% of a move difference in the reading before feedback': r => { lesson(r, 'quiet', 'swapped', 0, 11).cap.worstKept = 0.985; }, // check 3, revised
    'or the cap record is missing': r => { delete lesson(r, 'quiet', 'off', 1, 17).cap.reading; }, // a v1 cap record, taken from the pulsed pass
  };
  for (const [message, breakIt] of Object.entries(cases)) {
    const input = expandInput(); breakIt(input.results);
    const d = decide(input.results, input.baseline, input.packet);
    assert.equal(d.verdict, 'inconclusive', message); assert.equal(d.reason, 'a required check failed', message);
    assert(d.failures.some(f => f.includes(message)), `${message}:\n${d.failures.join('\n')}`);
  }
  // The v1 checks still apply.
  const input = expandInput(); input.results.quiet.off.boards[1].checkpoints[3].scores.f6e4 += 1e-12;
  assert.match(decide(input.results, input.baseline, input.packet).failures.join('\n'), /scores moved with learning off/);
});

// Script checks. Six synthetic runs built on the real board packet, so the rules script's packet pin and lesson checks apply.
test('scripts: the probe stops at a wrong pin before any graph work; the rules script reads six runs and reports the verdict', () => {
  const dir = mkdtempSync(join(tmpdir(), 'three-board-v2-'));
  try {
    const probe = join(root, '.codebase/scripts/neural-learning/probe-wide-learning-v4.mjs'), pinned = join(dir, 'pinned.txt'), config = join(dir, 'config.json');
    writeFileSync(pinned, 'x'); writeFileSync(config, JSON.stringify({ paths: { graph: join(dir, 'no-graph.npz') }, model: {}, pins: { [pinned]: '0'.repeat(64) } }));
    const args = out => [probe, '--config', config, '--circuit', 'quiet', '--condition', 'off', '--out', out];
    const stopped = spawnSync(process.execPath, args(join(dir, 'probe')), { encoding: 'utf8' });
    assert.notEqual(stopped.status, 0);
    const manifest = JSON.parse(readFileSync(join(dir, 'probe', 'manifest.json'), 'utf8'));
    assert.equal(manifest.status, 'failed'); assert.match(manifest.error, /Pin mismatch/); assert.equal(manifest.rule, RULE); assert.equal(manifest.sealedBoards, 0);
    assert(!existsSync(join(dir, 'probe', 'result.json')));
    assert.match(spawnSync(process.execPath, args(join(dir, 'probe')), { encoding: 'utf8' }).stderr, /already holds a run/);
    assert.notEqual(spawnSync(process.execPath, [probe, '--config', config, '--circuit', 'loud', '--condition', 'off', '--out', join(dir, 'p2')], { encoding: 'utf8' }).status, 0);

    const packetRecords = readFileSync(PACKET_PATH, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    const boardFor = (boardId, closure, condition, circuit) => {
      const record = packetRecords.find(r => r.boardId === boardId), safeMoves = record.legal.filter(m => record.outcomes[m] === true);
      const safe = safeMoves[0], rival = record.legal.find(m => !safeMoves.includes(m));
      const synthetic = syntheticBoard(closure, condition, circuit), lessons = [];
      const labels = lessonLabels(record.experiences, condition);
      synthetic.lessons.forEach((l, k) => lessons.push({ ...l, move: labels[k % 4].move, label: labels[k % 4].label,
        danMean: { PAM07: 0, PAM02: 0, PAM03: 0, PPL101: 0, PPL103: 0, ...(labels[k % 4].label === 'reward' ? { PAM07: 0.3, PAM02: 0.3 } : { PPL101: 0.3, PPL103: 0.3 }) },
        beforeFeedback: { ...l.beforeFeedback, readingDigest: `reading ${labels[k % 4].move}` }, feedback: { ...l.feedback, pulse: labels[k % 4].label } }));
      const checkpoints = synthetic.checkpoints.map(c => {
        const scores = Object.fromEntries(record.legal.map((m, i) => [m, m === safe ? c.scores.f6e4 : m === rival ? BASE_SCORE : BASE_SCORE - 3 * LARGE - 1e-8 * i]));
        return { pass: c.pass, scores, readingDigests: Object.fromEntries(record.legal.map(m => [m, `reading ${m}`])) };
      });
      return { boardId, safeMoves, experiences: record.experiences.map(e => ({ move: e.move, pulse: e.pulse })), checkpoints, lessons };
    };
    const closures = { current: { correct: 0.05, swapped: 0 }, quiet: { correct: 0.50, swapped: 0.10 } };
    const runs = join(dir, 'runs');
    for (const circuit of Object.keys(CIRCUITS)) for (const condition of CONDITIONS) {
      const runDir = join(runs, `${circuit}-${condition}`); mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'manifest.json'), JSON.stringify({ status: 'complete' }));
      writeFileSync(join(runDir, 'result.json'), JSON.stringify({ rule: RULE, circuit, condition, boards: BOARD_IDS.map(id => boardFor(id, closures[circuit][condition] ?? 0, condition, circuit)) }));
    }
    const start = JSON.parse(readFileSync(join(runs, 'current-correct', 'result.json'), 'utf8')).boards[0];
    const [safe] = start.safeMoves, rival = Object.keys(start.checkpoints[0].scores).find(m => !start.safeMoves.includes(m));
    const baseline = join(dir, 'probe.json');
    writeFileSync(baseline, JSON.stringify({ rows: [{ boardId: start.boardId, bestSafe: { move: safe, score: start.checkpoints[0].scores[safe] }, bestOther: { move: rival, score: start.checkpoints[0].scores[rival] } }] }));
    const rules = out => spawnSync(process.execPath, [join(root, '.codebase/scripts/neural-learning/apply-three-board-rules-v2.mjs'), '--runs', runs, '--baseline', baseline, '--packet', PACKET_PATH, '--out', out], { encoding: 'utf8' });
    const expand = rules(join(dir, 'decision.json'));
    assert.equal(expand.status, 0, expand.stderr); assert.match(expand.stdout, /Rule: reading before feedback\. Verdict: expand to 12 boards/);
    const quietOff = join(runs, 'quiet-off', 'result.json'), result = JSON.parse(readFileSync(quietOff, 'utf8'));
    result.boards[1].lessons[5].beforeFeedback.pulse = 'punish'; writeFileSync(quietOff, JSON.stringify(result));
    const spoilt = rules(join(dir, 'decision-2.json'));
    assert.match(spoilt.stdout, /Verdict: inconclusive \(a required check failed\)/); assert.match(spoilt.stdout, /quiet off SjmcbcGu:16 pass 2 lesson 1: reading before feedback missing, pulsed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
