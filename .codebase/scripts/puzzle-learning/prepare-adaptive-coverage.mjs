// Prepare a separate runner; never modify frozen prior experiments.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const runner = '.codebase/scripts/puzzle-learning/train-adaptive-coverage.mjs';
const protocolPath = 'research/data/adaptive-two-valence-v1/protocol.json';
if (existsSync(runner) || existsSync(protocolPath)) throw Error('Refuse to overwrite prepared sources');
const old = JSON.parse(readFileSync('research/data/compartment-puzzle-pipeline-v1/protocol.json'));
const p = { ...old, schema: 'adaptive-two-valence-v1', conditions: ['adaptive','fixed','absent','shuffled','disabled'],
  attemptsPerPuzzle: 8, maxExperiences: 80, maxPresentationsPerCondition: 4096,
  verification: { maxNodes: 4096, milliseconds: 2000 }, fixedPlans: old.commonPlans,
  schedule: 'Eight current-choice reviews per fixture, all legal moves retained; exact adaptive sequence in controls. Fixed condition repeats each archived four-event schedule twice. Whole-panel naive/final assessment.',
  acceptance: 'Both final adaptive choices successful; at least one naive failure repaired while absent and disabled remain failing. Nondegenerate shuffle and repair above shuffled required. Exact reset/repeat/restoration and independent audits mandatory. Single-seed training-fixture diagnostic, not reasoning or transfer.',
  scope: 'Two-valence adaptive coverage diagnostic; no new dynamics, natural reward pathway, delayed eligibility, learned leaf evaluation or transfer evidence.' };
mkdirSync('research/data/adaptive-two-valence-v1', { recursive: true });
writeFileSync(protocolPath, JSON.stringify(p, null, 2) + '\n');
let source = readFileSync('.codebase/scripts/puzzle-learning/train-compartment-puzzle-pipeline.mjs', 'utf8');
source = source.slice(0, source.indexOf('let state ='));
source = source.replace("import { readFileSync", "import { runAdaptiveCoverage } from '../../src/puzzle-learning/adaptive-coverage-experiment.mjs';\nimport { readFileSync");
source = source.replaceAll('research/data/compartment-puzzle-pipeline-v1/protocol.json', protocolPath);
source = source.replaceAll("default: '40'", "default: '80'").replace('maxEvents > 40', 'maxEvents > 80');
source = source.replace("'.codebase/scripts/puzzle-learning/train-compartment-puzzle-pipeline.mjs',", "'.codebase/scripts/puzzle-learning/train-adaptive-coverage.mjs', '.codebase/src/puzzle-learning/adaptive-coverage-experiment.mjs', '.codebase/src/search-and-feedback/adaptive-choice-review.mjs',");
source += `
const rows = []; for await (const row of streamRows(p.puzzles)) rows.push(row);
let state = { identity, checkpoint: 0, conditionIndex: 0, active: null,
  naive, memory: naive, presentations: 0, results: [], totalAttempts: 0 };
if (args.resume) {
  state = read(args.resume); assert.equal(digest(state.identity), digest(identity));
  assert.deepEqual(state.naive, naive);
  assert.ok(state.conditionIndex >= 0 && state.conditionIndex <= p.conditions.length);
  memory.restore(state.memory); brain.presentations = state.presentations;
}
mkdirSync(args.out, { recursive: true });
async function save() {
  guard(); assert.equal(fixedStateHash(model, memory.edges), invariant);
  state.memory = memory.snapshot(); state.presentations = brain.presentations; state.checkpoint++;
  const name = 'checkpoint-' + String(state.checkpoint).padStart(5, '0');
  const temporary = join(args.out, name + '.partial'); mkdirSync(temporary);
  writeFileSync(join(temporary, 'state.json'), JSON.stringify(state));
  renameSync(temporary, join(args.out, name));
}
async function publish(name, value) {
  const path = join(args.out, name); writeFileSync(path + '.partial', JSON.stringify(value));
  renameSync(path + '.partial', path); return { path, sha256: await sha256(path) };
}
async function load(ref) { assert.equal(await sha256(ref.path), ref.sha256); return read(ref.path); }
function resources() { const cpu = process.cpuUsage(cpuStarted); return {
  peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000,
  cpuSeconds: (cpu.user + cpu.system) / 1e6, presentationsThisInvocation: invocationPresentations, cpuDuty: duty }; }
let stop = false; process.on('SIGINT', () => { stop = true; });
await save();
try {
  const outcome = await runAdaptiveCoverage({ brain, rows, protocol: p, state, save, publish, load,
    guard, maxAttempts: maxEvents, shouldStop: () => stop });
  let summary = null;
  if (outcome.complete) {
    const panels = {};
    for (const r of state.results) panels[r.condition] = await Promise.all(r.panelRefs.map(load));
    const baseline = await Promise.all(state.baselineRefs.map(load));
    const repaired = baseline.map((b,i) => b.review.status === 'failure' && panels.adaptive[i].after.review.status === 'success');
    const gates = {
      usefulChoices: panels.adaptive.every(v => v.after.review.status === 'success'),
      repairAboveAbsentDisabled: repaired.some((yes,i) => yes && ['absent','disabled'].every(c => panels[c][i].after.review.status === 'failure')),
      shuffleSpecificity: state.shuffleIdentifiable && repaired.some((yes,i) => yes && panels.shuffled[i].after.review.status === 'failure'),
      persistenceAndReset: Object.values(panels).flat().every(v => digest(v.after.assessment) === digest(v.repeat.assessment)
        && digest(v.after.assessment) === digest(v.restored.assessment)),
      fixedState: fixedStateHash(model, memory.edges) === invariant };
    summary = { gates, allPilotGatesPassed: Object.values(gates).every(Boolean),
      scope: 'Exploratory fixture result, independent audits required; not reasoning or transfer' };
  }
  await publish('report.json', { ...outcome, identity, protocol: p, summary, state, resources: resources(),
    command: { argv: process.argv, execArgv: process.execArgv, node: process.version } });
  console.log(JSON.stringify({ ...outcome, summary, resources: resources() }));
} catch (error) {
  await publish('interruption.json', { error: String(error.stack), checkpoint: state.checkpoint,
    phase: state.active?.phase, resources: resources() }); throw error;
}
`;
writeFileSync(runner, source);
