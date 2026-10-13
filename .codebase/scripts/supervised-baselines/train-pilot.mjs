import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { PairedTrainer, pairedObjective } from '../../src/supervised-baselines/paired.mjs';
import { PairedCircuitTrainer } from '../../src/supervised-baselines/paired-circuit.mjs';
import { partitionGraph } from '../../src/runtime/blocks.mjs';
import { initializeAdam, adamStep } from '../../src/supervised-baselines/adam.mjs';
import { shuffledRows } from '../../src/supervised-baselines/shuffle.mjs';
import { encodeFen, encoding, criteria as pilotCriteria } from '../../src/supervised-baselines/positions.mjs';
import { streamRows, saveCheckpoint, loadCheckpoint } from '../../src/runtime/storage.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' },
  dataset: { type: 'string', default: 'research/data/pilot-v1' },
  epochs: { type: 'string', default: '1' },
  'max-pairs': { type: 'string', default: '72' },
  'learning-rate': { type: 'string', default: '0.02' },
  'checkpoint-every': { type: 'string', default: '72' },
  mode: { type: 'string', default: 'exact' },
  'local-steps': { type: 'string', default: '12' },
  'cpu-duty': { type: 'string', default: '1' },
  optimizer: { type: 'string', default: 'sgd' },
  'shuffle-buffer': { type: 'string', default: '0' },
  'balance-criteria': { type: 'boolean', default: false },
  seed: { type: 'string', default: '47' },
} });
const epochs = Number(args.epochs), maxPairs = Number(args['max-pairs']);
const learningRate = Number(args['learning-rate']), seed = Number(args.seed);
const checkpointEvery = Number(args['checkpoint-every']);
const localSteps = Number(args['local-steps']);
const shuffleBuffer = Number(args['shuffle-buffer']);
if (!Number.isSafeInteger(shuffleBuffer) || shuffleBuffer < 0 || shuffleBuffer > 4096) throw Error('Invalid shuffle buffer');
const cpuDuty = Number(args['cpu-duty']);
if (!(cpuDuty >= 0.1 && cpuDuty <= 1)) throw Error('--cpu-duty must be between 0.1 and 1');
if (!['exact', 'cached-hybrid'].includes(args.mode)) throw Error('Unknown training mode');
const algorithm = args.mode === 'exact' ? { mode: 'exact' } : { mode: args.mode, localSteps, partition: 'incoming-degree-v1', blockSize: 4096 };
if (!['sgd', 'adam'].includes(args.optimizer) || (args.optimizer === 'adam' && args.mode !== 'exact')) throw Error('Adam currently supports exact mode only');
if (args.optimizer === 'adam') algorithm.optimizer = 'adam-v1';
if (shuffleBuffer) Object.assign(algorithm, { shuffle: 'bounded-v1', shuffleBuffer });
if (args['balance-criteria']) {
  if (args.mode !== 'exact') throw Error('Criterion balancing currently supports exact mode only');
  algorithm.criterionWeighting = 'inverse-training-variance-v1';
}
if (!args.out || ![epochs, maxPairs, checkpointEvery, localSteps].every(n => Number.isSafeInteger(n) && n > 0)
  || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff
  || !(learningRate > 0) || !Number.isFinite(learningRate)) throw Error('Require --out NEW_DIRECTORY and valid numeric options');
const MiB = 2 ** 20, dataset = args.dataset;
function guard() {
  if (process.memoryUsage().rss > 768 * MiB || os.freemem() < 256 * MiB) throw Error('Soft memory guard triggered; resume from the last completed checkpoint');
}
guard();
const manifest = JSON.parse(readFileSync(join(dataset, 'manifest.json'), 'utf8'));
const criteria = manifest.criteria;
if (manifest.encoding !== encoding || !Array.isArray(criteria) || !criteria.length || criteria.length > 32
  || !criteria.every(c => typeof c === 'string' && c.length > 0 && c.length <= 200)
  || new Set(criteria).size !== criteria.length) throw Error('Dataset encoding/criteria mismatch');
for (const split of ['train', 'validation']) {
  const spec = manifest.files?.[split];
  if (!Number.isSafeInteger(spec?.pairs) || spec.pairs < 1 || !/^[a-f0-9]{64}$/.test(spec.sha256)) throw Error('Invalid dataset file specification');
}
const outputs = criteria.length, zeros = () => Array(outputs).fill(0);
const datasetSchema = { encoding, criteria };
const identity = { graph: await sha256('.cache/full.npz'), train: await sha256(join(dataset, 'train.jsonl')), validation: await sha256(join(dataset, 'validation.jsonl')) };
if (identity.graph !== graphHash || identity.train !== manifest.files.train.sha256 || identity.validation !== manifest.files.validation.sha256) throw Error('Input checksum mismatch');
const model = new SparseTrainer(loadGraph('.cache/full.npz'), { steps: 8, inputDim: 1280, outputs, seed, normalization: 'global' });
if (args.optimizer === 'adam') initializeAdam(model);
const paired = new PairedTrainer(model);
let state = { identity, datasetSchema, learningRate, algorithm, epoch: 0, nextPair: 0, updates: 0 };
if (args.resume) {
  state = loadCheckpoint(model, args.resume);
  // Older checkpoints were restricted to the original two pilot criteria.
  const savedSchema = state.datasetSchema ?? { encoding, criteria: pilotCriteria };
  if (JSON.stringify(state.identity) !== JSON.stringify(identity) || state.learningRate !== learningRate
    || JSON.stringify(savedSchema) !== JSON.stringify(datasetSchema)
    || JSON.stringify(state.algorithm ?? { mode: 'exact' }) !== JSON.stringify(algorithm)
    || ![state.epoch, state.nextPair, state.updates].every(n => Number.isSafeInteger(n) && n >= 0)
    || state.nextPair > manifest.files.train.pairs) throw Error('Resume provenance or cursor mismatch');
}
state.algorithm = algorithm;
state.datasetSchema = datasetSchema;
const blocks = args.mode === 'cached-hybrid' ? partitionGraph(model.graph) : [];
// A new directory prevents accidental checkpoint/log overwrite on resumed runs.
mkdirSync(dirname(args.out), { recursive: true });
mkdirSync(args.out);
let stop = false;
process.on('SIGINT', () => { stop = true; });
async function pace(start) {
  // Approximate compute/rest ratio for this worker, not a system CPU limit.
  let remaining = (performance.now() - start) * (1 / cpuDuty - 1);
  do {
    await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 250)));
    remaining -= 250;
  } while (!stop && remaining > 0);
}
function record(event) {
  const cpu = process.cpuUsage();
  const row = { time: new Date().toISOString(), ...event, rssMiB: process.memoryUsage().rss / MiB,
    cpuSeconds: (cpu.user + cpu.system) / 1e6,
    peakResidentMiB: process.resourceUsage().maxRSS / 1024 };
  appendFileSync(join(args.out, 'metrics.jsonl'), JSON.stringify(row) + '\n');
  console.log(JSON.stringify(row));
}
function checkRow(row, split) {
  if (row.split !== split || typeof row.id !== 'string' || typeof row.group !== 'string'
    || ![row.fenA, row.fenB].every(f => typeof f === 'string')
    || ![row.targetA, row.targetB].every(a => Array.isArray(a) && a.length === outputs && a.every(Number.isFinite))) throw Error('Invalid dataset row');
}
// Fit the constant comparator only on training labels, never validation labels.
const trainMean = zeros(), trainSquares = zeros();
let trainCount = 0;
for await (const row of streamRows(join(dataset, 'train.jsonl'))) {
  checkRow(row, 'train');
  for (let k = 0; k < outputs; k++) {
    trainMean[k] += row.targetA[k] + row.targetB[k];
    trainSquares[k] += row.targetA[k] ** 2 + row.targetB[k] ** 2;
  }
  trainCount++;
}
if (trainCount !== manifest.files.train.pairs) throw Error('Training row count mismatch');
for (let k = 0; k < outputs; k++) trainMean[k] /= 2 * trainCount;
const trainVariance = trainSquares.map((s, k) => Math.max(0, s / (2 * trainCount) - trainMean[k] ** 2));
if (!trainVariance.every(Number.isFinite)) throw Error('Target scale overflow; rescale dataset labels');
if (args['balance-criteria'] && trainVariance.some(v => v <= 1e-8)) throw Error('Cannot balance a near-constant criterion; provide varied labels or omit --balance-criteria');
const inverseVariance = trainVariance.map(v => 1 / Math.max(v, 1e-8));
const criterionWeights = args['balance-criteria'] ? inverseVariance.map(v => outputs * v / inverseVariance.reduce((sum, x) => sum + x, 0)) : undefined;
if (criterionWeights) {
  if (args.resume && JSON.stringify(state.criterionWeights) !== JSON.stringify(criterionWeights)) throw Error('Checkpoint criterion weights mismatch');
  state.criterionWeights = criterionWeights;
}
let lastValidatedUpdates = -1;
async function evaluate() {
  let loss = 0, absolute = 0, difference = 0, count = 0;
  const mse = zeros(), deltaMSE = zeros(), constantMSE = zeros(), constantDeltaMSE = zeros();
  for await (const row of streamRows(join(dataset, 'validation.jsonl'))) {
    const positionStart = performance.now();
    guard(); checkRow(row, 'validation');
    const a = Array.from(model.forward(encodeFen(row.fenA)));
    const b = model.forward(encodeFen(row.fenB));
    const result = pairedObjective(a, b, row.targetA, row.targetB);
    appendFileSync(join(args.out, 'validation-predictions.jsonl'), JSON.stringify({ updates: state.updates,
      pair: row.id, group: row.group, predictionA: a, predictionB: Array.from(b),
      targetA: row.targetA, targetB: row.targetB }) + '\n');
    for (let k = 0; k < outputs; k++) {
      mse[k] += ((a[k] - row.targetA[k]) ** 2 + (b[k] - row.targetB[k]) ** 2) / 2;
      deltaMSE[k] += (a[k] - b[k] - row.targetA[k] + row.targetB[k]) ** 2;
      constantMSE[k] += ((trainMean[k] - row.targetA[k]) ** 2 + (trainMean[k] - row.targetB[k]) ** 2) / 2;
      constantDeltaMSE[k] += (row.targetA[k] - row.targetB[k]) ** 2;
    }
    loss += result.loss; absolute += result.absolute; difference += result.difference; count++;
    await pace(positionStart);
    if (stop) return;
  }
  if (count !== manifest.files.validation.pairs) throw Error('Validation row count mismatch');
  record({ event: 'validation', updates: state.updates, pairs: count, loss: loss / count, absolute: absolute / count, difference: difference / count,
    criteria, trainMean, mse: mse.map(v => v / count), deltaMSE: deltaMSE.map(v => v / count),
    constantMSE: constantMSE.map(v => v / count), constantDeltaMSE: constantDeltaMSE.map(v => v / count) });
  lastValidatedUpdates = state.updates;
}
record({ event: 'start', state, config: model.config, allocatedArrayMiB: paired.allocatedBytes() / MiB,
  trainVariance, criterionWeights: criterionWeights ?? Array(outputs).fill(1), validationWeighting: 'Original equal-weight objective; always comparable across runs with the same dataset schema',
  cpuDuty, cpuDutyMeaning: 'Approximate worker compute/rest ratio; not an OS CPU cap',
  circuitBlocks: blocks.length, circuitCoverageNeurons: blocks.reduce((sum, nodes) => sum + nodes.length, 0),
  scope: 'Paired position-criterion training; all parameters trainable; final test untouched',
  order: shuffleBuffer ? 'Seeded bounded shuffle per epoch; replayed from epoch start on resume' : 'Fixed file order',
  memoryLimit: '768 MiB RSS soft checks between positions; no OS hard cap' });
await evaluate();
let processed = 0;
const started = performance.now(), endEpoch = state.epoch + epochs;
while (!stop && processed < maxPairs && state.epoch < endEpoch) {
  let index = 0;
  const source = streamRows(join(dataset, 'train.jsonl'));
  const ordered = shuffleBuffer ? shuffledRows(source, { bufferSize: shuffleBuffer, seed: (seed ^ Math.imul(state.epoch + 1, 0x9e3779b9)) >>> 0 }) : source;
  for await (const row of ordered) {
    if (index++ < state.nextPair) continue;
    guard(); checkRow(row, 'train');
    const updateStart = performance.now();
    const xa = encodeFen(row.fenA), xb = encodeFen(row.fenB);
    const objective = paired.train(xa, xb, row.targetA, row.targetB, 1, criterionWeights);
    const stats = args.optimizer === 'adam' ? adamStep(model, { learningRate }) : model.step({ learningRate });
    await pace(updateStart);
    if (blocks.length) {
      const circuitStart = performance.now(), block = state.updates % blocks.length;
      const circuit = new PairedCircuitTrainer(model, blocks[block]);
      guard();
      const anchorStart = performance.now();
      circuit.anchor(xa, xb, row.targetA, row.targetB);
      await pace(anchorStart);
      let completedLocalSteps = 0;
      for (let step = 0; step < localSteps; step++) {
        const localStart = performance.now();
        guard(); circuit.forward(); circuit.backward(); circuit.step(learningRate);
        completedLocalSteps++;
        await pace(localStart);
        if (stop) break;
      }
      const verificationStart = performance.now();
      const verified = circuit.verify();
      await pace(verificationStart);
      record({ event: 'circuit', pair: row.id, block, blockNeurons: blocks[block].length,
        activeEdges: circuit.a.edges.length, localSteps: completedLocalSteps, ...verified,
        seconds: (performance.now() - circuitStart) / 1000 });
    }
    state.nextPair = index; state.updates++; processed++;
    if (processed % 8 === 0) {
      record({ event: 'train', updates: state.updates, epoch: state.epoch, nextPair: index, loss: objective.loss, changedEdges: stats.changedEdges });
    }
    if (processed % checkpointEvery === 0) saveCheckpoint(model, join(args.out, `update-${state.updates}`), state);
    // Yield so Ctrl+C can request a checkpoint at an optimizer boundary.
    await new Promise(resolve => setImmediate(resolve));
    if (stop || processed >= maxPairs) break;
  }
  if (index === manifest.files.train.pairs) {
    state.epoch++; state.nextPair = 0;
    if (!stop && processed < maxPairs && state.epoch < endEpoch) await evaluate();
  }
  else if (!stop && processed < maxPairs) throw Error('Training row count mismatch');
}
saveCheckpoint(model, join(args.out, 'final'), state);
if (!stop && lastValidatedUpdates !== state.updates) await evaluate();
record({ event: 'finish', state, interrupted: stop, processedPairs: processed, trainingAndFinalValidationSeconds: (performance.now() - started) / 1000 });
