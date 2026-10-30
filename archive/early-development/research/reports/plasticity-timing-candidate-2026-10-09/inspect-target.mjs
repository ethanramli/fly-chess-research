// Static annotation join only. Does not instantiate or run the learner.
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readNpz } from '../../../.codebase/src/runtime/graph.mjs';

const paths = { graph: '.cache/full.npz', annotations: '.cache/flywire-annotations-v2.1.0.tsv',
  mapping: 'research/reports/reversal-candidate-2026-10-05/mapping.json' };
const frozen = JSON.parse(readFileSync(paths.mapping, 'utf8'));
const hashes = {};
for (const [key, path] of Object.entries(paths)) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  hashes[key] = hash.digest('hex');
}
assert.equal(hashes.graph, frozen.inputs.graph);
assert.equal(hashes.annotations, frozen.inputs.annotations);
const { root_ids: roots } = readNpz(paths.graph, ['root_ids']);
const wanted = new Set(frozen.mapping.groups.flatMap(g => g.kc.map(i => roots[i].toString())));
const cells = new Map(); let header;
for await (const line of createInterface({ input: createReadStream(paths.annotations), crlfDelay: Infinity })) {
  const fields = line.split('\t');
  if (!header) { header = fields; continue; }
  const get = key => fields[header.indexOf(key)];
  if (wanted.has(get('root_id'))) {
    assert(!cells.has(get('root_id')));
    cells.set(get('root_id'), { type: get('hemibrain_type'), side: get('side'), cellClass: get('cell_class') });
  }
}
const groups = frozen.mapping.groups.map(g => {
  const counts = {}, candidateEdges = [], candidateRoots = new Set();
  assert.equal(g.edges.length, g.kc.length);
  for (let i = 0; i < g.kc.length; i++) {
    const root = roots[g.kc[i]].toString(), cell = cells.get(root);
    assert(cell && cell.side === g.side && cell.cellClass === 'Kenyon_Cell');
    counts[cell.type] = (counts[cell.type] ?? 0) + 1;
    if (g.danType === 'PPL103' && g.mbonType === 'MBON12' && /^KCg-/.test(cell.type)) {
      candidateEdges.push(g.edges[i]); candidateRoots.add(root);
    }
  }
  return { side: g.side, danType: g.danType, mbonType: g.mbonType, counts,
    candidateEdges, candidateKCRoots: [...candidateRoots] };
});
const report = { schema: 'gamma2-timing-static-candidate-v1', hashes, groups,
  candidateEdgeCount: groups.reduce((n, g) => n + g.candidateEdges.length, 0),
  scope: 'Existing mapped gamma-KC edges only; no new graph sign/coordinate/receptor verification, no dynamics, no training. Candidate is not a certified adapter.' };
writeFileSync(new URL('./target.json', import.meta.url), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidateEdgeCount: report.candidateEdgeCount,
  groups: groups.map(g => ({ ...g, candidateEdges: g.candidateEdges.length, candidateKCRoots: g.candidateKCRoots.length })) }));
