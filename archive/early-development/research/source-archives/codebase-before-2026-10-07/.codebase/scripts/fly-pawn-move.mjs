import { parseArgs } from 'node:util';
import { loadGraph } from '../src/lowram/graph.mjs';
import { createUntrainedFly, choosePawnMove } from '../src/lowram/fly-policy.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  fen: { type: 'string' },
  seed: { type: 'string', default: '47' },
} });
const seed = Number(args.seed);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('--seed must be an integer from 0 to 4294967295');

const graphPath = '.cache/full.npz';
if (await sha256(graphPath) !== graphHash) throw Error('Cached connectome checksum mismatch');

// Fresh, deterministic, untrained model: connectome topology with random sensory/readout weights.
const model = createUntrainedFly(loadGraph(graphPath), seed);
const chosen = choosePawnMove(model, args.fen);
console.log(JSON.stringify({
  player: 'untrained connectome-constrained model',
  policy: 'score each legal pawn move with its seeded random readout; choose the best for the mover',
  seed,
  san: chosen.san,
  uci: chosen.uci,
  untrainedWhiteMaterialScore: chosen.score,
  fen: chosen.fen,
}, null, 2));
