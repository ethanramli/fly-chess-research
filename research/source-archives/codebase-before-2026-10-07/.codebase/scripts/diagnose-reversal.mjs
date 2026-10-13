// Observational analysis only: does not rerun, tune, or replace frozen gates.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: {
  report: { type: 'string' }, out: { type: 'string' },
} });
if (!args.report || !args.out) throw Error('Require --report REPORT_JSON --out NEW_JSON');
if (existsSync(args.out)) throw Error('Output already exists; preserve prior reports');
const bytes = readFileSync(args.report), raw = JSON.parse(bytes);
if (!raw.complete || raw.results.length !== raw.totalJobs) throw Error('Require completed experiment');
const signed = (r, target) => target === 'A' ? r.B - r.A : r.A - r.B;
const greedy = r => r.A <= r.B ? 'A' : 'B';
const rows = raw.results.map(r => {
  const old = r.initialTarget, next = r.reversedTarget;
  if (!['A', 'B'].includes(old) || !['A', 'B'].includes(next) || old === next) throw Error('Invalid targets');
  const counts = phase => {
    const trials = r.trials.filter(t => t.phase === phase);
    return { trials: trials.length, choices: Object.fromEntries(['A', 'B'].map(c => [c, trials.filter(t => t.choice === c).length])),
      pulses: Object.fromEntries(['A', 'B'].map(c => [c, trials.filter(t => t.choice === c && t.delivered).length])) };
  };
  if (r.trials.length !== raw.protocol.acquisitionTrials + raw.protocol.reversalTrials) throw Error('Incomplete trial history');
  const transitions = r.trials.map((t, i) => {
    const after = r.trials[i + 1] ?? r.probes.reversal;
    if (![t.A, t.B, after.A, after.B].every(Number.isFinite) || !['A', 'B'].includes(t.choice)) throw Error('Invalid response');
    return { phase: t.phase, trial: t.trial, choice: t.choice, delivered: t.delivered,
      before: { A: t.A, B: t.B }, nextRecorded: { A: after.A, B: after.B },
      deltaA: after.A - t.A, deltaB: after.B - t.B,
      newTargetMarginBefore: signed(t, next), newTargetMarginAfter: signed(after, next),
      greedyBefore: greedy(t), greedyAfter: greedy(after) };
  });
  // Adjacent observations include cue, interval, residual traces, and (at a
  // phase boundary) probes. They are not isolated causal omission effects.
  const omittedOld = transitions.filter(t => t.phase === 'reversal' && t.choice === old && !t.delivered);
  const average = (list, fn) => list.length ? list.reduce((s, t) => s + fn(t), 0) / list.length : null;
  const baseline = r.probes.baseline, acquired = r.probes.acquisition, final = r.probes.reversal;
  return { seed: r.seed, condition: r.condition, oldTarget: old, newTarget: next,
    acquisition: counts('acquisition'), reversal: counts('reversal'),
    baselineNewTargetMargin: signed(baseline, next), acquiredNewTargetMargin: signed(acquired, next),
    finalNewTargetMargin: signed(final, next), finalChoice: greedy(final), reversedChoiceCorrect: greedy(final) === next,
    oldCueAcquisitionDepression: baseline[old] - acquired[old],
    oldCueReversalRecovery: final[old] - acquired[old],
    newCueReversalDepression: acquired[next] - final[next],
    // Algebraic decomposition; neither term alone establishes causation.
    reversalMarginChange: signed(final, next) - signed(acquired, next),
    oldCueOmissionObservations: omittedOld.length,
    meanOldCueDeltaAfterOmission: average(omittedOld, t => old === 'A' ? t.deltaA : t.deltaB),
    transitions };
});
const checks = rows.map(r => ({ seed: r.seed, condition: r.condition,
  decompositionMatches: Math.abs(r.reversalMarginChange - r.oldCueReversalRecovery - r.newCueReversalDepression) < 1e-12 }));
if (!checks.every(c => c.decompositionMatches)) throw Error('Margin decomposition inconsistent');
const contingent = rows.filter(r => r.condition === 'contingent');
const result = { schema: 'observed-reversal-diagnostic-v1', source: args.report,
  sourceSHA256: createHash('sha256').update(bytes).digest('hex'), command: process.argv,
  originalAcceptance: raw.summary.gates, originalAllGatesPassed: raw.summary.allGatesPassed,
  reversedChoicesCorrect: contingent.filter(r => r.reversedChoiceCorrect).length,
  failedSeeds: contingent.filter(r => !r.reversedChoiceCorrect).map(r => r.seed), checks, rows,
  limitations: [
    'Post-hoc descriptive diagnostic, not a new acceptance test or biological prediction.',
    'Next-recorded response differences include intervening timing and residual traces; they do not isolate omission causality.',
    'Reward counts are policy-dependent; their association with success does not prove that extra trials would rescue failure.',
    'No per-trial efficacy snapshots in this report; cannot infer local gain changes from aggregate MBON responses.',
    'No new model run, learning mechanism, parameter change, neural feedback interface, or chess transfer result.',
  ] };
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(`${args.out}.partial`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ sourceSHA256: result.sourceSHA256, failedSeeds: result.failedSeeds,
  originalAllGatesPassed: result.originalAllGatesPassed,
  contingent: contingent.map(({ transitions, ...row }) => row) }, null, 2));
