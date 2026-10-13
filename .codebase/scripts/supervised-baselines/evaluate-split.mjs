import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { loadCheckpoint, streamRows } from '../../src/runtime/storage.mjs';
import { encodeFen, encoding, criteria as legacyCriteria } from '../../src/supervised-baselines/positions.mjs';
import { pairedObjective } from '../../src/supervised-baselines/paired.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { checkpoint: { type: 'string' }, dataset: { type: 'string' }, split: { type: 'string', default: 'test' }, out: { type: 'string' } } });
if (!args.checkpoint || !args.dataset || !args.out || !['test', 'validation'].includes(args.split)) throw Error('Require --checkpoint --dataset --split test|validation --out');
const manifest = JSON.parse(readFileSync(join(args.dataset, 'manifest.json'), 'utf8'));
const meta = JSON.parse(readFileSync(join(args.checkpoint, 'manifest.json'), 'utf8'));
const schema = meta.state?.datasetSchema ?? { encoding, criteria: legacyCriteria };
if (manifest.encoding !== schema.encoding || JSON.stringify(manifest.criteria) !== JSON.stringify(schema.criteria)) throw Error('Dataset/checkpoint criterion schema mismatch');
const path = join(args.dataset, `${args.split}.jsonl`);
if (await sha256(path) !== manifest.files[args.split].sha256 || await sha256('.cache/full.npz') !== graphHash) throw Error('Checksum mismatch');
const model = new SparseTrainer(loadGraph('.cache/full.npz'), meta.config); loadCheckpoint(model, args.checkpoint);
const n = schema.criteria.length, sum = Array(n).fill(0), delta = Array(n).fill(0), count = Array(n).fill(0), groups = new Map();
let pairs = 0;
for await (const row of streamRows(path)) {
  if (row.split !== args.split || row.targetA.length !== n || row.targetB.length !== n) throw Error('Invalid evaluation row');
  const a = Array.from(model.forward(encodeFen(row.fenA))), b = Array.from(model.forward(encodeFen(row.fenB)));
  const group = groups.get(row.group) ?? { pairs: 0, mse: Array(n).fill(0), deltaMSE: Array(n).fill(0) }; groups.set(row.group, group); group.pairs++;
  for (let k = 0; k < n; k++) { const ea = a[k] - row.targetA[k], eb = b[k] - row.targetB[k], ed = a[k] - b[k] - row.targetA[k] + row.targetB[k]; sum[k] += (ea * ea + eb * eb) / 2; delta[k] += ed * ed; count[k] += 1; group.mse[k] += (ea * ea + eb * eb) / 2; group.deltaMSE[k] += ed * ed; }
  pairs++;
}
const family = [...groups].map(([group, v]) => ({ group, pairs: v.pairs, mse: v.mse.map(x => x / v.pairs), deltaMSE: v.deltaMSE.map(x => x / v.pairs) }));
const report = { timestamp: new Date().toISOString(), checkpoint: args.checkpoint, dataset: args.dataset, split: args.split, pairs, families: family.length,
  criteria: schema.criteria, mse: sum.map((x, k) => x / (2 * count[k])), pairDifferenceMSE: delta.map((x, k) => x / count[k]),
  family, scope: 'Frozen checkpoint evaluation; no weight updates, test scores not used for selection', limitation: 'No baseline included because this command evaluates only the saved model' };
writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ split: args.split, pairs, families: family.length, mse: report.mse, pairDifferenceMSE: report.pairDifferenceMSE }, null, 2));
