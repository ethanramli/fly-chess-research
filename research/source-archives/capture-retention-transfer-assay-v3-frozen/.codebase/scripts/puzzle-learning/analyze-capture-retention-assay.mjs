import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { random } from '../../src/supervised-baselines/trainer.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const auditScript = '.codebase/scripts/puzzle-learning/audit-capture-retention-assay.mjs';
const root = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Pass the frozen run root');
const outPath = resolve(process.argv[3] ?? join(root, 'aggregate.json'));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const p = read(protocolPath);
assert.deepEqual(p.analysis, { script: '.codebase/scripts/puzzle-learning/analyze-capture-retention-assay.mjs',
  bootstrapReplicates: 10_000, bootstrapSeed: 20261008, seedsWithReplacement: 5,
  finalPanelsWithReplacement: 8, oneSidedPercentile: 0.05 });
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Pinned identity differs: ${path}`);
const reports = new Map(), audits = [], runHashes = [];
for (const seed of p.seeds) for (const condition of p.conditions) {
  const runPath = join(root, `seed-${seed}-${condition}`);
  assert.ok(existsSync(runPath), `Missing run: ${runPath}`);
  const stdout = execFileSync(process.execPath, ['--max-old-space-size=256', auditScript, runPath],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const audit = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(audit.passed, true); audits.push(audit);
  const report = read(join(runPath, 'report.json'));
  assert.equal(report.seed, seed); assert.equal(report.condition, condition);
  reports.set(`${seed}/${condition}`, report);
  runHashes.push({ seed, condition, reportSha256: await sha256(join(runPath, 'report.json')),
    completionSha256: await sha256(join(runPath, 'COMPLETE')) });
}
assert.equal(reports.size, p.seeds.length * p.conditions.length);
const byCondition = (seed, condition) => reports.get(`${seed}/${condition}`);
const controls = ['no-channel', 'shuffled', 'disabled'];
const pairedDifferences = Object.fromEntries(controls.map(control => [control,
  p.seeds.map(seed => {
    const info = byCondition(seed, 'informative'), other = byCondition(seed, control);
    const lookup = report => new Map(report.final.map(row => [row.panelId, row.margin]));
    const a = lookup(info), b = lookup(other);
    assert.equal(a.size, 8); assert.equal(b.size, 8);
    return [...a.keys()].map(panelId => a.get(panelId) - b.get(panelId));
  })]));
const bootstrapLower = (matrix, replicates = 10_000, seed = 20261008) => {
  const rng = random(seed), values = new Float64Array(replicates), seedN = matrix.length, panelN = matrix[0].length;
  for (let r = 0; r < replicates; r++) {
    let sum = 0;
    for (let i = 0; i < seedN; i++) {
      const s = Math.floor(rng() * seedN);
      for (let j = 0; j < panelN; j++) {
        const panel = Math.floor(rng() * panelN); sum += matrix[s][panel];
      }
    }
    values[r] = sum / (seedN * panelN);
  }
  values.sort();
  return { lower95OneSided: values[Math.floor(0.05 * replicates)], replicates, seed,
    method: 'Independent resampling with replacement of model-seed clusters (5) and final-panel clusters (8); percentile 5th point.' };
};
const effects = Object.fromEntries(controls.map(control => {
  const matrix = pairedDifferences[control];
  return [control, { meanPairedMarginDifference: matrix.flat().reduce((a, b) => a + b, 0) / 40,
    bootstrap: bootstrapLower(matrix) }];
}));
const seedResults = p.seeds.map(seed => {
  const info = byCondition(seed, 'informative');
  const count = info.final.filter(row => row.correct).length;
  const pairRows = info.final.filter(row => ['te-01', 'te-05'].includes(row.panelId));
  const pairCorrect = pairRows.length === 2
    && pairRows.find(row => row.panelId === 'te-01')?.chosenMove === 'a2a4'
    && pairRows.find(row => row.panelId === 'te-05')?.chosenMove === 'e2e6';
  const scrambled = byCondition(seed, 'informative').roleScrambled;
  const scrambledPair = scrambled.filter(row => ['te-01', 'te-05'].includes(row.panelId));
  const scrambledPairCorrect = scrambledPair.length === 2
    && scrambledPair.find(row => row.panelId === 'te-01')?.chosenMove === 'a2a4'
    && scrambledPair.find(row => row.panelId === 'te-05')?.chosenMove === 'e2e6';
  return { seed, informativeFinalCorrectPanels: count, informativeMeanFinalMargin:
    info.final.reduce((n, row) => n + row.margin, 0) / 8,
    counterfactualPairCorrect: pairCorrect, roleScrambledPairCorrect: scrambledPairCorrect,
    roleScrambleReducedPairAccuracy: pairCorrect && !scrambledPairCorrect };
});
const informativeMeanMargin = seedResults.reduce((n, row) => n + row.informativeMeanFinalMargin, 0) / seedResults.length;
const nearest = read('research/reports/capture-retention-nearest-cue-baseline-2026-10-07/report.json');
const informativeAccuracy = seedResults.reduce((n, row) => n + row.informativeFinalCorrectPanels, 0) / 40;
const informativePairRate = seedResults.filter(row => row.counterfactualPairCorrect).length / 5;
const nearestShortcutMeetsOrExceeds = nearest.result.pairChoiceAccuracy >= informativeAccuracy
  && Number(nearest.result.counterfactualPairCorrect) >= informativePairRate;
const gates = {
  positiveInformativeMeanFinalMargin: informativeMeanMargin > 0,
  exceedsEachControlWithPositiveClusterBootstrapLowerBound: controls.every(control =>
    effects[control].meanPairedMarginDifference > 0 && effects[control].bootstrap.lower95OneSided > 0),
  atLeastSixOfEightFinalPanelsInAtLeastFourSeeds: seedResults.filter(row => row.informativeFinalCorrectPanels >= 6).length >= 4,
  counterfactualPairCorrectInAtLeastFourSeeds: seedResults.filter(row => row.counterfactualPairCorrect).length >= 4,
  roleScrambleReducesPairAccuracyInAtLeastFourSeeds: seedResults.filter(row => row.roleScrambleReducedPairAccuracy).length >= 4,
  nearestCueShortcutDoesNotMeetOrExceedNeuralAccuracyAndPairRate: !nearestShortcutMeetsOrExceeds
};
const summary = {
  schema: 'capture-retention-assay-aggregate-v3', protocolSha256: await sha256(protocolPath),
  seedConditions: [...reports.keys()], runHashes, auditCount: audits.length, audits,
  informativeSeedResults: seedResults, pairedMarginEffects: effects,
  nearestCue: { pairChoiceAccuracy: nearest.result.pairChoiceAccuracy,
    counterfactualPairCorrect: nearest.result.counterfactualPairCorrect,
    neuralFinalPanelAccuracy: informativeAccuracy, neuralCounterfactualPairRate: informativePairRate,
    shortcutMeetsOrExceeds: nearestShortcutMeetsOrExceeds },
  gates, passed: Object.values(gates).every(Boolean),
  scope: 'Narrow one-ply capture-retention choice transfer only; no Monte Carlo search, chess strategy, Elo, or broad reasoning claim.'
};
mkdirSync(dirname(outPath), { recursive: true });
const text = JSON.stringify(summary, null, 2) + '\n';
writeFileSync(`${outPath}.partial`, text, { flag: 'wx' }); renameSync(`${outPath}.partial`, outPath);
const marker = { schema: 'capture-retention-assay-aggregate-complete-v3',
  reportSha256: await sha256(outPath), protocolSha256: await sha256(protocolPath), passed: summary.passed };
writeFileSync(`${outPath}.COMPLETE.partial`, JSON.stringify(marker, null, 2) + '\n', { flag: 'wx' });
renameSync(`${outPath}.COMPLETE.partial`, `${outPath}.COMPLETE`);
console.log(JSON.stringify({ reportPath: outPath.replaceAll('\\', '/'), passed: summary.passed, gates }));
