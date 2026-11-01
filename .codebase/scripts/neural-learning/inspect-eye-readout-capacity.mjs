// Static direct-input surrogate only. No neural forward pass, learning, fitted gains or checkpoint export.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { constrainedBoxBound } from '../../src/neural-learning/memory-assay-readout-bound.mjs';
const sha = x => createHash('sha256').update(x).digest('hex');

export function directContrast(good, bad, weights, keys) {
  const contributions = code => {
    const currents = new Map(code.map(c => [c.index, c.current]));
    assert.equal(currents.size, code.length);
    const v = keys.map(key => weights.get(key) * (currents.get(Number(key.split('/')[1])) ?? 0));
    const total = v.reduce((a, b) => a + b, 0);
    assert(total > 0 && Number.isFinite(total), 'No finite direct response');
    return { normalized: v.map(x => x / total), total };
  };
  const g = contributions(good), b = contributions(bad);
  return { a: b.normalized.map((x, i) => .5 * (x - g.normalized[i])), naiveGood: g.total, naiveBad: b.total,
    commonOffsetSensitivity: .5 * (1 / b.total - 1 / g.total) };
}

export function pairBound(reversed, other, retainedMargin) {
  const a = [...reversed.a, 0], b = [...other.a, -retainedMargin];
  const lo = [...other.a.map(() => .2), 1], hi = [...other.a.map(() => 1), 1];
  const bound = constrainedBoxBound(a, b, lo, hi);
  return { ...bound, requiredReversed: .15, requiredOther: retainedMargin,
    incompatibleInSurrogate: !bound.feasible || bound.upper < .15 - 1e-9 };
}

async function main() {
  const { values: a } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' } } });
  assert(a.run && a.out && !existsSync(a.out), 'Require --run DIR --out FRESH_JSON');
  const guard = () => assert(process.memoryUsage().rss <= 2048 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
  guard();
  const rosterBytes = readFileSync('.codebase/src/neural-learning/neuron-reader-cells.json'), roster = JSON.parse(rosterBytes);
  assert.equal(sha(readFileSync('.cache/full.npz')), roster.graphSha256);
  const graph = loadGraph('.cache/full.npz'); guard();
  const published = JSON.parse(readFileSync(`${a.run}/completed.json`)).records;
  const lines = readFileSync(`${a.run}/records.jsonl`, 'utf8').split('\n').slice(0, published), rows = lines.map(JSON.parse);
  const results = [], headers = {};
  for (const r of rows.filter(r => r.arm === 'informative')) {
    const raw = readFileSync(`${a.run}/frames-${r.seed}-informative.jsonl`, 'utf8'), h = JSON.parse(raw.slice(0, raw.indexOf('\n')));
    headers[r.seed] = sha(raw.slice(0, raw.indexOf('\n')));
    const used = new Set(h.items.flatMap(x => x.images.flatMap(code => code.map(c => c.index)))), weights = new Map();
    for (const [group, g] of h.mapping.groups.entries()) {
      const targets = roster.cells.filter(c => c.type === g.mbonType).map(c => c.index);
      for (const j of targets) {
        let sum = 0;
        for (let e = graph.row[j]; e < graph.row[j + 1]; e++) sum += Math.log1p(graph.initial[e]);
        for (let e = graph.row[j]; e < graph.row[j + 1]; e++) {
          if (!g.edges.includes(e) || !used.has(graph.col[e])) continue;
          assert.equal(graph.sign[e], 1);
          const key = `${group}/${graph.col[e]}`, weight = Math.fround(.9 * Math.log1p(graph.initial[e]) / sum) / targets.length;
          weights.set(key, (weights.get(key) ?? 0) + weight);
        }
      }
    }
    const keys = [...weights.keys()], reversed = directContrast(h.items[0].images[1], h.items[0].images[0], weights, keys);
    for (let j = 1; j < h.items.length; j++) {
      const other = directContrast(h.items[j].images[0], h.items[j].images[1], weights, keys);
      const measuredBefore = r.tests.Delay[j].mNorm, measuredAfter = r.tests.Rev[j].mNorm;
      results.push({ seed: r.seed, item: j, variables: keys.length, measuredBefore, measuredAfter,
        naiveDirectGood: other.naiveGood, naiveDirectBad: other.naiveBad, commonOffsetSensitivity: other.commonOffsetSensitivity,
        bound: pairBound(reversed, other, Math.max(0, .8 * measuredBefore)) });
    }
  }
  guard();
  const result = { scope: 'static direct-input surrogate only; neither feasibility nor impossibility of the full recurrent learner is established',
    publishedArmRecords: published, informativeSeeds: [...new Set(results.map(r => r.seed))], results,
    sourceHashes: { graph: roster.graphSha256, roster: sha(rosterBytes), publishedRecords: sha(lines.join('\n') + '\n'), inputHeaders: headers,
      instrument: sha(readFileSync('.codebase/src/neural-learning/memory-assay-readout-bound.mjs')), self: sha(readFileSync(new URL(import.meta.url))) }, peakRssMiB: process.resourceUsage().maxRSS / 1024 };
  writeFileSync(a.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ informativeSeeds: result.informativeSeeds, comparisons: results.length,
    incompatibleInSurrogate: results.filter(r => r.bound.incompatibleInSurrogate).map(r => [r.seed, r.item]), scope: result.scope }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.stack); process.exitCode = 1; });
