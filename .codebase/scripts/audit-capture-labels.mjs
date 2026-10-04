import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { streamRows } from '../src/lowram/storage.mjs';
import { sha256 } from './fetch-graph.mjs';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) throw Error('Usage: node scripts/audit-capture-labels.mjs DATASET REPORT');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function independentMaterial(game) {
  let score = 0;
  for (const rank of game.board()) for (const piece of rank) if (piece) score += (piece.color === 'w' ? 1 : -1) * value[piece.type];
  return score;
}
function independentCapture(fen) {
  const game = new Chess(fen), sign = game.turn() === 'w' ? 1 : -1, base = independentMaterial(game);
  let best = 0;
  for (const move of game.moves({ verbose: true })) {
    if (!(move.isCapture() || move.isEnPassant())) continue;
    const destination = move.to;
    game.move(move);
    let result = sign * (independentMaterial(game) - base);
    for (const reply of game.moves({ verbose: true })) {
      if (reply.to !== destination || !(reply.isCapture() || reply.isEnPassant())) continue;
      game.move(reply); result = Math.min(result, sign * (independentMaterial(game) - base)); game.undo();
    }
    game.undo(); best = Math.max(best, result);
  }
  return sign * best / 9;
}
let checked = 0, mismatches = 0, bySplit = {};
for (const split of ['train', 'validation', 'test']) {
  if (await sha256(join(dir, `${split}.jsonl`)) !== manifest.files[split].sha256) throw Error(`Checksum mismatch: ${split}`);
  bySplit[split] = 0;
  for await (const row of streamRows(join(dir, `${split}.jsonl`))) {
    for (const [fen, target] of [[row.fenA, row.targetA], [row.fenB, row.targetB]]) {
      const got = independentCapture(fen), expected = target[1];
      if (Math.abs(got - expected) > 1e-12) mismatches++;
      checked++; bySplit[split]++;
    }
  }
}
const report = { timestamp: new Date().toISOString(), dataset: dir, checkedPositions: checked, mismatches, passed: mismatches === 0, positionsBySplit: bySplit,
  method: 'Independent board material calculation and separate capture/recapture traversal; chess.js legal move generation retained',
  limitation: 'This audits implementation consistency, not whether the bounded capture label is a good strategic target' };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (mismatches) process.exitCode = 1;
