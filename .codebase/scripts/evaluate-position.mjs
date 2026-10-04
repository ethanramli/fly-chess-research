import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph } from '../src/lowram/graph.mjs';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { loadCheckpoint } from '../src/lowram/storage.mjs';
import { encodeFen, encoding, criteria as legacyCriteria } from '../src/lowram/positions.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: { checkpoint: { type: 'string' }, fen: { type: 'string' } } });
if (!args.checkpoint || !args.fen) throw Error('Require --checkpoint DIRECTORY --fen "FEN"');
const input = encodeFen(args.fen);
const meta = JSON.parse(readFileSync(join(args.checkpoint, 'manifest.json'), 'utf8'));
const config = meta.config, schema = meta.state?.datasetSchema ?? { encoding, criteria: legacyCriteria };
if (config?.inputDim !== 1280 || config.precision !== 'float32' || !Number.isSafeInteger(config.steps) || config.steps < 1 || config.steps > 32
  || !Number.isSafeInteger(config.outputs) || config.outputs < 1 || config.outputs > 32
  || schema.encoding !== encoding || !Array.isArray(schema.criteria) || schema.criteria.length !== config.outputs
  || !schema.criteria.every(c => typeof c === 'string' && c.length > 0) || new Set(schema.criteria).size !== schema.criteria.length) throw Error('Unsupported checkpoint schema or dimensions');
if (meta.state.identity.graph !== graphHash || await sha256('.cache/full.npz') !== graphHash) throw Error('Graph provenance mismatch');
if (os.freemem() < 256 * 2 ** 20) throw Error('Insufficient free memory');
const model = new SparseTrainer(loadGraph('.cache/full.npz'), config);
loadCheckpoint(model, args.checkpoint);
const begin = performance.now(), scores = Array.from(model.forward(input));
if (!scores.every(Number.isFinite)) throw Error('Nonfinite prediction');
console.log(JSON.stringify({ fen: args.fen, checkpoint: args.checkpoint,
  trainingPairs: meta.state.updates, criteria: schema.criteria.map((name, i) => ({ name, score: scores[i] })),
  forwardSeconds: (performance.now() - begin) / 1000,
  peakResidentMiB: process.resourceUsage().maxRSS / 1024 }, null, 2));
