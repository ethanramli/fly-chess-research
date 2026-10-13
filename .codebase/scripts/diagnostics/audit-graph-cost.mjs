import { writeFileSync } from 'node:fs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

if (await sha256('.cache/full.npz') !== graphHash) throw Error('Graph checksum mismatch');
const g = loadGraph('.cache/full.npz'), n = g.row.length - 1, e = g.col.length;
const results = [];
for (const steps of [4, 8, 16]) {
  const needed = new Uint8Array(n);
  for (const i of g.output) needed[i] = 1;
  const layers = [];
  let usefulEdgeVisits = 0, usefulNeuronVisits = 0;
  for (let t = steps; t >= 1; t--) {
    let nodes = 0, edges = 0;
    const prev = needed.slice();
    for (let j = 0; j < n; j++) if (needed[j]) {
      nodes++;
      for (let k = g.row[j]; k < g.row[j + 1]; k++) { edges++; prev[g.col[k]] = 1; }
    }
    // At the first step h0 is fixed zero, so all recurrent products are zero.
    usefulEdgeVisits += t === 1 ? 0 : edges;
    usefulNeuronVisits += nodes;
    layers.push({ timestep: t, nodes, incomingEdges: edges, recurrentProductsNeeded: t === 1 ? 0 : edges });
    needed.set(prev);
  }
  results.push({ steps, layers: layers.reverse(), usefulEdgeVisits, usefulNeuronVisits,
    denseScheduleEdgeVisits: e * steps, fullSparseEdgeVisitSavingFactor: e * steps / usefulEdgeVisits,
    usefulEdgeVisitFraction: usefulEdgeVisits / (e * steps), usefulNeuronVisitFraction: usefulNeuronVisits / (n * steps) });
}
const report = { timestamp: new Date().toISOString(), graphSHA256: graphHash, neurons: n, edges: e,
  method: 'Exact backward dependency sets from final output neurons, including leak self-dependencies; h0 fixed zero. Counts only, no timing or training result.',
  limitations: ['Final-timestep readout only', 'Input injection and bias may make every dependency nonzero', 'Does not justify pruning topology or changing the number of recurrent steps'], results };
writeFileSync('research/reports/graph-dependency-cost.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
