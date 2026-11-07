import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import {
  ARMS, positionId, outcomeValue, splitPositions, chanceRates, runArmV3, judgeV3,
} from '../../src/neural-learning/engineered-memory-task-v3.mjs';
import { makeYoked } from '../../src/neural-learning/engineered-memory-task-v2.mjs';

const DIM = 8;
const UCI = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];

// Synthetic positions: one safe capture (index 0), one unsafe capture (index 1), four quiet moves.
// Feature vectors: safe = base + 2*e0, unsafe = base - 2*e0, quiet = base - 2*e1.
function makePositions(count, offset) {
  const bases = new Map();
  const positions = [];
  for (let i = 0; i < count; i++) {
    const id = offset + i;
    const rng = mulberry32(1000 + id);
    const base = Float64Array.from({ length: DIM }, () => (rng() - 0.5) * 0.2);
    const gameId = `g${id}`;
    const p = {
      gameId,
      ply: 12,
      fen: `board${id} w - - 0 1`,
      history: [],
      moves: UCI.map((uci, j) => ({ uci, capture: j < 2, outcome: j === 0 ? 'safe' : j === 1 ? 'unsafe' : 'quiet' })),
    };
    bases.set(positionId(p), base);
    positions.push(p);
  }
  const featureOf = (p, uci) => {
    const base = bases.get(positionId(p));
    const m = p.moves.find(x => x.uci === uci);
    const v = Float64Array.from(base);
    if (m.outcome === 'safe') v[0] += 2;
    else if (m.outcome === 'unsafe') v[0] -= 2;
    else v[1] -= 2;
    return v;
  };
  return { positions, featureOf };
}

test('outcomeValue maps labels and throws on unknown labels', () => {
  assert.equal(outcomeValue('safe'), 1);
  assert.equal(outcomeValue('unsafe'), -1);
  assert.equal(outcomeValue('quiet'), -1);
  assert.equal(outcomeValue('unknown'), null);
  assert.throws(() => outcomeValue('x'), /Unknown outcome label/);
});

test('splitPositions is deterministic, disjoint by game, ordered, drops board repeats, and validates size', () => {
  const { positions } = makePositions(12, 0);
  // Give game g0 two plies so ordering by ply can be checked.
  const extra = { ...positions[0], ply: 4 };
  const all = [positions[0], extra, ...positions.slice(1)];

  const a = splitPositions(all, 6);
  const b = splitPositions([...all].reverse(), 6);
  assert.deepEqual(a.practice.map(positionId), b.practice.map(positionId));
  assert.deepEqual(a.test.map(positionId), b.test.map(positionId));

  const practiceGames = new Set(a.practice.map(p => p.gameId));
  assert.ok(a.test.every(p => !practiceGames.has(p.gameId)));
  assert.equal(practiceGames.size, 6);

  // Ply ordering inside a game.
  const g0 = a.practice.filter(p => p.gameId === 'g0').map(p => p.ply);
  if (g0.length === 2) assert.deepEqual(g0, [4, 12]);

  // A test position whose board equals a practice board is dropped.
  const repeat = { ...positions[11], gameId: 'zz-repeat', fen: a.practice[0].fen };
  const withRepeat = splitPositions([...all, repeat], 6);
  assert.ok(withRepeat.droppedRepeats.includes(positionId(repeat)));
  assert.ok(!withRepeat.test.some(p => p.gameId === 'zz-repeat'));

  assert.throws(() => splitPositions(all, 12), /Not enough games/);
});

test('chanceRates counts safe moves per legal move and per safe+unsafe capture', () => {
  const pos = [
    { moves: [{ outcome: 'safe' }, { outcome: 'quiet' }, { outcome: 'quiet' }, { outcome: 'quiet' }] },
    { moves: [{ outcome: 'safe' }, { outcome: 'unsafe' }, { outcome: 'quiet' }, { outcome: 'quiet' }, { outcome: 'quiet' }, { outcome: 'quiet' }] },
    { moves: [{ outcome: 'quiet' }, { outcome: 'quiet' }] },
  ];
  const r = chanceRates(pos);
  assert.ok(Math.abs(r.randomMove - (0.25 + 1 / 6 + 0) / 3) < 1e-12);
  // Position 1 has 1 safe of 1 capture (1.0); position 2 has 1 of 2 (0.5). Position 3 has no captures and is skipped.
  assert.equal(r.randomCapture, 0.75);
});

test('informative arm learns: graph arm gets at least 30 of 40 new positions right', () => {
  const { positions, featureOf } = makePositions(160, 0);
  const practice = positions.slice(0, 120);
  const test = positions.slice(120, 160);
  const row = runArmV3({ arm: 'graph', seed: 1, practice, test, featureOf });
  assert.ok(row.testCorrect >= 30, `graph arm testCorrect=${row.testCorrect} of 40`);
  // Report the numbers for the record.
  console.log(`graph seed 1: testCorrect=${row.testCorrect}/40 writes=${row.writes} unknown=${row.unknown} stored=${row.stored} topLabels=${JSON.stringify(row.topLabels)}`);
});

test('only the chosen move is written: writes equal logged known-outcome trials', () => {
  const { positions, featureOf } = makePositions(60, 0);
  const logs = [];
  const row = runArmV3({ arm: 'graph', seed: 2, practice: positions, test: [], featureOf, log: e => logs.push(e) });
  const trialLogs = logs.filter(e => e.kind === 'trial');
  assert.equal(trialLogs.length, positions.length);
  const written = trialLogs.filter(e => e.written !== null);
  assert.equal(row.writes, written.length);
  assert.equal(row.writes, row.trials - row.unknown);
  // Each logged choice is one of that position's legal moves, and its label is the chosen move's label.
  for (const e of trialLogs) {
    const p = positions.find(q => positionId(q) === e.id);
    assert.equal(e.label, p.moves.find(m => m.uci === e.choice).outcome);
  }
});

test('none arm: no writes, no memory, every test top is a tie, zero correct', () => {
  const { positions, featureOf } = makePositions(40, 0);
  const row = runArmV3({ arm: 'none', seed: 3, practice: positions.slice(0, 30), test: positions.slice(30), featureOf });
  assert.equal(row.writes, 0);
  assert.equal(row.stored, 0);
  assert.equal(row.testCorrect, 0);
  assert.equal(row.topLabels.tie, 10);
  assert.equal(row.topLabels.safe + row.topLabels.unsafe + row.topLabels.quiet + row.topLabels.unknown, 0);
});

test('unknown labels produce no write', () => {
  const { positions, featureOf } = makePositions(20, 0);
  const allUnknown = positions.map(p => ({ ...p, moves: p.moves.map(m => ({ ...m, outcome: 'unknown' })) }));
  const row = runArmV3({ arm: 'graph', seed: 4, practice: allUnknown, test: [], featureOf });
  assert.equal(row.writes, 0);
  assert.equal(row.stored, 0);
  assert.equal(row.unknown, 20);
  assert.deepEqual(row.writtenOutcomes, []);
});

test('mismatched arm writes the yoked sequence in order', () => {
  const { positions, featureOf } = makePositions(50, 0);
  const yoked = [1, -1, -1, 1, 1, -1, 1, -1, -1, -1];
  const logs = [];
  runArmV3({ arm: 'mismatched', seed: 5, practice: positions, test: [], featureOf, yokedValues: yoked, log: e => logs.push(e) });
  const writtenValues = logs.filter(e => e.kind === 'trial' && e.written !== null).map(e => e.written);
  assert.equal(writtenValues.length, 50);
  assert.deepEqual(writtenValues, writtenValues.map((_, i) => yoked[i % yoked.length]));
});

test('judgeV3 returns per-seed gates for three seeds using all five arms', () => {
  const { positions, featureOf } = makePositions(100, 0);
  const practice = positions.slice(0, 60);
  const test = positions.slice(60, 80);
  const seeds = [11, 12, 13];
  const rows = [];
  for (const seed of seeds) {
    const graph = runArmV3({ arm: 'graph', seed, practice, test, featureOf });
    const yoked = makeYoked(graph.writtenOutcomes, seed);
    rows.push(graph);
    rows.push(runArmV3({ arm: 'raw', seed, practice, test, featureOf }));
    rows.push(runArmV3({ arm: 'random', seed, practice, test, featureOf }));
    rows.push(runArmV3({ arm: 'mismatched', seed, practice, test, featureOf, yokedValues: yoked }));
    rows.push(runArmV3({ arm: 'none', seed, practice, test, featureOf }));
  }
  const testGames = test.map(p => p.gameId);
  const verdict = judgeV3(rows, { seeds, testGames, minCorrect: 10, minMargin: 0 });
  assert.equal(verdict.perSeed.length, 3);
  assert.deepEqual(verdict.perSeed.map(s => s.seed), seeds);
  for (const s of verdict.perSeed) {
    assert.equal(typeof s.graphCorrect, 'number');
    assert.equal(typeof s.pass, 'boolean');
    assert.ok(s.gate);
  }
  assert.equal(verdict.pass, verdict.perSeed.every(s => s.pass));
  assert.equal(verdict.outcome, verdict.pass ? 'passes' : 'does not pass');
  assert.deepEqual(verdict.rule, { minCorrect: 10, minMargin: 0, comparators: ['raw', 'random', 'mismatched', 'none'] });
  assert.ok(ARMS.length === 5);
});
