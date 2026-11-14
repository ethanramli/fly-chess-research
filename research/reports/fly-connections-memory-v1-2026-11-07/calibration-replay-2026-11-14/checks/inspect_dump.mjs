// Read-only checks on the replay ZIP contents. Usage: node inspect_dump.mjs DIR
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2], S = 0.014047, OLD = 0.022;
const dump = JSON.parse(readFileSync(join(dir, 'all-kc.json'), 'utf8'));
const sparse = JSON.parse(readFileSync(join(dir, 'kc-sparseness.json'), 'utf8'));
const boards = readFileSync(join(dir, 'inputs/boards.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
console.log('schema', dump.schema, 'dumps', dump.dumps.map(d => `${d.theta}:${d.boardId}:${d.moves.length}`).join(' '));
console.log('sparseness cohortSize', sparse.cohortSize, 'mappedGammaKc', sparse.mappedGammaKc, 'boards', sparse.boards);
for (const r of sparse.rows) console.log(' theta', r.theta, 'activeFrac', r.fracActiveKc, 'meanActive', r.meanActiveRate, 'perBoard', r.perBoard.map(b => `${b.boardId} n=${b.legalMoves} rel=${b.medianRelDiff.toFixed(4)} spread=${b.scoreSpread.toExponential(2)}`).join('; '));

// 1. Structure
for (const d of dump.dumps) {
  if (d.allKc.length !== d.moves.length) throw Error('moves/rows mismatch');
  for (const v of d.allKc) { if (v.length !== 5177) throw Error('length'); for (const x of v) if (!Number.isFinite(x) || x < 0) throw Error('bad rate'); }
}
console.log('structure ok: every row has 5177 finite non-negative rates');

// 2. Zero-drive entries at or above the cap, over ALL KCs (superset of the 3,770 mask KCs)
const zero = dump.dumps.filter(d => d.theta === 0.01);
let max = 0, maxAt = null;
for (const d of zero) {
  const above = [];
  d.allKc.forEach((v, m) => v.forEach((x, k) => { if (x >= S) above.push({ move: d.moves[m], kc: k, rate: x }); if (x > max) { max = x; maxAt = { board: d.boardId, move: d.moves[m], kc: k }; } }));
  const kcs = [...new Set(above.map(a => a.kc))];
  console.log(`zero drive ${d.boardId}: entries >= ${S}: ${above.length} on KC positions [${kcs}]`, JSON.stringify(above.slice(0, 10)));
  // Rates of each such KC across all moves on this board
  for (const k of kcs) { const col = d.allKc.map(v => v[k]).sort((a, b) => b - a); console.log(`   KC ${k}: top rates ${col.slice(0, 4).map(x => x.toExponential(4))}, moves with rate > 0: ${col.filter(x => x > 0).length}/${col.length}`); }
}
console.log('zero-drive max over all KCs', max, JSON.stringify(maxAt), 'entries >= 0.022:', zero.reduce((n, d) => n + d.allKc.flat().filter(x => x >= OLD).length, 0));

// 3. Mapping-free sensitivity: every KC counted once (NOT the mask weighting)
const worst = (d, s, cols) => { let w = { r: 1 }; for (let i = 0; i < d.moves.length; i++) for (let j = i + 1; j < d.moves.length; j++) { let o = 0, r = 0; const a = d.allKc[i], b = d.allKc[j];
  for (const k of cols) { o += Math.abs(a[k] - b[k]); r += Math.abs(Math.min(a[k], s) - Math.min(b[k], s)); }
  if (o > 0 && r / o < w.r) w = { r: r / o, pair: [d.moves[i], d.moves[j]], original: o }; } return w; };
const all = Array.from({ length: 5177 }, (_, k) => k);
for (const d of zero) console.log(`all-KC unweighted ${d.boardId}: worst retained at ${S} =`, JSON.stringify(worst(d, S, all)));

// 4. Boards and lessons
for (const b of boards) {
  const safe = b.legal.filter(m => b.outcomes[m] === true);
  console.log(`board ${b.boardId} group ${b.group} legal ${b.legal.length} safe [${safe}] lessons ${JSON.stringify(b.experiences.map(e => [e.move, e.pulse]))}`);
}
// Default-drive dump scores (gamma4 readout), board 1 for context
