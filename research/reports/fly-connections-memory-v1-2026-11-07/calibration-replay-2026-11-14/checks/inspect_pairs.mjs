// Read-only follow-up: worst-pair partner robustness and safe/rival cell overlap at zero drive (all KCs, a proxy for the mask).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2], S = 0.014047, K = 1336;
const dump = JSON.parse(readFileSync(join(dir, 'all-kc.json'), 'utf8'));
const zero = dump.dumps.filter(d => d.theta === 0.01);
const l1 = (a, b) => a.reduce((s, x, k) => s + Math.abs(x - b[k]), 0);
// Best safe capture and strongest rival at default drive (journal item 31), then each board's distinct lesson moves (inputs/boards.jsonl).
const pairs = { 'Q04sIPQ5:13': ['f6e4', 'b8d7', 'd6c5', 'e5e4', 'e5h2', 'e5b2'], 'SjmcbcGu:16': ['f2e3', 'g2g3', 'c3d5'], '5XRGyGSj:13': ['g8g7', 'f7f6', 'c6d4'] };
for (const d of zero) {
  const v = Object.fromEntries(d.moves.map((m, i) => [m, d.allKc[i]]));
  const top = d.moves.map(m => [m, v[m][K]]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(`${d.boardId}: KC ${K} highest moves ${JSON.stringify(top.map(([m, x]) => [m, +x.toExponential(3)]))}`);
  const capped = d.moves.filter(m => v[m][K] >= S);
  for (const c of capped) {
    const near = d.moves.filter(m => m !== c).map(m => [m, l1(v[c], v[m])]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    console.log(`  closest partners of capped move ${c} (unweighted all-KC L1): ${JSON.stringify(near.map(([m, x]) => [m, +x.toFixed(4)]))}`);
  }
  const act = m => new Set(v[m].flatMap((x, k) => (x > 1e-6 ? [k] : [])));
  const [safe, rival, ...lessons] = pairs[d.boardId];
  const A = act(safe), B = act(rival), inter = [...A].filter(k => B.has(k)).length;
  const rel = l1(v[safe], v[rival]) / (v[safe].reduce((s, x) => s + x, 0) + v[rival].reduce((s, x) => s + x, 0));
  console.log(`  ${safe} vs ${rival}: active ${A.size} / ${B.size}, shared ${inter} (${(inter / Math.min(A.size, B.size) * 100).toFixed(1)}% of smaller), L1 / (sum a + sum b) = ${rel.toFixed(3)}`);
  for (const m of lessons) { const C = act(m), s = [...C].filter(k => A.has(k)).length; console.log(`  lesson move ${m}: active ${C.size}, shared with ${safe} ${s}, KC${K} rate ${v[m][K].toExponential(3)}`); }
}
