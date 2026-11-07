// Engineered memory test v2 task logic (2026-11-03). Pure: features come from the caller. Brain connections are never touched here. Design: documentation/design/neural-learning/engineered-memory-test-v2.md
import { createHash } from 'node:crypto';
import { NearestEpisodeMemory } from './kc-episodic-memory-v2.mjs';
import { frozenScores, pairGate } from './transfer-evaluation-v1.mjs';
import { chooseMove } from './move-chooser-v1.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';

export const ARMS = Object.freeze(['graph', 'raw', 'random', 'mismatched', 'none']);

const sha256 = text => createHash('sha256').update(text).digest('hex');

export function seededShuffle(list, seed) {
  const out = [...list];
  const rng = mulberry32(seed >>> 0);
  for (let i = out.length - 1; i >= 1; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function splitPairs(pairs, experienceCount = 96) {
  const ids = new Set(pairs.map(p => p.id));
  if (ids.size !== pairs.length) throw new Error('Duplicate pair id');
  if (pairs.length <= experienceCount) throw new Error('Not enough pairs to split');
  const key = p => sha256(`engineered-memory-v2-split:${p.id}`);
  const sorted = pairs.map(p => [key(p), p]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(x => x[1]);
  return { experience: sorted.slice(0, experienceCount), newBoards: sorted.slice(experienceCount) };
}

export function makeYoked(writtenOutcomes, seed) {
  if (!Array.isArray(writtenOutcomes) || writtenOutcomes.length === 0) throw new Error('No outcomes to yoke');
  if (!writtenOutcomes.every(v => v === 1 || v === -1)) throw new Error('Yoked values must be +1 or -1');
  return seededShuffle(writtenOutcomes, (seed ^ 0x5eed) >>> 0);
}

export function runArm({ arm, seed, experience, newBoards, featureOf, outcomeOf, yokedValues = null, epochs = 2, capacity = 256, k = 3, temperature = 0.1, log = () => {} }) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm: ${arm}`);
  if (arm === 'mismatched' && !(Array.isArray(yokedValues) && yokedValues.length > 0 && yokedValues.every(v => v === 1 || v === -1))) {
    throw new Error('mismatched arm needs yokedValues of +1 or -1');
  }
  const memory = new NearestEpisodeMemory({ capacity, k });
  const empty = memory.fingerprint();
  const reads = arm !== 'none', writesAllowed = arm !== 'none';
  const scoreKey = key => (reads ? memory.score(featureOf(key)) : 0);

  let trial = 0, writeIndex = 0, unknown = 0;
  const writtenOutcomes = [];
  for (let e = 0; e < epochs; e++) {
    const order = seededShuffle(experience, (seed * 31 + e) >>> 0);
    order.forEach((pair, p) => {
      trial++;
      const goodSlot = (p + e + seed) % 2 === 0 ? 'a' : 'b';
      const keyOf = name => (name === goodSlot ? pair.good : pair.bad);
      const r = chooseMove({ moves: ['a', 'b'], score: name => scoreKey(keyOf(name)), fingerprint: () => memory.fingerprint(), temperature, seed, trial });
      const chosenKey = keyOf(r.move);
      const chosen = r.move === goodSlot ? 'good' : 'bad';
      const outcome = outcomeOf(chosenKey);
      let written = null;
      if (outcome === null) {
        unknown++;
      } else {
        writtenOutcomes.push(outcome);
        const value = arm === 'mismatched' ? yokedValues[writeIndex % yokedValues.length] : outcome;
        if (writesAllowed) {
          written = value;
          memory.write(featureOf(chosenKey), value, sha256(JSON.stringify({ arm, seed, trial, key: chosenKey, outcome, value })));
        }
        writeIndex++;
      }
      log({ kind: 'trial', arm, seed, epoch: e, trial, pair: pair.id, goodSlot, scores: r.scores, choice: r.move, chosen, outcome, written });
    });
  }

  const seen = [], newFlags = [];
  for (const [name, set] of [['seen', experience], ['new', newBoards]]) {
    const before = memory.fingerprint();
    const results = set.map(pair => {
      const scores = frozenScores(['good', 'bad'], c => scoreKey(pair[c]), () => memory.fingerprint());
      const correct = scores[0] > scores[1];
      log({ kind: 'test', arm, seed, set: name, pair: pair.id, scores, correct });
      return correct;
    });
    if (memory.fingerprint() !== before) throw new Error('Memory changed during a test');
    if (name === 'seen') seen.push(...results); else newFlags.push(...results);
  }

  if (arm === 'none' && !(memory.size === 0 && memory.writes === 0 && memory.fingerprint() === empty)) {
    throw new Error('No-memory arm changed memory');
  }

  return {
    arm, seed, trials: trial, writes: memory.writes, unknown, stored: memory.size, writtenOutcomes,
    seen, newBoards: newFlags,
    seenCorrect: seen.filter(Boolean).length,
    newCorrect: newFlags.filter(Boolean).length,
    fingerprint: memory.fingerprint(),
  };
}

export function judge(rows, { seeds, newGames, minSeen = 77, minNew = 26, minMargin = 4 }) {
  const comparators = ['raw', 'random', 'mismatched', 'none'];
  const perSeed = seeds.map(seed => {
    const row = arm => {
      const found = rows.find(r => r.seed === seed && r.arm === arm);
      if (!found) throw new Error(`Missing row: arm ${arm}, seed ${seed}`);
      return found;
    };
    const graph = row('graph');
    const seenOk = graph.seenCorrect >= minSeen;
    const gate = pairGate({
      arms: Object.fromEntries(ARMS.map(a => [a, row(a).newBoards])),
      games: newGames,
      primary: 'graph',
      comparators,
      minCorrect: minNew,
      minMargin,
      seed: 20261103,
    });
    return { seed, seenOk, graphSeen: graph.seenCorrect, graphNew: gate.correct, gate, pass: seenOk && gate.pass };
  });
  const storeFault = perSeed.some(s => !s.seenOk);
  const pass = !storeFault && perSeed.every(s => s.pass);
  const rawShortcut = seeds.some(seed => rows.find(r => r.seed === seed && r.arm === 'raw')?.newCorrect >= minNew);
  const outcome = storeFault ? 'store fault: result not interpretable' : pass ? 'passes' : 'does not pass';
  return { perSeed, storeFault, pass, rawShortcut, outcome, rule: { minSeen, minNew, minMargin, comparators } };
}
