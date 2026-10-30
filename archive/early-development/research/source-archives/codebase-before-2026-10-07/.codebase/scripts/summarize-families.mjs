import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { streamRows } from '../src/lowram/storage.mjs';
import { sha256 } from './fetch-graph.mjs';

const [dir, out, dataset] = process.argv.slice(2);
if (!dir || !out) throw Error('Usage: node scripts/summarize-families.mjs RUN_DIRECTORY REPORT [DATASET]');
const events = readFileSync(join(dir, 'metrics.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const finish = events.findLast(e => e.event === 'finish'), validation = events.findLast(e => e.event === 'validation');
if (!finish || finish.interrupted || validation?.updates !== finish.state.updates) throw Error('Completed final validation required');
const n = validation.criteria.length, groups = new Map(), seen = new Set();
const turnMean = [Array(n).fill(0), Array(n).fill(0)], turnCount = [0, 0], turns = new Map();
const side = fen => {
  const value = fen.trim().split(/\s+/)[1];
  if (!['w', 'b'].includes(value)) throw Error('Invalid side to move');
  return value === 'w' ? 0 : 1;
};
if (dataset) {
  for (const split of ['train', 'validation']) if (await sha256(join(dataset, `${split}.jsonl`)) !== finish.state.identity[split]) throw Error('Dataset does not match run');
  for await (const row of streamRows(join(dataset, 'train.jsonl'))) {
    for (const suffix of ['A', 'B']) {
      const s = side(row[`fen${suffix}`]); turnCount[s]++;
      for (let k = 0; k < n; k++) turnMean[s][k] += row[`target${suffix}`][k];
    }
  }
  for (let s = 0; s < 2; s++) for (let k = 0; k < n; k++) turnMean[s][k] = turnCount[s] ? turnMean[s][k] / turnCount[s] : validation.trainMean[k];
  for await (const row of streamRows(join(dataset, 'validation.jsonl'))) {
    if (turns.size >= 10000 || turns.has(row.id)) throw Error('Too many or duplicate validation rows');
    turns.set(row.id, [side(row.fenA), side(row.fenB)]);
  }
}
for await (const row of streamRows(join(dir, 'validation-predictions.jsonl'))) {
  if (row.updates !== validation.updates) continue;
  if (seen.has(row.pair) || typeof row.group !== 'string') throw Error('Duplicate prediction or missing family');
  seen.add(row.pair);
  if (seen.size > 10000) throw Error('This development summary supports at most 10000 pairs');
  for (const key of ['predictionA', 'predictionB', 'targetA', 'targetB']) if (!Array.isArray(row[key]) || row[key].length !== n || !row[key].every(Number.isFinite)) throw Error('Invalid prediction row');
  if (dataset && !turns.has(row.pair)) throw Error('Missing validation pair');
  if (!groups.has(row.group)) groups.set(row.group, { pairs: 0, mse: Array(n).fill(0), deltaMSE: Array(n).fill(0), constantMSE: Array(n).fill(0), constantDeltaMSE: Array(n).fill(0), turnMSE: Array(n).fill(0), turnDeltaMSE: Array(n).fill(0) });
  const g = groups.get(row.group); g.pairs++;
  for (let k = 0; k < n; k++) {
    const a = row.predictionA[k], b = row.predictionB[k], ya = row.targetA[k], yb = row.targetB[k], mean = validation.trainMean[k];
    g.mse[k] += ((a - ya) ** 2 + (b - yb) ** 2) / 2;
    g.deltaMSE[k] += (a - b - ya + yb) ** 2;
    g.constantMSE[k] += ((mean - ya) ** 2 + (mean - yb) ** 2) / 2;
    g.constantDeltaMSE[k] += (ya - yb) ** 2;
    if (dataset) {
      const [sa, sb] = turns.get(row.pair), ca = turnMean[sa][k], cb = turnMean[sb][k];
      g.turnMSE[k] += ((ca - ya) ** 2 + (cb - yb) ** 2) / 2;
      g.turnDeltaMSE[k] += (ca - cb - ya + yb) ** 2;
    }
  }
}
if (seen.size !== validation.pairs) throw Error('Prediction coverage differs from validation');
const families = [...groups].map(([group, g]) => ({ group, pairs: g.pairs,
  ...Object.fromEntries(['mse', 'deltaMSE', 'constantMSE', 'constantDeltaMSE', ...(dataset ? ['turnMSE', 'turnDeltaMSE'] : [])].map(k => [k, g[k].map(v => v / g.pairs)])) }));
const criteria = validation.criteria.map((name, k) => ({ name,
  familiesBeatingConstantMSE: families.filter(g => g.mse[k] < g.constantMSE[k]).length,
  familiesBeatingConstantDeltaMSE: families.filter(g => g.deltaMSE[k] < g.constantDeltaMSE[k]).length,
  aggregateMSE: validation.mse[k], aggregateConstantMSE: validation.constantMSE[k],
  aggregateDeltaMSE: validation.deltaMSE[k], aggregateConstantDeltaMSE: validation.constantDeltaMSE[k],
  ...(dataset ? { aggregateTurnMSE: families.reduce((s, g) => s + g.pairs * g.turnMSE[k], 0) / seen.size,
    aggregateTurnDeltaMSE: families.reduce((s, g) => s + g.pairs * g.turnDeltaMSE[k], 0) / seen.size,
    familiesBeatingTurnMSE: families.filter(g => g.mse[k] < g.turnMSE[k]).length,
    familiesBeatingTurnDeltaMSE: families.filter(g => g.deltaMSE[k] < g.turnDeltaMSE[k]).length } : {}) }));
const report = { timestamp: new Date().toISOString(), run: dir, updates: validation.updates, familyCount: families.length,
  ...(dataset ? { turnBaseline: { definition: 'Training-label mean separately for white and black to move; no board features', counts: turnCount, means: turnMean } } : {}),
  criteria, families, limitations: ['Descriptive family counts, not confidence intervals or a significance test',
    'Training-mean comparator uses no validation labels', 'Related positions within a family are not independent observations',
    'Development data only; no final test predictions used'] };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ familyCount: families.length, criteria }, null, 2));
