// Declared check of the symmetric-learning hypothesis (journal 2026-10-31). Development seeds, unrecorded screen, no selection.
import { existsSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { SEEDS } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-run.mjs';
import { evaluateCell } from '../../src/neural-learning/memory-assay-gates.mjs';
import { makeFrozenRule } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';

const { values: { out } } = parseArgs({ options: { out: { type: 'string' } } });
if (!out || existsSync(out)) throw Error('Require fresh --out FILE');
const CELLS = [[0.5, 'congruent', 0, 0], [0.5, 'congruent', 0, 0.1], [0.25, 'congruent', 0.5, 0], [0.25, 'congruent', 0.5, 0.1],
  [0.25, 'conflicting', 0.5, 0], [0.25, 'conflicting', 0.5, 0.1], [0.25, 'conflicting', 0, 0.1], [0.25, 'conflicting', 0, 0]].map(([q, relation, w, bg]) => ({ q, relation, w, bg }));
const rows = [];
for (const [eta, V0] of [[1.5, 0.8], [2, 0.8], [2, 1.2], [2, 1.6], [3, 0.8]]) {
  const name = `failcell-eta${eta}-V${V0}`;
  registerRule(name, fixture => makeFrozenRule(name, fixture, { eta, V0 }));
  for (const cell of CELLS) {
    const t0 = performance.now();
    const e = evaluateCell(SEEDS.dev.flatMap(seed => runCellSeed({ ruleName: name, cell, seed })));
    if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard: RSS/free memory');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, performance.now() - t0); // duty 0.5
    const failed = Object.keys(e.gates).filter(g => !e.gates[g].pass), A = e.mNormMedian.A, B3 = e.gates.G6.B_T3;
    rows.push({ eta, V0, cell, failed, R: e.RMedian, A, B3 });
    console.log(eta, V0, cell.q, cell.relation.slice(0, 4), cell.w, cell.bg, failed.join(',') || 'PASS', 'R', e.RMedian.toFixed(3), 'A3', A.T3.toFixed(3), 'B3', B3.mNorm.toFixed(3), 'g6', B3.greedyShare.toFixed(2));
  }
}
writeFileSync(out, JSON.stringify({ schema: 'memory-prediction-failcells-v1', seeds: SEEDS.dev, node: process.version, rows }, null, 1) + '\n', { flag: 'wx' });
