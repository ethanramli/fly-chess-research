import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' } } });
assert.ok(args.out && !existsSync(args.out));
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const duty = Number(args['cpu-duty']); assert.equal(duty, 0.5);
const guard = () => { assert.ok(process.memoryUsage().rss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20); };
const started = performance.now(), cpuStarted = process.cpuUsage();
mkdirSync(args.out);
const candidates = [], results = [];
for (const queen of ['b3', 'd5', 'e6']) for (const rook of ['e8', 'f8']) {
  const b = new Chess('5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1');
  b.remove('c4'); b.remove('f8'); b.put({ type: 'q', color: 'w' }, queen); b.put({ type: 'r', color: 'b' }, rook);
  // These are related variants of the inspected motif, ALL training development.
  assert.equal(b.isAttacked('h8', 'w'), false); assert.equal(b.isCheck(), false);
  candidates.push({ id: `smothered-queen-${queen}-rook-${rook}`, group: 'smothered-mate-development',
    split: 'train', finalTestEligible: false, fen: b.fen(), objective: 'forced-mate', plies: 3 });
}
const atomic = (name, value) => { const path = `${args.out}/${name}`;
  writeFileSync(path + '.partial', JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); renameSync(path + '.partial', path); };
atomic('plan.json', { candidates, scope: 'Training-only motif variations; not independent transfer families.',
  generatorSha256: await sha256('.codebase/scripts/puzzle-learning/prepare-smothered-training-variations.mjs'),
  baseDatasetSha256: await sha256('research/data/smothered-acquisition-v1/puzzles.jsonl'),
  verification: { maxNodes: 4096, milliseconds: 2000 }, command: process.argv });
for (const row of candidates) {
  guard(); const board = new Chess(row.fen), moves = board.moves({ verbose: true });
  const immediate = [];
  for (const move of moves) { board.move(move); if (board.isCheckmate()) immediate.push(move.lan); board.undo(); }
  const counts = { success: 0, failure: 0, unknown: 0 }, successes = [];
  for (const move of moves) {
    guard(); const begin = performance.now(), choice = move.from + move.to + (move.promotion ?? '');
    const review = reviewCommittedChoice(board, choice, { objective: row.objective, plies: row.plies },
      { maxNodes: 4096, milliseconds: 2000 });
    counts[review.status]++; if (review.status === 'success') successes.push(choice);
    appendFileSync(`${args.out}/certificates.jsonl`, JSON.stringify({ id: row.id, review }) + '\n');
    await new Promise(resolve => setTimeout(resolve, (performance.now() - begin) * (1 / duty - 1))); guard();
  }
  const accepted = immediate.length === 0 && successes.length > 0 && counts.unknown === 0;
  const result = { row, immediate, counts, successes, accepted };
  results.push(result); atomic(`${row.id}.json`, result);
  if (accepted) appendFileSync(`${args.out}/puzzles.jsonl`, JSON.stringify(row) + '\n');
  atomic(`checkpoint-${results.length}.json`, { completed: results.length, results,
    scope: 'Completed certificate publications only; no neural state or learning.' });
  console.log(JSON.stringify({ id: row.id, counts, immediate, successes, accepted }));
}
const cpu = process.cpuUsage(cpuStarted);
atomic('report.json', { complete: true, results, resources: { elapsedSeconds: (performance.now() - started) / 1000,
  cpuSeconds: (cpu.user + cpu.system) / 1e6, peakRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: duty },
  scope: 'Certificate-screened training-only compositions; no neural experiment or transfer evidence.' });
