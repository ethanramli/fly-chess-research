import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Summarize completed runs only. Inputs are retained in the output so endpoint
// comparisons cannot be mistaken for matched time-to-quality measurements.
const [out, ...dirs] = process.argv.slice(2);
if (!out || !dirs.length) throw Error('Usage: node scripts/summarize-pilot.mjs REPORT.json RUN_DIRECTORY ...');
const runs = dirs.map(dir => {
  const events = readFileSync(join(dir, 'metrics.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const start = events.find(e => e.event === 'start'), finish = events.findLast(e => e.event === 'finish');
  if (!start || !finish || finish.interrupted) throw Error(`Run incomplete: ${dir}`);
  const validations = events.filter(e => e.event === 'validation');
  if (validations.length < 2) throw Error(`Validation endpoints missing: ${dir}`);
  const circuits = events.filter(e => e.event === 'circuit');
  const accepted = circuits.filter(e => e.accepted);
  const tinyGain = circuits.filter(e => e.accepted && (e.anchorLoss - e.trueLoss) / Math.max(e.anchorLoss, 1e-12) < 1e-4);
  return { directory: dir, config: start.config, algorithm: start.state.algorithm ?? { mode: 'exact' },
    learningRate: start.state.learningRate, cpuDuty: start.cpuDuty ?? 1,
    processCPUSeconds: finish.cpuSeconds === undefined ? null : finish.cpuSeconds - (start.cpuSeconds ?? 0),
    startUpdates: start.state.updates, endUpdates: finish.state.updates,
    processedPairs: finish.processedPairs, initialValidation: validations[0], finalValidation: validations.at(-1),
    wallSeconds: (Date.parse(finish.time) - Date.parse(start.time)) / 1000,
    trainingAndFinalValidationSeconds: finish.trainingAndFinalValidationSeconds,
    peakResidentMiB: Math.max(...events.map(e => e.peakResidentMiB)),
    circuitBursts: circuits.length, acceptedBursts: accepted.length,
    burstsWithRelativeGainBelowOneTenThousandth: tinyGain.length,
    circuitSeconds: circuits.reduce((sum, e) => sum + e.seconds, 0),
    distinctBlocksVisited: new Set(circuits.map(e => e.block)).size,
    plannedBlocks: start.circuitBlocks ?? 0, plannedCoverageNeurons: start.circuitCoverageNeurons ?? 0,
    identity: start.state.identity };
});
const report = { timestamp: new Date().toISOString(), runs,
  limitations: ['One seed and small development dataset with two rule-generated labels',
    'Endpoint losses and different elapsed times do not establish time-to-quality superiority',
    'Tiny local gains are measured on the active training pair, not held-out data',
    'RSS observations are process-specific soft measurements, not an OS hard cap',
    'Final test data remain untouched'] };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
