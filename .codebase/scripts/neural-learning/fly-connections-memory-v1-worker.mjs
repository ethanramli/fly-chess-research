#!/usr/bin/env node
// Fly connections memory v1 worker: one (seed, arm) job in its own directory. Checks every pin, builds the graph-backed
// condition (mapping, model, Eyes, APL package), then runs the job loop. Exit 0 on success. On any error the message goes
// to stderr and the exit code is 1; state.json stays in the job directory for resume.
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/neural-learning/fly-connections-memory-v1-worker.mjs --config REG --seed S --arm A --dir JOBDIR
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';
import { runJob } from '../../src/neural-learning/fly-connections-job-v1.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, seed: { type: 'string' }, arm: { type: 'string' }, dir: { type: 'string' } } });

async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function work() {
  if (!args.config || !args.seed || !args.arm || !args.dir) throw Error('Usage: --config REG --seed S --arm A --dir JOBDIR');
  const config = JSON.parse(readFileSync(args.config, 'utf8').replace(/^﻿/, ''));
  const seed = Number(args.seed), arm = args.arm, { limits } = config;
  if (!Number.isSafeInteger(seed) || !config.seeds.includes(seed) || !config.arms.includes(arm)) throw Error(`Seed ${args.seed} or arm ${arm} is not registered`);
  for (const [path, expected] of Object.entries(config.pins)) {
    if (await fileSha256(path) !== expected) throw Error(`Changed input ${path}`);
  }

  // Resource guard: called before and after every forward by the condition. Peak RSS and minimum free memory are reported.
  const started = performance.now();
  let forwards = 0, peakRssMiB = 0, minFreeMiB = Infinity;
  const guard = ({ when }) => {
    const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
    const wallSeconds = (performance.now() - started) / 1000;
    peakRssMiB = Math.max(peakRssMiB, rssMiB);
    minFreeMiB = Math.min(minFreeMiB, freeMiB);
    if (when === 'before') forwards++;
    if (rssMiB > limits.rssMiB) throw Error(`RSS ${rssMiB.toFixed(1)} MiB exceeds ${limits.rssMiB} MiB`);
    if (freeMiB < limits.freeMiB) throw Error(`Free memory ${freeMiB.toFixed(1)} MiB is below ${limits.freeMiB} MiB`);
    if (when === 'before' && limits.passesPerJob > 0 && forwards > limits.passesPerJob) throw Error(`Pass budget ${limits.passesPerJob} exceeded`);
    if (limits.wallSecondsPerJob > 0 && wallSeconds > limits.wallSecondsPerJob) throw Error(`Wall budget ${limits.wallSecondsPerJob} s exceeded`);
  };

  const packetDir = config.paths.packet;
  const packet = JSON.parse(readFileSync(join(packetDir, 'packet.json'), 'utf8'));
  const records = new Map();
  for (const line of readFileSync(join(packetDir, 'boards.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    records.set(record.boardId, record);
  }
  const tape = JSON.parse(readFileSync(join(packetDir, 'tapes', `${seed}.json`), 'utf8'));
  if (tape.seed !== seed || tape.sha256 !== packet.tapes[seed]?.sha256) throw Error('Tape does not match packet.json');

  const graph = loadGraph(config.paths.graph);
  const rootIds = readNpz(config.paths.graph, ['root_ids']).root_ids;
  const readerCells = neuronReaderCells.cells.filter(cell => cell.type === 'MBON05');
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, config.paths.annotations, readerCells);
  if (config.paths.mappingCheck) {
    // Independent mapping check (check-fly-connections-mapping-v1.mjs) must have passed for this exact mapping.
    const check = JSON.parse(readFileSync(config.paths.mappingCheck, 'utf8'));
    if (check.pass !== true || check.mappingIdentity !== createHash('sha256').update(JSON.stringify(mapping)).digest('hex')) throw Error('Mapping check did not pass for this mapping');
  }
  const model = new SparseTrainer(graph, config.model);
  const eyes = createEyesV2(loadRetina(config.paths.graph));
  const aplPackage = await loadLocalAplPackage(config.paths.aplPackage);
  const condition = createFlyCondition({ model, mapping, eyes, aplPackage, arm, guard });

  await runJob({ condition, records, tape, arm, dir: args.dir,
    extra: () => ({ peakRssMiB: Math.max(peakRssMiB, process.resourceUsage().maxRSS / 1024), minFreeMiB }) });
}

try {
  await work();
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
