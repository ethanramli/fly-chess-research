import { createHash } from 'node:crypto';
import { random } from '../supervised-baselines/trainer.mjs';
import { digest } from './mushroom-body.mjs';

export function makeCues(indices, seed, fraction) {
  const rng = random(seed), pool = [...indices];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const size = Math.max(1, Math.floor(pool.length * fraction));
  if (size * 2 > pool.length) throw Error('Insufficient distinct cue neurons');
  return { A: pool.slice(0, size), B: pool.slice(size, size * 2) };
}

// The choice decoder sees neural responses only. Teacher labels are absent.
export function choose(response, draw, exploration) {
  if (![response.A, response.B, draw, exploration].every(Number.isFinite) || draw < 0 || draw >= 1 || exploration < 0 || exploration > 1) throw Error('Invalid choice input');
  const greedy = response.A <= response.B ? 'A' : 'B';
  if (draw < exploration / 2) return 'A';
  if (draw < exploration) return 'B';
  return greedy;
}

export function teacherFeedback(choice, target) {
  if (!['A', 'B'].includes(choice) || !['A', 'B'].includes(target)) throw Error('Invalid teacher event');
  return choice === target;
}

// Opportunity control: visit each cue once before ordinary free choice. Cue
// order depends on seed parity only, never on the teacher's rewarded target.
export function samplingChoice(seed, trial, ordinaryChoice, balanced) {
  if (!balanced || trial >= 2) return ordinaryChoice;
  return (seed % 2 === 0 ? ['B', 'A'] : ['A', 'B'])[trial];
}

export function shuffledFeedback(events, seed) {
  const rng = random(seed), copy = [...events];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export function neuralMargin(response, target) {
  return target === 'A' ? response.B - response.A : response.A - response.B;
}

// Hash fixed anatomy and every nonplastic parameter; zero-copy sparse spans.
export function fixedStateHash(model, plasticEdges) {
  const h = createHash('sha256'), add = a => h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  for (const a of Object.values(model.graph)) add(a);
  for (const [key, a] of Object.entries(model.params)) {
    if (key !== 'magnitude') { add(a); continue; }
    let from = 0;
    for (const k of [...plasticEdges].sort((a, b) => a - b)) { add(a.subarray(from, k)); from = k + 1; }
    add(a.subarray(from));
  }
  return h.digest('hex');
}

// Exact one-sided sign test across independently drawn cue ensembles. Ties
// are excluded and reported; this is not a test across biological animals.
export function signTest(differences, tolerance) {
  const positive = differences.filter(d => d > tolerance).length;
  const negative = differences.filter(d => d < -tolerance).length;
  const n = positive + negative;
  if (!n) return { positive, negative, ties: differences.length, p: 1 };
  let sum = 0, coefficient = 1;
  for (let k = 0; k <= n; k++) {
    if (k >= positive) sum += coefficient;
    coefficient *= (n - k) / (k + 1);
  }
  return { positive, negative, ties: differences.length - n, p: sum / 2 ** n };
}

export function summarize(results, protocol) {
  const tolerance = protocol.marginTolerance;
  const bySeed = protocol.seeds.map(seed => {
    const groups = Object.fromEntries(results.filter(r => r.seed === seed).map(r => [r.condition, r]));
    if (protocol.conditions.some(c => !groups[c])) throw Error('Incomplete validation results');
    const r = groups.contingent;
    const acquisitionEffect = neuralMargin(r.probes.acquisition, r.initialTarget) - neuralMargin(r.probes.baseline, r.initialTarget);
    const reversalEffect = neuralMargin(r.probes.reversal, r.reversedTarget) - neuralMargin(r.probes.acquisition, r.reversedTarget);
    const controlEffect = c => neuralMargin(groups[c].probes.reversal, r.reversedTarget) - neuralMargin(groups[c].probes.acquisition, r.reversedTarget);
    const controlsUnchanged = ['no-feedback', 'plasticity-disabled'].every(c => {
      const g = groups[c];
      return ['acquisition', 'retention', 'reversal'].every(phase => digest(g.probes[phase]) === digest(g.probes.baseline));
    });
    return { seed, initialTarget: r.initialTarget, acquisitionEffect, reversalEffect,
      reversalAdvantageOverShuffled: reversalEffect - controlEffect('shuffled-feedback'),
      acquisitionChoiceCorrect: r.probes.acquisition.greedy === r.initialTarget,
      reversalChoiceCorrect: r.probes.reversal.greedy === r.reversedTarget,
      retentionIdentical: digest(r.probes.acquisition) === digest(r.probes.retention),
      resetRestoresBaseline: digest(r.probes.reset) === digest(r.probes.baseline),
      restoredMemoryRestoresChoice: digest(r.probes.restored) === digest(r.probes.reversal),
      controlsUnchanged,
      shuffledCountsMatched: ['acquisition', 'reversal'].every(phase => groups['shuffled-feedback'].trials.filter(t => t.phase === phase && t.delivered).length === r.trials.filter(t => t.phase === phase && t.delivered).length),
      fixedStatePreserved: protocol.conditions.every(c => groups[c].fixedStatePreserved),
    };
  });
  const tests = {
    acquisition: signTest(bySeed.map(r => r.acquisitionEffect), tolerance),
    reversal: signTest(bySeed.map(r => r.reversalEffect), tolerance),
    reversalVersusShuffled: signTest(bySeed.map(r => r.reversalAdvantageOverShuffled), tolerance),
  };
  const gates = {
    acquisition: tests.acquisition.p < protocol.alpha && bySeed.every(r => r.acquisitionChoiceCorrect),
    contingencyReversal: tests.reversal.p < protocol.alpha && bySeed.every(r => r.reversalChoiceCorrect),
    informativeFeedback: tests.reversalVersusShuffled.p < protocol.alpha,
    persistence: bySeed.every(r => r.retentionIdentical && r.restoredMemoryRestoresChoice),
    memoryCausality: bySeed.every(r => r.resetRestoresBaseline),
    controls: bySeed.every(r => r.controlsUnchanged && r.shuffledCountsMatched),
    fixedWiring: bySeed.every(r => r.fixedStatePreserved),
  };
  return { bySeed, tests, gates, allGatesPassed: Object.values(gates).every(Boolean),
    scope: protocol.claim,
    interpretation: 'Predetermined acceptance gates for this simulation. Outcomes are reported even if gates fail; no biological or chess claim follows.' };
}
