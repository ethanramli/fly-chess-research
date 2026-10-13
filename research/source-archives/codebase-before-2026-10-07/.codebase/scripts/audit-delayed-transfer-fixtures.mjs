import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { reviewCommittedChoice } from '../src/lowram/adaptive-choice-review.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh --out');
const input = 'research/data/counterfactual-delayed-v1/puzzles.jsonl';
const bytes = readFileSync(input), rows = bytes.toString().trim().split(/\r?\n/).map(JSON.parse);
const hash = b => createHash('sha256').update(b).digest('hex');
const started = performance.now(), summary = [];
mkdirSync(args.out, { recursive: true });
for (const row of rows) {
  const board = new Chess(row.fen), before = board.pgn(), counts = { success: 0, failure: 0, unknown: 0 }, successful = [];
  for (const move of board.moves({ verbose: true })) {
    if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard');
    const uci = move.from + move.to + (move.promotion ?? '');
    const review = reviewCommittedChoice(board, uci, row, { maxNodes: 4096, milliseconds: 2000 });
    if (board.pgn() !== before) throw Error('Teacher mutated position');
    counts[review.status]++; if (review.status === 'success') successful.push(uci);
    appendFileSync(`${args.out}/certificates.jsonl`, JSON.stringify({ id: row.id, review }) + '\n');
  }
  summary.push({ id: row.id, counts, successful, checkedMove: row.checkedMove });
}
const report = { input, inputSha256: hash(bytes), sources: Object.fromEntries([
  '.codebase/scripts/audit-delayed-transfer-fixtures.mjs', '.codebase/src/lowram/adaptive-choice-review.mjs',
  '.codebase/src/lowram/mate-certificate.mjs', '.codebase/src/lowram/mate-certificate-check.mjs',
  '.codebase/src/lowram/verified-feedback.mjs'
].map(p => [p, hash(readFileSync(p))])), summary,
  resources: { elapsedSeconds: (performance.now() - started) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024 },
  scope: 'Teacher solvability audit of existing diagnostic fixtures; no neural learning or transfer evidence.' };
writeFileSync(`${args.out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary));
