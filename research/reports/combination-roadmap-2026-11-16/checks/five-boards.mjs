// Design checks 2-4: the five hand-built flip boards and the four trap boards. Report: ../README.md
// Check 2: each board is legal, has one best move by the checker, and the match step over independently labelled records
//          equals the checker on every legal non-king move.
// Check 3: what the match step chooses when one concept is removed or one concept's records come from the flip partner,
//          and the best fixed sum of single-concept numbers.
// Check 4: boards that fool a narrower design.
// Usage (repo root): node research/reports/combination-roadmap-2026-11-16/checks/five-boards.mjs
import { Chess, legalStart, legalMoves, truth, recordsFor, combine, pieceCount, material, successor } from './lib.mjs';

export const BOARDS = {
  'which attacker is pinned, king e8': { fen: '2b1k3/R2n4/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1', candidates: ['d2c4', 'a4b6'], best: 'd2c4', pinPartner: 'which attacker is pinned, king h7' },
  'which attacker is pinned, king h7': { fen: '2b5/R2n3k/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1', candidates: ['d2c4', 'a4b6'], best: 'a4b6', pinPartner: 'which attacker is pinned, king e8' },
  'shared defender pinned, king e8': { fen: '4k3/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1', candidates: ['d1d4', 'h4g5'], best: 'd1d4', pinPartner: 'shared defender free, king f8' },
  'shared defender free, king f8': { fen: '5k2/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1', candidates: ['d1d4', 'h4g5'], best: 'h4g5', pinPartner: 'shared defender pinned, king e8', reachPartner: 'shared defender elsewhere, knight e7' },
  'shared defender elsewhere, knight e7': { fen: '5k2/4np2/8/6b1/3r3P/8/8/3RR1K1 w - - 0 1', candidates: ['d1d4', 'h4g5'], best: 'd1d4', reachPartner: 'shared defender free, king f8' },
};
export const TRAPS = {
  'pin-line capture: the moved rook itself pins the defender': { fen: '4k3/8/8/4r3/R3p3/8/8/6K1 w - - 0 1', move: 'a4e4' },
  'first draft of the king-e8 board, without the bishop on c8: the king takes back on d7': { fen: '4k3/R2n4/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1', move: 'a7d7' },
  'double check: an unpinned attacker cannot take back': { fen: '4k3/2p5/3p4/8/4N3/8/8/4R1K1 w - - 0 1', move: 'e4d6' },
  'king is the only attacker and the square is guarded': { fen: '8/8/4k3/3p4/1N2P3/8/8/6K1 w - - 0 1', move: 'b4d5' },
};

const names = Object.keys(BOARDS);
const moves = Object.fromEntries(names.map(k => [k, legalMoves(BOARDS[k].fen).filter(m => truth(BOARDS[k].fen, m) !== null)]));
const rec = Object.fromEntries(names.map(k => [k, Object.fromEntries(moves[k].map(m => [m, recordsFor(BOARDS[k].fen, m)]))]));
const feats = r => [r.reach.length, r.pins.length, r.worth.taken, r.worth.moved];

console.log('CHECK 2: the five boards');
let failures = 0;
for (const k of names) {
  const { fen, candidates, best } = BOARDS[k];
  legalStart(fen);
  const board = new Chess(fen);
  const rows = moves[k].map(move => ({ move, t: truth(fen, move), joined: combine(rec[k][move]) }));
  const top = Math.max(...rows.map(r => r.t.score)), tops = rows.filter(r => r.t.score === top).map(r => r.move);
  const second = Math.max(...rows.filter(r => r.t.score !== top).map(r => r.t.score));
  const disagree = rows.filter(r => r.t.score !== r.joined.score).map(r => r.move);
  console.log(`\n${k}\n  ${fen}\n  pieces ${pieceCount(board)}, white material ${material(board, 'w')}, black material ${material(board, 'b')}, legal moves ${legalMoves(fen).length} (${legalMoves(fen).length - rows.length} king moves left out)`);
  console.log(`  checker: best ${tops.join('/')} at ${top}, next best ${second}; match step differs from the checker on ${disagree.length} of ${rows.length} moves`);
  if (tops.length !== 1 || tops[0] !== best || disagree.length) { failures++; console.log('  *** FAILS'); }
  for (const move of candidates) {
    const r = rows.find(x => x.move === move), x = rec[k][move];
    console.log(`  ${move}: checker ${r.t.score} (legal recaptures ${JSON.stringify(r.t.recaptures)}) | reach ${JSON.stringify(x.reach.map(y => y.piece))} | pinned ${JSON.stringify(x.pins.map(y => `${y.piece} by ${y.by}`))} | worth taken ${x.worth.taken}, moved ${x.worth.moved} | can take back ${JSON.stringify(r.joined.live)} | match step ${r.joined.score} | single-concept numbers ${JSON.stringify(feats(x))} | enemy replies ${successor(fen, move).board.moves().length}`);
  }
}
console.log(failures ? `\n${failures} board(s) fail` : '\nAll five boards: one best move as expected, and the match step equals the checker on every legal non-king move.');

// Credit: share of the top-scored moves that are the checker's best move (ties split evenly).
const credit = (scores, best) => { const mx = Math.max(...Object.values(scores)); const top = Object.keys(scores).filter(m => scores[m] === mx); return { top, credit: top.includes(best) ? 1 / top.length : 0 }; };
const run = edit => Object.fromEntries(names.map(k => [k, credit(Object.fromEntries(moves[k].map(m => [m, combine(edit(rec[k][m], k, m)).score])), BOARDS[k].best)]));
const show = (name, r) => console.log(`${name}\n   ${Object.entries(r).map(([k, v]) => `${v.top.length <= 3 ? v.top.join('/') : v.top.length + ' tied'} (${v.credit.toFixed(2)})`).join(' | ')} | total ${Object.values(r).reduce((s, v) => s + v.credit, 0).toFixed(2)} of 5`);
const from = (partnerKey, field) => (r, k, m) => { const p = BOARDS[k][partnerKey]; return p && rec[p][m] ? { ...r, [field]: rec[p][m][field] } : r; };

console.log(`\nCHECK 3: chosen move (credit) per board, in the order: ${names.join(' | ')}`);
show('match step, all three concepts', run(r => r));
show('pin memory removed (every piece free)', run(r => ({ ...r, pins: [] })));
show('reach memory removed (nothing reaches)', run(r => ({ ...r, reach: [] })));
show('worth memory removed (every piece worth 1)', run(r => ({ ...r, worth: { taken: r.worth.taken ? 1 : 0, moved: 1 } })));
show('pin records taken from the flip partner (the board that differs in the pin)', run(from('pinPartner', 'pins')));
show('reach records taken from the flip partner (the board that differs in reach)', run(from('reachPartner', 'reach')));

const grid = [0, 0.25, 0.5, 1, 2, 4, 8];
const sumRun = w => Object.fromEntries(names.map(k => [k, credit(Object.fromEntries(moves[k].map(m => { const f = feats(rec[k][m]); return [m, -w.a * f[0] + w.b * f[1] + w.c * f[2] - w.d * f[3]]; })), BOARDS[k].best)]));
let best = null, settings = 0;
for (const a of grid) for (const b of [...grid, ...grid.slice(1).map(x => -x)]) for (const c of grid) for (const d of grid) {
  settings++;
  const total = Object.values(sumRun({ a, b, c, d })).reduce((s, v) => s + v.credit, 0);
  if (!best || total > best.total + 1e-12) best = { total, w: { a, b, c, d } };
}
show(`best fixed sum of single-concept numbers (-a*reach count + b*pin count + c*taken - d*moved), ${settings} weight settings: ${JSON.stringify(best.w)}`, sumRun(best.w));
let bit = null;
const bitRun = w => Object.fromEntries(names.map(k => [k, credit(Object.fromEntries(moves[k].map(m => { const t = truth(BOARDS[k].fen, m); return [m, -w.a * (t.recaptures.length ? 1 : 0) + w.c * t.capturedValue - w.d * t.moverValue]; })), BOARDS[k].best)]));
for (const a of grid) for (const c of grid) for (const d of grid) { const total = Object.values(bitRun({ a, c, d })).reduce((s, v) => s + v.credit, 0); if (!bit || total > bit.total + 1e-12) bit = { total, w: { a, c, d } }; }
show(`best fixed sum given the checker's own legal-recapture bit: ${JSON.stringify(bit.w)}`, bitRun(bit.w));
show('rule: fewest legal enemy replies (uses the full rules)', Object.fromEntries(names.map(k => [k, credit(Object.fromEntries(moves[k].map(m => [m, -successor(BOARDS[k].fen, m).board.moves().length])), BOARDS[k].best)])));

console.log('\nCHECK 4: trap boards');
for (const [name, { fen, move }] of Object.entries(TRAPS)) {
  legalStart(fen);
  const t = truth(fen, move), r = recordsFor(fen, move), withKing = recordsFor(fen, move, { kingAttackers: true });
  console.log(`\n${name}\n  ${fen} ${move}\n  checker ${t.score} (legal recaptures ${JSON.stringify(t.recaptures)}, check after the move: ${t.inCheckAfter})`);
  console.log(`  reach ${JSON.stringify(r.reach.map(x => x.piece))} (counting the king: ${JSON.stringify(withKing.reach.map(x => x.piece))}) | pinned ${JSON.stringify(r.pins.map(x => `${x.piece} by ${x.by}, line ${x.line.join(',')}`))}`);
  console.log(`  match step with pin records per piece and square: ${combine(r).score} | if "pinned" meant "cannot capture anywhere": ${combine(r, { lineAware: false }).score} | counting the king as an attacker: ${combine(withKing).score}`);
}
