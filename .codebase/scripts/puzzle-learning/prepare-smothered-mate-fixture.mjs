import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const duty = Number(args['cpu-duty']);
if (!args.out || existsSync(args.out) || duty < 0.1 || duty > 1) throw Error('Require fresh output and bounded duty');
const row = { id: 'queen-concession-development', group: 'smothered-mate-development', split: 'train',
  fen: '5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1', objective: 'forced-mate', plies: 3 };
const board = new Chess(row.fen), moves = board.moves({ verbose: true });
const immediate = moves.filter(m => m.san.endsWith('#')).map(m => m.lan);
if (immediate.length) throw Error('Immediate-mate shortcut');
mkdirSync(args.out, { recursive: true });
const started = performance.now(), successful = [], counts = { success: 0, failure: 0, unknown: 0 };
for (const move of moves) {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard');
  const begin = performance.now(), uci = move.from + move.to + (move.promotion ?? '');
  const review = reviewCommittedChoice(board, uci, row);
  counts[review.status]++; if (review.status === 'success') successful.push(uci);
  appendFileSync(`${args.out}/certificates.jsonl`, JSON.stringify(review) + '\n');
  await new Promise(resolve => setTimeout(resolve, (performance.now() - begin) * (1 / duty - 1)));
}
writeFileSync(`${args.out}/puzzles.jsonl`, JSON.stringify(row) + '\n');
const report = { row, immediate, counts, successful, command: process.argv,
  resources: { cpuDuty: duty, elapsedSeconds: (performance.now() - started) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024 },
  scope: 'Composed development training fixture; independently checked root consequences, no neural learning or final-test evidence.' };
writeFileSync(`${args.out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
