import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGraph, readNpz } from '../../.codebase/src/runtime/graph.mjs';

const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const graphPath = '.cache/full.npz';
const graph = loadGraph(graphPath);
const roots = readNpz(graphPath, ['root_ids']).root_ids;
const indexByRoot = new Map(Array.from(roots, (root, i) => [String(root), i]));
const annotations = readFileSync('.cache/flywire-annotations-v2.1.0.tsv', 'utf8').trimEnd().split(/\r?\n/);
const fields = annotations.shift().split('\t');
const rootField = fields.indexOf('root_id'), classField = fields.indexOf('cell_class'), typeField = fields.indexOf('hemibrain_type');
const kcPosition = new Map();
const mbonIndices = [];
const mbonTypes = new Set(['MBON11', 'MBON12', 'MBON02', 'MBON05', 'MBON01', 'MBON15']);
for (const line of annotations) {
  const row = line.split('\t');
  const index = indexByRoot.get(row[rootField]);
  if (index === undefined) continue;
  if (row[classField] === 'Kenyon_Cell') kcPosition.set(index, kcPosition.size);
  else if (row[classField] !== 'DAN' && mbonTypes.has(row[typeField])) mbonIndices.push(index);
}
assert.equal(kcPosition.size, 5177);
assert.equal(mbonIndices.length, 16);
const weights = new Uint32Array(kcPosition.size);
for (const index of mbonIndices) {
  for (let edge = graph.row[index]; edge < graph.row[index + 1]; edge++) {
    const column = kcPosition.get(graph.col[edge]);
    if (graph.sign[edge] === 1 && column !== undefined) weights[column]++;
  }
}
const columns = Array.from(weights.keys()).filter(i => weights[i] > 0);
const maskEdges = weights.reduce((sum, count) => sum + count, 0);
assert.equal(maskEdges, 6046);
const boards = dump.dumps.filter(row => row.theta === 0.01);
assert.deepEqual(boards.map(row => row.boardId), ['Q04sIPQ5:13', 'SjmcbcGu:16', '5XRGyGSj:13']);
const positive = [];
const boardPairs = boards.map(({boardId, moves, allKc}) => {
  assert.equal(moves.length, allKc.length);
  const vectors = allKc.map(rates => {
    assert.equal(rates.length, kcPosition.size);
    return columns.map(i => {
      assert(Number.isFinite(rates[i]) && rates[i] >= 0);
      if (rates[i] > 0) for (let repeat = 0; repeat < weights[i]; repeat++) positive.push(rates[i]);
      return rates[i];
    });
  });
  const pairs = [];
  for (let i = 0; i < moves.length; i++) {
    for (let j = i + 1; j < moves.length; j++) {
      const a = vectors[i], b = vectors[j];
      let original = 0;
      for (let k = 0; k < columns.length; k++) original += weights[columns[k]] * Math.abs(a[k] - b[k]);
      pairs.push({a, b, original});
    }
  }
  return {boardId, pairs};
});

function worstRetention(scale, pairs) {
  let worst = 1;
  for (const {a, b, original} of pairs) {
    if (original === 0) continue;
    let retained = 0;
    for (let k = 0; k < columns.length; k++) {
      retained += weights[columns[k]] * Math.abs(Math.min(a[k], scale) - Math.min(b[k], scale));
    }
    worst = Math.min(worst, retained / original);
  }
  return worst;
}
positive.sort((a, b) => a - b);
assert(positive.length > 0);
const middle = Math.floor(positive.length / 2);
const median = positive.length % 2 === 0 ? (positive[middle - 1] + positive[middle]) / 2 : positive[middle];
const pairs = boardPairs.flatMap(board => board.pairs);
let low = 0, high = positive.at(-1);
for (let iteration = 0; iteration < 40; iteration++) {
  const mid = (low + high) / 2;
  if (worstRetention(mid, pairs) >= 0.99) high = mid;
  else low = mid;
}
const candidateScale = Math.ceil(high * 1e6) / 1e6;
const describe = scale => ({scale, positiveShareAtCap: positive.filter(rate => rate >= scale).length / positive.length,
  boards: boardPairs.map(({boardId, pairs}) => ({boardId, pairs: pairs.length, identicalPairs: pairs.filter(p => p.original === 0).length,
    worstRetained: worstRetention(scale, pairs)}))});
const candidate = describe(candidateScale);
assert(candidate.boards.every(x => x.worstRetained >= 0.99));
console.log(JSON.stringify({method: 'At zero drive, retain at least 99% of summed absolute rate difference for every legal-move pair. Count each KC once per learnable outgoing connection in the 6046-edge mask. Round the minimum scale upward to the nearest 0.000001.', outcomesUsed: false, maskEdges, distinctPresynapticKCs: columns.length,
  positiveRatesWeightedByEdges: positive.length, candidate, median: describe(median), previouslyProposedMaximum: describe(0.022)}, null, 2));
