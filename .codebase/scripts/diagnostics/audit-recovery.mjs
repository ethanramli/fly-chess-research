// Independent audit of experiment records and local updates. Does not import
// the experiment driver, decoder, plasticity class or gate implementation.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' }, replay: { type: 'string' } } });
if (!args.run || !args.out || existsSync(args.out)) throw Error('Require --run DIR --out NEW_JSON');
const report = JSON.parse(readFileSync(join(args.run, 'report.json'))), p = report.protocol;
const mapping = JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
if (!report.complete) throw Error('Require completed report');
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b), checks = [];
const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
const expectedChoice = probe => probe.A.score >= probe.B.score ? 'A' : 'B';
const score = r => r.MBON12 - r.MBON01;
const other = c => c === 'A' ? 'B' : 'A';
const margin = (probe, safe) => probe[safe].score - probe[other(safe)].score;
check('completed condition/seed coverage', report.results.length === p.seeds.length * p.conditions.length && p.seeds.every(seed => p.conditions.every(condition => report.results.filter(r => r.job.seed === seed && r.job.condition === condition).length === 1)));
for (const [path, hash] of Object.entries(report.identity.inputs)) check(`input: ${path}`, createHash('sha256').update(readFileSync(path)).digest('hex') === hash);
for (const [path, hash] of Object.entries(report.identity.sources)) check(`source: ${path}`, createHash('sha256').update(readFileSync(path)).digest('hex') === hash);
const perSeed = [];
for (const seed of p.seeds) {
  const g = Object.fromEntries(report.results.filter(r => r.job.seed === seed).map(r => [r.job.condition, r]));
  for (const condition of p.conditions) {
    const r = g[condition];
    const expectedPunished = p.seeds.indexOf(seed) % 2 === 0 ? 'A' : 'B';
    check(`${seed}/${condition}: counterbalanced target and identical cue pool`, r.job.initialPunished === expectedPunished && r.job.reversedPunished === other(expectedPunished) && exact(r.cues, g.informative.cues));
    check(`${seed}/${condition}: disjoint nonempty cues`, r.cues.A.length > 0 && r.cues.B.length > 0 && new Set([...r.cues.A, ...r.cues.B]).size === r.cues.A.length + r.cues.B.length);
    check(`${seed}/${condition}: complete balanced cue/target/pulse schedule`, r.trials.length === p.acquisitionTrials + p.reversalTrials && r.trials.every((t, i) => {
      const acq = i < p.acquisitionTrials, trial = acq ? i : i - p.acquisitionTrials;
      const cue = (seed % 2 ? ['A','B'] : ['B','A'])[trial % 2];
      const punished = acq ? r.job.initialPunished : r.job.reversedPunished;
      return t.cue === cue && t.punished === punished && t.trial === trial && t.phase === (acq ? 'acquisition' : 'reversal') &&
        (condition === 'absent' ? !t.delivered : condition === 'shuffled' ? true : t.delivered === (cue === punished));
    }));
    check(`${seed}/${condition}: fixed score/choice`, Object.values(r.probes).every(v => v.choice === expectedChoice(v) && [v.A, v.B].every(w => w.score === score(w))));
    check(`${seed}/${condition}: reset/restoration`, exact(r.probes.reset, r.probes.baseline) && exact(r.probes.restored, r.probes.reversal));
    check(`${seed}/${condition}: fixed graph and nonplastic parameters`, r.fixedStatePreserved);
    check(`${seed}/${condition}: efficacy bounds`, r.memory.gains.every(v => Number.isFinite(v) && v >= p.minGain && v <= p.maxGain));
    if (condition === 'disabled') check(`${seed}: disabled control unchanged`, r.memory.events === 0 && r.memory.gains.every(v => v === 1) && ['acquisition','reversal'].every(k => exact(r.probes[k], r.probes.baseline)));
    if (condition === 'shuffled') check(`${seed}: phase pulse counts matched`, ['acquisition','reversal'].every(phase => r.trials.filter(t => t.phase === phase && t.delivered).length === g.informative.trials.filter(t => t.phase === phase && t.delivered).length));
    if (condition === 'shuffled') check(`${seed}: independently reconstructed phase permutation`, ['acquisition','reversal'].every((phase, phaseIndex) => {
      const events = g.informative.trials.filter(t => t.phase === phase).map(t => t.delivered);
      let rng = (seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0;
      for (let i = events.length - 1; i > 0; i--) {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        const j = Math.floor(rng / 2 ** 32 * (i + 1)); [events[i], events[j]] = [events[j], events[i]];
      }
      return exact(events, r.trials.filter(t => t.phase === phase).map(t => t.delivered));
    }));
  }
  const r = g.informative, safe = other(r.job.reversedPunished);
  const effect = v => margin(v.probes.reversal, safe) - margin(v.probes.acquisition, safe);
  perSeed.push({ seed, acquisitionCorrect: r.probes.acquisition.choice === other(r.job.initialPunished),
    reversalCorrect: r.probes.reversal.choice === safe,
    acquisitionEffect: margin(r.probes.acquisition, other(r.job.initialPunished)) - margin(r.probes.baseline, other(r.job.initialPunished)),
    reversalEffect: effect(r), absentAdvantage: effect(r) - effect(g.absent), shuffledAdvantage: effect(r) - effect(g.shuffled) });
}
const checkpointNames = readdirSync(args.run).filter(n => /^checkpoint-\d{5}$/.test(n)).sort();
let previous = null, checkedUpdates = 0, updateErrors = [];
for (const name of checkpointNames) {
  const s = JSON.parse(readFileSync(join(args.run, name, 'state.json'))), a = s.active;
  if (a && previous?.active && exact(a.job, previous.active.job) && a.nextTrial === previous.active.nextTrial + 1) {
    const old = previous.active.memory, now = a.memory, local = a.lastLocal, disabled = a.job.condition === 'disabled';
    let offset = 0, expected = [];
    if (disabled) expected = [...old.gains];
    else for (let j = 0; j < local.factors.length; j++) {
      for (let i = 0; i < mapping.groups[j].edges.length; i++, offset++) {
        const gain = old.gains[offset], D = local.factors[j], kc = local.kc[offset];
        expected.push(Math.max(p.minGain, Math.min(p.maxGain, gain + p.eta * D * (kc + gain - 1))));
      }
    }
    const valid = exact(expected, now.gains) && now.events === old.events + (disabled ? 0 : 1) &&
      digest(old) === local.beforeHash && digest(now) === local.afterHash &&
      (disabled || local.factors.length === 4 && local.factors.every(D => Number.isFinite(D) && D <= 0 && -p.eta * D <= 1));
    if (!valid) updateErrors.push(name); checkedUpdates++;
  }
  previous = s;
}
check('all local update checkpoints audited', checkedUpdates === p.seeds.length * p.conditions.length * (p.acquisitionTrials + p.reversalTrials) && updateErrors.length === 0);
for (const row of perSeed) {
  const published = report.summary.bySeed.find(r => r.seed === row.seed);
  check(`${row.seed}: independent effect/choice calculations`, Object.entries(row).every(([key,value]) => published[key === 'acquisitionCorrect' ? 'acquisitionChoiceCorrect' : key === 'reversalCorrect' ? 'reversalChoiceCorrect' : key] === value));
}
for (const key of ['acquisitionEffect','reversalEffect','absentAdvantage','shuffledAdvantage']) {
  const values = perSeed.map(r => r[key]), n = values.filter(v => Math.abs(v) > p.tolerance).length;
  const positive = values.filter(v => v > p.tolerance).length;
  // Enumerate all fair sign assignments for the six-seed panel, independently
  // of the experiment's binomial-coefficient implementation.
  let count = 0;
  for (let mask = 0; mask < 2 ** n; mask++) { let bits = 0; for (let i = 0; i < n; i++) bits += (mask >>> i) & 1; if (bits >= positive) count++; }
  const expected = n ? count / 2 ** n : 1, observed = report.summary.tests[key];
  check(`independent sign test: ${key}`, observed.p === expected && observed.positive === positive && observed.negative === n - positive && observed.ties === values.length - n);
}
check('acquisition/reversal gate retains every correct-choice requirement',
  report.summary.gates.acquisition === perSeed.every(r => r.acquisitionCorrect && r.acquisitionEffect > p.tolerance) &&
  report.summary.gates.reversal === perSeed.every(r => r.reversalCorrect && r.reversalEffect > p.tolerance));
check('full acceptance matches all reported gates', report.summary.allGatesPassed === Object.values(report.summary.gates).every(Boolean));
let replay = null;
if (args.replay) {
  const b = JSON.parse(readFileSync(join(args.replay, 'report.json')));
  replay = b.complete && exact(report.results, b.results) && exact(report.summary, b.summary) && exact(report.identity, b.identity);
  check('exact completed scientific replay', replay);
}
const result = { allChecksPassed: checks.every(c => c.passed), checks, perSeed, checkedUpdates, updateErrors, replay,
  reportSHA256: createHash('sha256').update(readFileSync(join(args.run, 'report.json'))).digest('hex'),
  originalAcceptance: report.summary.gates, originalAllGatesPassed: report.summary.allGatesPassed,
  scope: 'Record consistency and candidate local-update recurrence; does not establish biology or replace failed acceptance' };
writeFileSync(args.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ allChecksPassed: result.allChecksPassed, checkedUpdates, updateErrors, perSeed, replay }));
if (!result.allChecksPassed) process.exitCode = 2;
