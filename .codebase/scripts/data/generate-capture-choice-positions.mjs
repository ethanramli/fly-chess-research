// CLI: write capture-choice positions (safe and unsafe captures) from a train-bucket PGN file.
// Brain-free. Refuses to write into an existing output folder.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { splitPgn, gameIdOf, positionsFromGame } from '../../src/puzzle-learning/capture-choice-positions-v1.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const generatorPath = join(root, '.codebase/src/puzzle-learning/capture-choice-positions-v1.mjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function parseArgs(argv) {
  const args = { games: 'runs/restart-data-2026-11-03/games-train/games.pgn',
    out: 'runs/restart-data-2026-11-03/capture-choice-positions-v1', maxPerGame: 2 };
  for (let i = 0; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (argv[i] === '--games') args.games = value;
    else if (argv[i] === '--out') args.out = value;
    else if (argv[i] === '--max-per-game') args.maxPerGame = Number(value);
    else throw Error(`Unknown argument: ${argv[i]}`);
    if (value === undefined) throw Error(`Missing value for ${argv[i]}`);
  }
  if (!Number.isSafeInteger(args.maxPerGame) || args.maxPerGame < 1) throw Error('Invalid --max-per-game');
  return args;
}

const started = Date.now();
const args = parseArgs(process.argv.slice(2));
const gamesPath = resolve(root, args.games);
const outDir = resolve(root, args.out);
if (existsSync(outDir)) throw Error(`Output already exists, refusing to overwrite: ${outDir}`);

const gamesBytes = readFileSync(gamesPath);
const settings = { minPly: 10, maxPerGame: args.maxPerGame, minGap: 10, bucket: 'train' };
const counts = { gamesRead: 0, gamesSkippedNotTrain: 0, gamesWithPositions: 0, positions: 0 };
const outcomeCounts = { safe: 0, unsafe: 0, quiet: 0, unknown: 0 };
let movesTotal = 0;
const lines = [];

for (const pgn of splitPgn(gamesBytes.toString('utf8'))) {
  counts.gamesRead += 1;
  const gameId = gameIdOf(pgn);
  if (restartSplit(gameId) !== 'train') {
    counts.gamesSkippedNotTrain += 1;
    continue;
  }
  const found = positionsFromGame(pgn, settings);
  if (found.length) counts.gamesWithPositions += 1;
  for (const position of found) {
    counts.positions += 1;
    movesTotal += position.moves.length;
    for (const move of position.moves) outcomeCounts[move.outcome] += 1;
    lines.push(JSON.stringify(position));
  }
}

const meanLegalMoves = counts.positions ? movesTotal / counts.positions : 0;
const meanSafePerPosition = counts.positions ? outcomeCounts.safe / counts.positions : 0;
const manifest = {
  schema: 'capture-choice-positions-v1',
  bucket: 'train',
  ...counts,
  movesTotal,
  outcomeCounts,
  meanLegalMoves,
  meanSafePerPosition,
  inputSha256: sha256(gamesBytes),
  generatorSha256: sha256(readFileSync(generatorPath)),
  elapsedSeconds: (Date.now() - started) / 1000,
  settings,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'positions.jsonl'), lines.map(line => `${line}\n`).join(''));
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
