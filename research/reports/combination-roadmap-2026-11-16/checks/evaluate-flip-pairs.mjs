// Design check 8: score the generated flip pairs with the match step, the best fixed sum, single-concept removals and simple rules,
// split them by family, and inject random record errors to see how accurate the concept memories must be. Report: ../README.md
// Reads the generator's JSON; no graph, no learning.
// Usage (repo root): node research/reports/combination-roadmap-2026-11-16/checks/evaluate-flip-pairs.mjs research/reports/combination-roadmap-2026-11-16/outputs/flip-pairs.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { legalMoves, truth, recordsFor, successor, piecesOf, mulberry32 } from './lib.mjs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
// A pair is two boards. The optional third board of a shared-defender pair makes a second pair with the free board.
const pairs = [];
for (const [type, t] of Object.entries(data.types)) for (const p of t.pairs) {
  pairs.push({ type, id: p.id, boards: p.boards });
  if (p.third) pairs.push({ type: 'shared defender: free or elsewhere', id: `${p.id}-third`, boards: p.third.boards });
}

// Everything the match step needs, cached per board and move as plain numbers.
const cache = new Map();
function rowsOf(fen) {
  if (cache.has(fen)) return cache.get(fen);
  const rows = [];
  for (const move of legalMoves(fen)) {
    const t = truth(fen, move);
    if (t === null) continue;
    const r = recordsFor(fen, move), s = successor(fen, move);
    const enemy = piecesOf(s.board, s.enemy).filter(p => p.type !== 'k').map(p => {
      const pin = r.pins.find(x => x.piece === p.square);
      return { reach: r.reach.some(x => x.piece === p.square), held: Boolean(pin) && !pin.line.includes(r.to) };
    });
    rows.push({ move, truth: t.score, legalRecapture: t.recaptures.length > 0, taken: r.worth.taken, moved: r.worth.moved, enemy,
      reachCount: r.reach.length, pinCount: r.pins.length, replies: s.board.moves().length, pieces: piecesOf(s.board).length });
  }
  cache.set(fen, rows);
  return rows;
}
const matchScore = (row, enemy = row.enemy) => row.taken - (enemy.some(e => e.reach && !e.held) ? row.moved : 0);
// Credit for one board: the share of top-scored moves that are the checker's best move (ties split evenly).
function credit(rows, score, best) {
  let top = -Infinity, tied = 0, hit = 0;
  for (const row of rows) { const s = score(row); if (s > top + 1e-12) { top = s; tied = 0; hit = 0; } if (Math.abs(s - top) <= 1e-12) { tied++; if (row.move === best) hit = 1; } }
  return hit / tied;
}
function evaluate(score, list = pairs) {
  const byType = {};
  for (const p of list) {
    const c = p.boards.map(b => credit(rowsOf(b.fen), score, b.best));
    const t = byType[p.type] ??= { pairs: 0, solved: 0, boards: 0, credit: 0 };
    t.pairs++; t.boards += 2; t.credit += c[0] + c[1]; if (c[0] === 1 && c[1] === 1) t.solved++;
  }
  return byType;
}
const total = r => Object.values(r).reduce((a, t) => ({ pairs: a.pairs + t.pairs, solved: a.solved + t.solved, boards: a.boards + t.boards, credit: a.credit + t.credit }), { pairs: 0, solved: 0, boards: 0, credit: 0 });
const line = (name, r) => { const all = total(r); console.log(`${name.padEnd(58)} pairs solved ${String(all.solved).padStart(3)}/${all.pairs} | boards right ${all.credit.toFixed(1)}/${all.boards} | by type: ${Object.entries(r).map(([k, t]) => `${k} ${t.solved}/${t.pairs}`).join('; ')}`); };

console.log(`pairs: ${pairs.length} (${Object.entries(evaluate(matchScore)).map(([k, t]) => `${k}: ${t.pairs}`).join('; ')})`);
const sizes = pairs.flatMap(p => p.boards.map(b => rowsOf(b.fen))), records = sizes.map(rows => rows.reduce((n, r) => n + 2 * r.enemy.length, 0)).sort((a, b) => a - b);
console.log(`boards: ${sizes.length}; non-king moves per board ${Math.min(...sizes.map(r => r.length))}-${Math.max(...sizes.map(r => r.length))}; yes/no records per board ${records[0]}-${records.at(-1)} (median ${records[records.length >> 1]})`);
console.log('');
line('match step (reach, pin, worth)', evaluate(matchScore));
line('checker itself (legal replies; ceiling)', evaluate(r => r.truth));
line('pin memory removed (every piece free)', evaluate(r => matchScore(r, r.enemy.map(e => ({ ...e, held: false })))));
line('reach memory removed (nothing reaches)', evaluate(r => r.taken));
line('worth memory removed (every piece worth 1)', evaluate(r => (r.taken ? 1 : 0) - (r.enemy.some(e => e.reach && !e.held) ? 1 : 0)));
line('rule: take the most valuable piece', evaluate(r => r.taken));
line('rule: captured worth minus mover worth', evaluate(r => (r.taken ? r.taken - r.moved : -99)));
line('rule: fewest enemy pieces reaching the square', evaluate(r => -r.reachCount + (r.taken ? 0.5 : 0)));
line('rule: fewest pieces left on the board', evaluate(r => -r.pieces));
line('rule: fewest legal enemy replies (uses the full rules)', evaluate(r => -r.replies));

// Best fixed sum: -a*reach count + b*pin count + c*worth taken - d*worth moved, one weight set for every board. Exhaustive grid.
const grid = [0, 0.25, 0.5, 1, 2, 4, 8, 16];
let best = null, bestBoards = null, settings = 0;
for (const a of grid) for (const b of [...grid, ...grid.slice(1).map(x => -x)]) for (const c of grid) for (const d of grid) {
  settings++;
  const all = total(evaluate(r => -a * r.reachCount + b * r.pinCount + c * r.taken - d * r.moved));
  if (!best || all.solved > best.solved || (all.solved === best.solved && all.credit > best.credit)) best = { ...all, w: { a, b, c, d } };
  if (!bestBoards || all.credit > bestBoards.credit) bestBoards = { ...all, w: { a, b, c, d } };
}
console.log('');
console.log(`best fixed sum of single-concept numbers, ${settings} weight settings, fitted on these same boards:`);
console.log(`  most pairs solved: ${best.solved}/${best.pairs} (boards right ${best.credit.toFixed(1)}/${best.boards}) at ${JSON.stringify(best.w)}`);
console.log(`  most boards right: ${bestBoards.credit.toFixed(1)}/${bestBoards.boards} (pairs solved ${bestBoards.solved}/${bestBoards.pairs}) at ${JSON.stringify(bestBoards.w)}`);
let bestBit = null;
for (const a of grid) for (const c of grid) for (const d of grid) {
  const r = evaluate(row => -a * (row.legalRecapture ? 1 : 0) + c * row.taken - d * row.moved), all = total(r);
  if (!bestBit || all.solved > bestBit.solved || (all.solved === bestBit.solved && all.credit > bestBit.credit)) bestBit = { ...all, w: { a, c, d }, r };
}
console.log(`best fixed sum given the checker's own legal-recapture bit: pairs solved ${bestBit.solved}/${bestBit.pairs} (boards right ${bestBit.credit.toFixed(1)}/${bestBit.boards}) at ${JSON.stringify(bestBit.w)}; by type: ${Object.entries(bestBit.r).map(([k, t]) => `${k} ${t.solved}/${t.pairs}`).join('; ')}`);

// Family split: a family is a pair plus its third board, so boards that share a position stay together. Hash of the family name, half and half.
const familyOf = p => p.id.replace(/-third$/, '');
const bucket = id => createHash('sha256').update(`fly-combination-split-v1:${id}`).digest().readUInt32BE(0) / 0x100000000;
const splitOf = p => (bucket(familyOf(p)) < 0.5 ? 'development' : 'kept back');
const dev = pairs.filter(p => splitOf(p) === 'development'), kept = pairs.filter(p => splitOf(p) === 'kept back');
const fens = list => new Set(list.flatMap(p => p.boards.map(b => b.fen.split(' ')[0])));
const shared = [...fens(dev)].filter(f => fens(kept).has(f)).length;
console.log('');
console.log(`family split: ${new Set(dev.map(familyOf)).size} families (${dev.length} pairs) for development, ${new Set(kept.map(familyOf)).size} families (${kept.length} pairs) kept back; boards found in both halves: ${shared}`);
let fit = null;
for (const a of grid) for (const b of [...grid, ...grid.slice(1).map(x => -x)]) for (const c of grid) for (const d of grid) {
  const all = total(evaluate(r => -a * r.reachCount + b * r.pinCount + c * r.taken - d * r.moved, dev));
  if (!fit || all.solved > fit.solved || (all.solved === fit.solved && all.credit > fit.credit)) fit = { ...all, w: { a, b, c, d } };
}
const heldOut = total(evaluate(r => -fit.w.a * r.reachCount + fit.w.b * r.pinCount + fit.w.c * r.taken - fit.w.d * r.moved, kept)), matchKept = total(evaluate(matchScore, kept));
console.log(`fixed sum fitted on the development half (${JSON.stringify(fit.w)}): development pairs solved ${fit.solved}/${fit.pairs}, boards right ${fit.credit.toFixed(1)}/${fit.boards}; kept-back pairs solved ${heldOut.solved}/${heldOut.pairs}, boards right ${heldOut.credit.toFixed(1)}/${heldOut.boards}`);
console.log(`match step on the kept-back half: pairs solved ${matchKept.solved}/${matchKept.pairs}`);

// Record errors: every yes/no record flips independently with probability e. 300 trials per error rate.
console.log('');
console.log('share of pairs solved when each yes/no record is wrong with the given probability (300 trials):');
const rand = mulberry32(20261116);
for (const e of [0.005, 0.01, 0.02, 0.03, 0.05, 0.10]) {
  const sums = {}, counts = {};
  for (let trial = 0; trial < 300; trial++) for (const p of pairs) {
    const ok = p.boards.every(b => credit(rowsOf(b.fen), row => matchScore(row, row.enemy.map(x => ({ reach: (rand() < e) !== x.reach, held: (rand() < e) !== x.held }))), b.best) === 1);
    sums[p.type] = (sums[p.type] ?? 0) + (ok ? 1 : 0); counts[p.type] = (counts[p.type] ?? 0) + 1;
  }
  const all = Object.values(sums).reduce((a, x) => a + x, 0) / Object.values(counts).reduce((a, x) => a + x, 0);
  console.log(`  record error ${(100 * e).toFixed(1).padStart(4)}%: all pairs ${(100 * all).toFixed(0)}% | ${Object.keys(sums).map(k => `${k} ${(100 * sums[k] / counts[k]).toFixed(0)}%`).join('; ')}`);
}
