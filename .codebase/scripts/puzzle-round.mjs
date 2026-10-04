import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph } from '../src/lowram/graph.mjs';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { streamRows } from '../src/lowram/storage.mjs';
import { runPuzzleRound, FeedbackRecorder, brainIdentity, puzzleOutputs } from '../src/lowram/puzzle-round.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' },
  puzzles: { type: 'string', default: 'research/data/puzzle-round-fixture/puzzles.jsonl' },
  seed: { type: 'string', default: '47' }, 'max-rounds': { type: 'string', default: '1' },
  simulations: { type: 'string', default: '32' }, evaluations: { type: 'string', default: '8' },
  'search-ms': { type: 'string', default: '10000' },
  'proof-nodes': { type: 'string', default: '4096' }, 'cpu-duty': { type: 'string', default: '0.5' },
} });
const seed = Number(args.seed), maxRounds = Number(args['max-rounds']), cpuDuty = Number(args['cpu-duty']);
const options = { search: { simulations: Number(args.simulations), maxEvaluations: Number(args.evaluations),
  maxDepth: 6, maxNodes: 4096, milliseconds: Number(args['search-ms']) }, proofNodes: Number(args['proof-nodes']), cpuDuty };
if (!args.out || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
  || !Number.isSafeInteger(maxRounds) || maxRounds < 1 || !(cpuDuty >= 0.1 && cpuDuty <= 1)
  || !Number.isSafeInteger(options.proofNodes) || options.proofNodes < 1 || options.proofNodes > 1000000
  || ![options.search.simulations, options.search.maxEvaluations].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 100000)
  || !Number.isFinite(options.search.milliseconds) || options.search.milliseconds <= 0) throw Error('Require --out NEW_DIRECTORY and valid bounded options');
const started = performance.now(), cpuStart = process.cpuUsage(), MiB = 2 ** 20;
function guard() {
  // Same soft thresholds as train-pilot.mjs. No OS hard memory guarantee.
  if (process.memoryUsage().rss > 768 * MiB || os.freemem() < 256 * MiB) throw Error('Soft memory guard triggered; resume the last completed state.json');
}
let stop = false;
process.on('SIGINT', () => { stop = true; });
async function pace(ms) {
  let remaining = ms * (1 / cpuDuty - 1);
  do {
    const wait = Math.min(250, Math.max(0, remaining));
    await new Promise(resolve => setTimeout(resolve, wait));
    remaining -= wait;
  } while (remaining > 0);
}
guard();
const inputs = { graph: await sha256('.cache/full.npz'), puzzles: await sha256(args.puzzles) };
if (inputs.graph !== graphHash) throw Error('Pinned graph checksum mismatch');
const model = new SparseTrainer(loadGraph('.cache/full.npz'), { steps: 8, inputDim: 1280,
  outputs: puzzleOutputs, seed, normalization: 'global' });
const modelIdentity = brainIdentity(model);
let state = { schema: 'fly-puzzle-round-state-v1', inputs, config: model.config, modelIdentity,
  options, nextRow: 0, receipts: 0, learningBackend: 'record-only-v1' };
if (args.resume) {
  const prior = JSON.parse(readFileSync(args.resume, 'utf8'));
  for (const key of ['schema', 'inputs', 'config', 'modelIdentity', 'options', 'learningBackend']) {
    if (JSON.stringify(prior[key]) !== JSON.stringify(state[key])) throw Error(`Resume mismatch: ${key}`);
  }
  if (!Number.isSafeInteger(prior.nextRow) || prior.nextRow < 0 || prior.receipts !== prior.nextRow) throw Error('Invalid resume cursor');
  state = prior;
}
// All model arrays are constant: regenerate from the pinned graph + seed and
// verify their hashes on resume. These are round-state checkpoints, not trained weights.
mkdirSync(dirname(args.out), { recursive: true });
mkdirSync(args.out);
function save(name, result = null) {
  const temporary = join(args.out, `${name}.partial`), final = join(args.out, name);
  mkdirSync(temporary);
  writeFileSync(join(temporary, 'state.json'), JSON.stringify(state, null, 2));
  if (result) writeFileSync(join(temporary, 'result.json'), JSON.stringify(result, null, 2));
  renameSync(temporary, final);
}
save('initial');
const receiver = new FeedbackRecorder(state.receipts);
const command = { executable: process.execPath, nodeOptions: process.execArgv, arguments: process.argv.slice(1), node: process.version };
console.log(JSON.stringify({ event: 'start', inputs, modelIdentity, options, receiver: 'record-only', learningApplied: false }));
let index = 0, completed = 0;
for await (const puzzle of streamRows(args.puzzles)) {
  if (index++ < state.nextRow) continue;
  if (stop || completed >= maxRounds) break;
  guard();
  const result = await runPuzzleRound(model, puzzle, receiver, { ...options, guard, pace });
  const cpu = process.cpuUsage(cpuStart);
  Object.assign(result, { inputs, command, config: model.config, options,
    resources: { peakResidentMiB: process.resourceUsage().maxRSS / 1024,
      currentResidentMiB: process.memoryUsage().rss / MiB, allocatedArrayMiB: model.allocatedBytes() / MiB,
      elapsedSecondsSinceStart: (performance.now() - started) / 1000, cpuSecondsSinceStart: (cpu.user + cpu.system) / 1e6 } });
  state.nextRow = index; state.receipts = receiver.received;
  const name = `round-${String(state.nextRow).padStart(6, '0')}`;
  save(name, result); completed++;
  console.log(JSON.stringify({ event: 'round', puzzle: puzzle.id, move: result.chosenMove,
    feedback: result.feedback.status, reward: result.feedback.reward, learningApplied: false,
    report: join(args.out, name, 'result.json'), ...result.resources }));
}
if (index < state.nextRow) throw Error('Resume cursor is beyond the end of the puzzle file');
console.log(JSON.stringify({ event: 'finish', completed, interrupted: stop, nextRow: state.nextRow,
  learningApplied: false, nextStep: 'Implement and validate the biological feedback receiver before calling this training or scaling it' }));
