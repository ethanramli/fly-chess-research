// Engineered memory v3 (2026-11-03): episodic memory without hints. Pure task logic. Features come from the caller, so the brain is never touched here. The fly scores every legal move from an external memory, chooses one with fixed seeded randomness, and only the chosen move's verified outcome is written.
import { createHash } from 'node:crypto';
import { NearestEpisodeMemory } from './kc-episodic-memory-v2.mjs';
import { frozenScores, pairGate } from './transfer-evaluation-v1.mjs';
import { chooseMove } from './move-chooser-v1.mjs';
import { ARMS } from './engineered-memory-task-v2.mjs';

export { ARMS };

const sha256 = text => createHash('sha256').update(text).digest('hex');

export function positionId(p) {
  return `${p.gameId}:${p.ply}`;
}

// Safe capture = +1. Unsafe capture or quiet move = -1. Unknown = null (no write).
export function outcomeValue(label) {
  if (label === 'safe') return 1;
  if (label === 'unsafe' || label === 'quiet') return -1;
  if (label === 'unknown') return null;
  throw Error(`Unknown outcome label: ${label}`);
}

// Games are ordered by a hash, so the split does not depend on input order.
export function splitPositions(positions, practiceGames = 198) {
  const games = [...new Set(positions.map(p => p.gameId))];
  if (games.length <= practiceGames) throw Error('Not enough games to split');
  const key = g => sha256(`engineered-memory-v3-split:${g}`);
  const order = games.map(g => [key(g), g]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(x => x[1]);
  const rank = new Map(order.map((g, i) => [g, i]));
  const byOrder = (a, b) => rank.get(a.gameId) - rank.get(b.gameId) || a.ply - b.ply;
  const practiceSet = new Set(order.slice(0, practiceGames));

  const practice = positions.filter(p => practiceSet.has(p.gameId)).sort(byOrder);
  const practiceBoards = new Set(practice.map(p => p.fen.split(' ')[0]));
  const testAll = positions.filter(p => !practiceSet.has(p.gameId)).sort(byOrder);

  // Drop test positions whose board already appears in practice.
  const droppedRepeats = testAll.filter(p => practiceBoards.has(p.fen.split(' ')[0])).map(positionId);
  const test = testAll.filter(p => !practiceBoards.has(p.fen.split(' ')[0]));
  return { practice, test, droppedRepeats };
}

// Chance rates for a random mover over the labelled positions.
export function chanceRates(positions) {
  if (!Array.isArray(positions) || positions.length === 0) throw Error('No positions');
  const count = (p, label) => p.moves.filter(m => m.outcome === label).length;
  const randomMove = positions.reduce((sum, p) => sum + count(p, 'safe') / p.moves.length, 0) / positions.length;
  const capturable = positions.filter(p => count(p, 'safe') + count(p, 'unsafe') > 0);
  const randomCapture = capturable.length === 0
    ? null
    : capturable.reduce((sum, p) => sum + count(p, 'safe') / (count(p, 'safe') + count(p, 'unsafe')), 0) / capturable.length;
  return { randomMove, randomCapture };
}

export function runArmV3({ arm, seed, practice, test, featureOf, yokedValues = null, capacity = 512, k = 3, temperature = 0.1, log = () => {} }) {
  if (!ARMS.includes(arm)) throw Error(`Unknown arm: ${arm}`);
  if (arm === 'mismatched' && !(Array.isArray(yokedValues) && yokedValues.length > 0 && yokedValues.every(v => v === 1 || v === -1))) {
    throw Error('mismatched arm needs a non-empty +1/-1 yokedValues array');
  }

  const memory = new NearestEpisodeMemory({ capacity, k });
  const empty = memory.fingerprint();
  // The no-memory arm neither reads nor writes.
  const reads = arm !== 'none';
  const writesAllowed = arm !== 'none';
  const scoreOf = (p, u) => (reads ? memory.score(featureOf(p, u)) : 0);

  // Practice: one pass, fixed order. Only the chosen move is ever written.
  const writtenOutcomes = [];
  let trial = 0;
  let unknown = 0;
  let writeIndex = 0;
  for (const p of practice) {
    trial++;
    const moves = p.moves.map(m => m.uci);
    const r = chooseMove({ moves, score: u => scoreOf(p, u), fingerprint: () => memory.fingerprint(), temperature, seed, trial });
    const label = p.moves.find(m => m.uci === r.move).outcome;
    const outcome = outcomeValue(label);
    let written = null;
    if (outcome === null) {
      unknown++;
    } else {
      writtenOutcomes.push(outcome);
      const value = arm === 'mismatched' ? yokedValues[writeIndex % yokedValues.length] : outcome;
      if (writesAllowed) {
        memory.write(featureOf(p, r.move), value, sha256(JSON.stringify({ arm, seed, trial, id: positionId(p), move: r.move, outcome, value })));
        written = value;
      }
      writeIndex++;
    }
    log({ kind: 'trial', arm, seed, trial, id: positionId(p), choice: r.move, label, written, topScore: Math.max(...r.scores) });
  }

  // Test: no writes. Memory must stay unchanged across every candidate.
  const testRows = [];
  const topLabels = { safe: 0, unsafe: 0, quiet: 0, unknown: 0, tie: 0 };
  for (const p of test) {
    const before = memory.fingerprint();
    const moves = p.moves.map(m => m.uci).sort();
    const scores = frozenScores(moves, u => scoreOf(p, u), () => memory.fingerprint());
    const max = Math.max(...scores);
    const top = moves.filter((u, i) => scores[i] === max);
    const topLabel = top.length === 1 ? p.moves.find(m => m.uci === top[0]).outcome : 'tie';
    const correct = topLabel === 'safe';
    if (memory.fingerprint() !== before) throw Error('Memory changed during a test');
    topLabels[topLabel]++;
    testRows.push(correct);
    log({ kind: 'test', arm, seed, id: positionId(p), top: top.length === 1 ? top[0] : null, topLabel, correct });
  }

  if (arm === 'none' && !(memory.size === 0 && memory.writes === 0 && memory.fingerprint() === empty)) {
    throw Error('No-memory arm changed memory');
  }

  return {
    arm,
    seed,
    trials: trial,
    writes: memory.writes,
    unknown,
    stored: memory.size,
    writtenOutcomes,
    test: testRows,
    testCorrect: testRows.filter(Boolean).length,
    topLabels,
    fingerprint: memory.fingerprint(),
  };
}

// rows: result objects from runArmV3 (one per arm and seed). testGames: gameId per test position.
export function judgeV3(rows, { seeds, testGames, minCorrect, minMargin }) {
  const comparators = ['raw', 'random', 'mismatched', 'none'];
  const perSeed = seeds.map(seed => {
    const row = arm => {
      const found = rows.find(r => r.arm === arm && r.seed === seed);
      if (!found) throw Error(`Missing row: ${arm} seed ${seed}`);
      return found;
    };
    const gate = pairGate({
      arms: Object.fromEntries(ARMS.map(a => [a, row(a).test])),
      games: testGames,
      primary: 'graph',
      comparators,
      minCorrect,
      minMargin,
      seed: 20261103,
    });
    return { seed, graphCorrect: gate.correct, gate, pass: gate.pass };
  });
  const pass = perSeed.every(s => s.pass);
  return { perSeed, pass, outcome: pass ? 'passes' : 'does not pass', rule: { minCorrect, minMargin, comparators } };
}
