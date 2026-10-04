// Independent consistency/causality audit of raw experiment records. Does not
// import the choice function, teacher function, acceptance code or plasticity.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

const { values: args } = parseArgs({ options: {
  report: { type: 'string' }, out: { type: 'string' },
  'prefix-direct': { type: 'string' }, 'prefix-resumed': { type: 'string' },
} });
if (!args.report || !args.out) throw Error('Require --report REPORT_JSON --out NEW_AUDIT_JSON');
const raw = JSON.parse(readFileSync(args.report, 'utf8'));
if (!raw.complete || raw.results.length !== raw.totalJobs) throw Error('Require completed raw experiment');
const protocol = raw.protocol, checks = [], counts = [], rows = [];
function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); }
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const readout = r => r.A <= r.B ? 'A' : 'B';
const margin = (r, target) => target === 'A' ? r.B - r.A : r.A - r.B;
for (const seed of protocol.seeds) {
  const groups = Object.fromEntries(raw.results.filter(r => r.seed === seed).map(r => [r.condition, r]));
  check(`seed-${seed}: conditions present once`, raw.results.filter(r => r.seed === seed).length === protocol.conditions.length && protocol.conditions.every(c => groups[c]));
  for (const condition of protocol.conditions) {
    const r = groups[condition];
    if (!r) continue;
    let rngState = (seed ^ 0x8c71a532) >>> 0;
    check(`${seed}/${condition}: complete trial count`, r.trials.length === protocol.acquisitionTrials + protocol.reversalTrials);
    let choicesValid = true, outcomesValid = true, pulsesValid = true, drawsValid = true;
    for (let index = 0; index < r.trials.length; index++) {
      const t = r.trials[index];
      rngState = (Math.imul(1664525, rngState) + 1013904223) >>> 0;
      drawsValid &&= t.draw === rngState / 2 ** 32;
      const ordinary = t.draw < protocol.exploration / 2 ? 'A' : t.draw < protocol.exploration ? 'B' : readout(t);
      const expected = protocol.balancedSampling && t.trial < 2 ? (seed % 2 ? ['A', 'B'] : ['B', 'A'])[t.trial] : ordinary;
      choicesValid &&= t.choice === expected;
      const acquisition = index < protocol.acquisitionTrials;
      outcomesValid &&= t.phase === (acquisition ? 'acquisition' : 'reversal') && t.trial === (acquisition ? index : index - protocol.acquisitionTrials) && t.correct === (t.choice === (acquisition ? r.initialTarget : r.reversedTarget));
      pulsesValid &&= t.delivered ? Number.isFinite(t.evokedDopamine) && t.evokedDopamine > 0 : t.evokedDopamine === 0;
      if (condition === 'contingent' || condition === 'plasticity-disabled') pulsesValid &&= t.delivered === t.correct;
      if (condition === 'no-feedback') pulsesValid &&= !t.delivered;
    }
    check(`${seed}/${condition}: label-blind sampling and response-only free choice`, choicesValid);
    check(`${seed}/${condition}: reproducible exploration`, drawsValid);
    check(`${seed}/${condition}: independent teacher labels/cursor`, outcomesValid);
    check(`${seed}/${condition}: delivered mapped-neuron stimulation`, pulsesValid);
    check(`${seed}/${condition}: probe choices match responses`, Object.values(r.probes).every(p => p.greedy === readout(p)));
    check(`${seed}/${condition}: reset removes acquired effect`, exact(r.probes.reset, r.probes.baseline));
    check(`${seed}/${condition}: restored memory restores responses`, exact(r.probes.restored, r.probes.reversal));
    check(`${seed}/${condition}: retention state persistence`, exact(r.probes.acquisition, r.probes.retention));
    check(`${seed}/${condition}: fixed graph/nonplastic state`, r.fixedStatePreserved);
    if (condition === 'no-feedback' || condition === 'plasticity-disabled') check(`${seed}/${condition}: no acquired response or efficacy change`,
      ['acquisition', 'retention', 'reversal'].every(phase => exact(r.probes[phase], r.probes.baseline)) && r.memory.gains.every(g => g === 1));
    const phaseCount = phase => r.trials.filter(t => t.phase === phase && t.delivered).length;
    if (condition === 'shuffled-feedback') check(`${seed}/${condition}: matched phase pulse counts`,
      ['acquisition', 'reversal'].every(phase => phaseCount(phase) === groups.contingent.trials.filter(t => t.phase === phase && t.delivered).length));
    counts.push({ seed, condition, acquisitionRewards: phaseCount('acquisition'), reversalRewards: phaseCount('reversal'),
      acquisitionCorrectChoices: r.trials.filter(t => t.phase === 'acquisition' && t.correct).length,
      reversalCorrectChoices: r.trials.filter(t => t.phase === 'reversal' && t.correct).length,
      changedEligibleGains: r.memory.gains.filter(g => g !== 1).length });
    rows.push({ seed, condition, baselineCorrect: r.probes.baseline.greedy === r.initialTarget,
      acquisitionCorrect: r.probes.acquisition.greedy === r.initialTarget,
      reversalCorrect: r.probes.reversal.greedy === r.reversedTarget,
      acquisitionMarginChange: margin(r.probes.acquisition, r.initialTarget) - margin(r.probes.baseline, r.initialTarget),
      reversalMarginChange: margin(r.probes.reversal, r.reversedTarget) - margin(r.probes.acquisition, r.reversedTarget) });
  }
}
let prefixReplay = null;
if (args['prefix-direct'] || args['prefix-resumed']) {
  if (!args['prefix-direct'] || !args['prefix-resumed']) throw Error('Require both prefix state paths');
  const a = JSON.parse(readFileSync(args['prefix-direct'], 'utf8')), b = JSON.parse(readFileSync(args['prefix-resumed'], 'utf8'));
  delete a.checkpoint; delete b.checkpoint; // Atomic publication counters differ on resume.
  prefixReplay = { exactScientificStateMatch: exact(a, b), nextTrial: b.active?.nextTrial,
    scientificStateHash: createHash('sha256').update(JSON.stringify(a)).digest('hex') };
  check('prefix resume: exact trial/trace/gain/history state without duplicate feedback', prefixReplay.exactScientificStateMatch);
}
const aggregate = protocol.conditions.map(condition => {
  const selected = rows.filter(r => r.condition === condition);
  return { condition, seeds: selected.length, baselineCorrect: selected.filter(r => r.baselineCorrect).length,
    acquisitionCorrect: selected.filter(r => r.acquisitionCorrect).length,
    reversalCorrect: selected.filter(r => r.reversalCorrect).length };
});
const audit = { report: args.report, rawReportHash: createHash('sha256').update(readFileSync(args.report)).digest('hex'),
  allAuditChecksPassed: checks.every(c => c.passed), checks, aggregate, perSeed: rows, feedbackCounts: counts, prefixReplay,
  distinction: 'An audit pass verifies recorded experiment consistency and causal ablations; it does not override failed learning acceptance gates.' };
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(`${args.out}.partial`, JSON.stringify(audit, null, 2), { flag: 'wx' }); renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ allAuditChecksPassed: audit.allAuditChecksPassed, aggregate, prefixReplay }));
if (!audit.allAuditChecksPassed) process.exitCode = 2;
