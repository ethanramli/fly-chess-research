import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARD_IDS, PASSES, VALENCE } from '../../src/neural-learning/three-board-feedback-v1.mjs';
import { checkReadingBeforeFeedback, countOutputCells, pushOf } from '../../src/neural-learning/reading-before-feedback-check-v1.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const PACKET_PATH = join(root, 'research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/inputs/boards.jsonl');
const packetBytes = readFileSync(PACKET_PATH), PACKET_HASH = createHash('sha256').update(packetBytes).digest('hex');
const PACKET = packetBytes.toString('utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const zeroSignal = () => Object.fromEntries([...VALENCE.keys()].map(t => [t, 0]));
const OUTPUT_CELLS = { MBON11: 2, MBON12: 2, MBON02: 2, MBON05: 4, MBON01: 3, MBON15: 4 }; // attraction 6, avoidance 11

// Synthetic recording on the real packet. Four Kenyon cells, one learnable connection each: cell 0 fires only for the best safe capture
// (the board's first rewarded lesson) and connects to MBON11; cell 1 fires only for the rival (the first punished lesson) and connects to MBON05;
// cell 2 fires equally for every move and connects to MBON01; cell 3 fires only for the best safe capture and connects to MBON12.
// signal[pulse] sets the recorded learning signals, so each case controls which connections learn and in which direction.
// edges > 4 spreads that many connections over the four cells in turn (the script requires the real 6,046).
function synthetic(signal, { safeLeads = [], edges = 4 } = {}) {
  const cellType = ['MBON11', 'MBON05', 'MBON01', 'MBON12'], cell = Array.from({ length: edges }, (_, i) => i % 4);
  const mapping = { maskEdges: edges, cells: [100, 101, 102, 103], cellRootIds: ['1', '2', '3', '4'], weights: [0, 1, 2, 3].map(k => cell.filter(c => c === k).length),
    edge: cell.map((_, i) => i), type: cell.map(c => cellType[c]), cell, base: cell.map(() => 1) };
  const records = [];
  for (const id of BOARD_IDS) {
    const board = PACKET.find(r => r.boardId === id), safe = board.experiences[0].move, rival = board.experiences[2].move;
    board.legal.forEach((move, i) => {
      const score = move === safe ? (safeLeads.includes(id) ? 0.001 : -0.001) : move === rival ? 0 : board.outcomes[move] ? -0.002 : -0.003;
      const rates = [move === safe ? 0.01 : 0, move === rival ? 0.01 : 0, 0.005 + 1e-5 * i, move === safe ? 0.01 : 0];
      for (const pulse of ['none', 'reward', 'punish']) records.push({ boardId: id, move, pulse, score, rates, D: { ...zeroSignal(), ...(signal[pulse] ?? {}) },
        danMean: { PAM07: pulse === 'reward' ? 0.3 : 0, PAM02: pulse === 'reward' ? 0.3 : 0, PAM03: 0, PPL101: pulse === 'punish' ? 0.3 : 0, PPL103: pulse === 'punish' ? 0.3 : 0 } });
    });
  }
  const recording = { manifest: { status: 'complete', pins: { 'runs/replay-calibration-inputs/boards.jsonl': PACKET_HASH } }, summary: { records: records.length, weightsUnchanged: true },
    mapping, records, packet: PACKET, expectedPacketHash: PACKET_HASH, maskEdges: edges };
  // The saved learning-off run, as probe-wide-learning-v3.mjs writes it: correct labels, 6 passes, starting scores.
  const of = (id, move, pulse) => records.find(r => r.boardId === id && r.move === move && r.pulse === pulse);
  const savedRun = { circuit: 'quiet', condition: 'off', boards: BOARD_IDS.map(id => {
    const board = PACKET.find(r => r.boardId === id), lessons = [];
    for (let pass = 1; pass <= PASSES; pass++) board.experiences.forEach((e, index) => {
      const label = e.pulse ? 'reward' : 'punish', r = of(id, e.move, label);
      lessons.push({ pass, index, move: e.move, label, danMean: { ...r.danMean }, D: { ...r.D }, changed: 0, cap: { worstKept: 1 } });
    });
    return { boardId: id, checkpoints: [{ pass: 0, scores: Object.fromEntries(board.legal.map(m => [m, of(id, m, 'none').score])) }], lessons };
  }) };
  return { recording, savedRun, outputCells: { ...OUTPUT_CELLS } };
}
// Correct labels raise the safe capture's attraction input through two cells (0 and 3) and lower the rival's avoidance input (cell 1).
const SELECTIVE = { reward: { MBON11: 0.4, MBON12: 0.4 }, punish: { MBON05: -0.4 } };

test('output-cell counts: one per annotation row of an output type, Kenyon cells skipped, repeated roots flagged', async () => {
  const rows = ['root_id\tcell_class\themibrain_type', '1\tMBON\tMBON11', '2\tMBON\tMBON11', '3\tMBON\tMBON05', '4\tKenyon_Cell\tMBON05', '5\tDAN\tPAM07', '6\tMBON\tMBON99', '3\tMBON\tMBON05'];
  const { counts, repeatedRoots } = await countOutputCells(rows);
  assert.deepEqual(counts, { MBON11: 2, MBON12: 0, MBON02: 0, MBON05: 2, MBON01: 0, MBON15: 0 });
  assert.equal(repeatedRoots, 1);
  await assert.rejects(countOutputCells(['root_id\themibrain_type', '1\tMBON11']), /Missing annotation column/);
  // Every output type must be present before the check runs.
  assert.throws(() => checkReadingBeforeFeedback({ ...synthetic(SELECTIVE), outputCells: counts }), /Output-cell counts missing or not positive/);
});

test('push: worked by hand, per output type and per cell, weighted as the score weights output cells', () => {
  // Connection 0: cell 0 -> MBON11, base 2, gain 1.5; the safe capture fires cell 0 at 0.01. Its input rises 2 x 0.5 x 0.01 = 0.01.
  // Connection 1: cell 1 -> MBON05, base 1, gain 0.5; the rival fires cell 1 at 0.02. The rival's avoidance input falls 0.01, so the
  // safe-minus-rival difference rises 0.01 on MBON05, which pushes against the safe capture. Connection 2 has gain 1 and adds nothing.
  const mapping = { cell: [0, 1, 1], type: ['MBON11', 'MBON05', 'MBON11'], base: [2, 1, 1], weights: [1, 2] };
  const weight = { MBON11: 1 / 6, MBON05: -1 / 11, MBON12: 1 / 6, MBON02: 1 / 6, MBON01: -1 / 11, MBON15: -1 / 11 };
  const p = pushOf(Float64Array.from([1.5, 0.5, 1]), mapping, [0.01, 0], [0, 0.02], weight);
  assert(Math.abs(p.byType.MBON11 - 0.01) < 1e-15 && Math.abs(p.byType.MBON05 - 0.01) < 1e-15 && p.byType.MBON01 === 0);
  assert(Math.abs(p.net - (0.01 / 6 - 0.01 / 11)) < 1e-15);
  assert(Math.abs(p.byCell[0] - 0.01 / 6) < 1e-15 && Math.abs(p.byCell[1] + 0.01 / 11) < 1e-15);
});

test('self-check: passes on matching data; any saved signal, starting score or lesson that differs fails it and no screen is read', () => {
  const good = checkReadingBeforeFeedback(synthetic(SELECTIVE));
  assert.equal(good.selfCheck.passes, true);
  assert.equal(good.selfCheck.savedRun.lessonsMatching, 72); assert.equal(good.selfCheck.savedRun.startingScoresMatching, 106);
  assert(good.selfCheck.firstStepMatches && good.selfCheck.sumsAgree);
  const cases = {
    'a learning signal 1e-12 off': s => { s.savedRun.boards[1].lessons[7].D.MBON05 += 1e-12; },
    'a dopamine mean off': s => { s.savedRun.boards[0].lessons[0].danMean.PAM02 = 0.31; },
    'a starting score off': s => { const sc = s.savedRun.boards[2].checkpoints[0].scores; sc[Object.keys(sc)[3]] += 1e-15; },
    'a missing starting score': s => { const sc = s.savedRun.boards[0].checkpoints[0].scores; delete sc[Object.keys(sc)[0]]; },
    'a lesson missing': s => { s.savedRun.boards[1].lessons.pop(); },
    'two lessons swapped': s => { const l = s.savedRun.boards[0].lessons; [l[2], l[1]] = [l[1], l[2]]; },
    'a run from the wrong condition': s => { s.savedRun.condition = 'correct'; },
    'boards out of order': s => { s.savedRun.boards.reverse(); },
  };
  for (const [name, spoil] of Object.entries(cases)) {
    const input = synthetic(SELECTIVE); spoil(input);
    const c = checkReadingBeforeFeedback(input);
    assert.equal(c.selfCheck.passes, false, name); assert.equal(c.screen.answer, 'self-check failed', name); assert(c.selfCheck.savedRun.problems.length > 0, name);
  }
});

test('replay uses each move\'s pulse-free rates and the pulsed learning signal', () => {
  // Here the reward pulse drives cell 1 to 0.05 in every move, and only reward lessons carry a learning signal, on MBON05. Without the pulse,
  // cell 1 fires only for the rival, which is never rewarded, so the rule reads 0 for cell 1 in every reward lesson and its gain stays at 1.
  // Reading the pulsed rates instead would read 1 and move it.
  const input = synthetic({ reward: { MBON05: -0.4 }, punish: {} });
  for (const r of input.recording.records) if (r.pulse === 'reward') r.rates = [r.rates[0], 0.05, r.rates[2], r.rates[3]];
  const c = checkReadingBeforeFeedback(input);
  assert.equal(c.selfCheck.passes, true);
  for (const b of c.boards) assert.equal(b.correct.byType.MBON05, 0, `${b.boardId}: rewarded safe captures do not fire cell 1 without the pulse`);
});

test('screen: not ruled out when at least 2 qualifying boards pass all three conditions', () => {
  const c = checkReadingBeforeFeedback(synthetic(SELECTIVE));
  assert.equal(c.screen.answer, 'not ruled out');
  assert.deepEqual(c.conditionCounts, { qualifying: 3, withoutTopCell: 3, beatsSwapped: 3, byHalfway: 3, all: 3 });
  for (const b of c.boards) {
    assert(b.correct.net > 0 && b.swapped.net <= 0);
    assert(b.topCell.shareOfChange > 0 && b.topCell.shareOfChange < 1);
    assert(Number.isFinite(b.twelveLessonShare));
    assert.equal(b.correct.byType.MBON01, 0, 'a cell that fires equally for both moves adds nothing to the push');
  }
});

test('screen: each rule-out condition alone rules the rule out', () => {
  const ruledOut = (signal, failing) => {
    const c = checkReadingBeforeFeedback(synthetic(signal));
    assert.equal(c.screen.answer, 'ruled out', failing);
    for (const key of ['withoutTopCell', 'beatsSwapped', 'byHalfway']) assert.equal(c.conditionCounts[key] < 2, key === failing, `${failing}: ${key} count ${c.conditionCounts[key]}`);
    return c;
  };
  // One cell carries the push: only cell 0 learns. Without it, nothing favours the safe capture.
  const one = ruledOut({ reward: { MBON11: 0.4 }, punish: {} }, 'withoutTopCell');
  assert(one.boards.every(b => b.topCell.shareOfChange === 1));
  // Labels do not matter: reward and punishment carry the same signal, so swapped lessons push exactly as far.
  ruledOut({ reward: { MBON11: 0.4, MBON12: 0.4 }, punish: { MBON11: 0.4, MBON12: 0.4 } }, 'beatsSwapped');
  // Late push only: punishment quickly lifts the rival, while two slowly growing safe-capture gains overtake it only after lesson 12.
  const late = ruledOut({ reward: { MBON11: 0.08, MBON12: 0.08 }, punish: { MBON05: -1.4 } }, 'byHalfway');
  assert(late.boards.slice(1).every(b => b.correct.netAfter12 < 0 && b.correct.net > 0 && b.twelveLessonShare < 0));
});

test('screen: too few qualifying boards gives no screen answer', () => {
  const c = checkReadingBeforeFeedback(synthetic(SELECTIVE, { safeLeads: BOARD_IDS.slice(1) }));
  assert.equal(c.screen.answer, 'too few boards'); assert.equal(c.conditionCounts.qualifying, 1);
});

test('scripts: the count matches the annotation file; the check runs end to end, refuses an existing output, and exits 1 when the self-check fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-before-feedback-'));
  try {
    const write = (input, name) => {
      const rec = join(dir, name, 'recording'), off = join(dir, name, 'quiet-off');
      mkdirSync(rec, { recursive: true }); mkdirSync(off, { recursive: true });
      const { manifest, summary, mapping, records } = input.recording;
      writeFileSync(join(rec, 'manifest.json'), JSON.stringify(manifest)); writeFileSync(join(rec, 'summary.json'), JSON.stringify(summary));
      writeFileSync(join(rec, 'mapping.json'), JSON.stringify(mapping)); writeFileSync(join(rec, 'records.jsonl'), records.map(r => JSON.stringify(r)).join('\n'));
      writeFileSync(join(off, 'result.json'), JSON.stringify(input.savedRun));
      return { rec, off };
    };
    const tsv = join(dir, 'annotations.tsv');
    writeFileSync(tsv, ['root_id\tcell_class\themibrain_type', ...Object.entries(OUTPUT_CELLS).flatMap(([t, n]) => Array.from({ length: n }, (_, i) => `${t}${i}\tMBON\t${t}`)), 'k\tKenyon_Cell\tKCg-m'].join('\n'));
    const run = ({ rec, off }, out) => spawnSync(process.execPath, [join(root, '.codebase/scripts/neural-learning/check-reading-before-feedback-v1.mjs'),
      '--recording', rec, '--packet', PACKET_PATH, '--learning-off-run', off, '--annotations', tsv, '--out', out], { encoding: 'utf8' });
    const counted = spawnSync(process.execPath, [join(root, '.codebase/scripts/neural-learning/count-output-cells-v1.mjs'), '--annotations', tsv], { encoding: 'utf8' });
    assert.equal(counted.status, 0, counted.stderr); assert.deepEqual(JSON.parse(counted.stdout.slice(0, counted.stdout.lastIndexOf('}') + 1)).outputCells, OUTPUT_CELLS);
    const good = write(synthetic(SELECTIVE, { edges: 6046 }), 'good'), out = join(dir, 'good.json');
    const first = run(good, out);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Self-check: passes\. Saved run: 72 of 72 lessons and 106 of 106 starting scores match exactly/);
    assert.match(first.stdout, /attraction 6, avoidance 11/); assert.match(first.stdout, /Screen: not ruled out/);
    const saved = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(saved.screen.answer, 'not ruled out'); assert.deepEqual(saved.outputCells, OUTPUT_CELLS);
    assert.notEqual(run(good, out).status, 0, 'refuses to overwrite');
    assert.notEqual(run(write(synthetic(SELECTIVE), 'small'), join(dir, 'small.json')).status, 0, 'refuses a mapping without 6,046 connections');
    const spoilt = synthetic(SELECTIVE, { edges: 6046 }); spoilt.savedRun.boards[0].lessons[3].D.MBON11 += 1e-9;
    const bad = run(write(spoilt, 'bad'), join(dir, 'bad.json'));
    assert.equal(bad.status, 1); assert.match(bad.stdout, /Self-check: FAILS/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'bad.json'), 'utf8')).screen.answer, 'self-check failed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
