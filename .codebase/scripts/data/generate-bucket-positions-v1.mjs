// CLI: capture-choice positions from one restart bucket's PGN, with the same unchanged positionsFromGame settings as
// generate-capture-choice-positions.mjs (which stays train-only because v8 pins it). Brain-free; fresh output folder only.
// Usage: node generate-bucket-positions-v1.mjs --games PGN --bucket train|development --out DIR
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { splitPgn, gameIdOf, positionsFromGame } from '../../src/puzzle-learning/capture-choice-positions-v1.mjs';

const { values: args } = parseArgs({ options: { games: { type: 'string' }, bucket: { type: 'string' }, out: { type: 'string' } } });
assert(args.games && args.out && ['train', 'development'].includes(args.bucket), 'Need --games, --out and --bucket train|development');
assert(!existsSync(args.out), 'Fresh output folder required');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(args.games), settings = { minPly: 10, maxPerGame: 2, minGap: 10 };
const lines = [], counts = { gamesRead: 0, gamesOtherBucket: 0, gamesWithPositions: 0, positions: 0 };
for (const pgn of splitPgn(bytes.toString('utf8'))) {
  counts.gamesRead++;
  if (restartSplit(gameIdOf(pgn)) !== args.bucket) { counts.gamesOtherBucket++; continue; }
  const found = positionsFromGame(pgn, settings);
  if (found.length) counts.gamesWithPositions++;
  for (const p of found) { counts.positions++; lines.push(JSON.stringify(p)); }
}
assert.equal(counts.gamesOtherBucket, 0, 'Input holds games from another bucket');
mkdirSync(args.out, { recursive: true });
writeFileSync(join(args.out, 'positions.jsonl'), lines.map(l => `${l}\n`).join(''));
writeFileSync(join(args.out, 'manifest.json'), `${JSON.stringify({ schema: 'capture-choice-positions-v1', bucket: args.bucket, ...counts,
  settings, inputSha256: sha256(bytes), positionsSha256: sha256(readFileSync(join(args.out, 'positions.jsonl'))),
  generatorSha256: sha256(readFileSync(new URL('../../src/puzzle-learning/capture-choice-positions-v1.mjs', import.meta.url))) }, null, 2)}\n`);
console.log(JSON.stringify(counts));
