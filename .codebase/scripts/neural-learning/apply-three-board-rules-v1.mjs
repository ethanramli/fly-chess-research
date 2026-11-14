#!/usr/bin/env node
// Applies the fixed decision rules of the three-board feedback test to the six runs of probe-wide-learning-v3.mjs.
// Usage (repo root): node .codebase/scripts/neural-learning/apply-three-board-rules-v1.mjs --runs DIR --baseline PROBE_JSON --packet BOARDS_JSONL [--out FILE]
// DIR holds six run directories named CIRCUIT-CONDITION (current-correct ... quiet-off). PROBE_JSON is the replay's valence-baseline/probe.json.
// BOARDS_JSONL is the verified board packet; its hash must match the pin, because lessons and safe captures are checked against it.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CIRCUITS, CONDITIONS, decide } from '../../src/neural-learning/three-board-feedback-v1.mjs';
const { values: args } = parseArgs({ options: { runs: { type: 'string' }, baseline: { type: 'string' }, packet: { type: 'string' }, out: { type: 'string' } } });
if (!args.runs || !args.baseline || !args.packet) throw Error('Need --runs DIR, --baseline PROBE_JSON and --packet BOARDS_JSONL');
const PACKET_SHA256 = 'fc058e1eda3604c7dc74db625778f1645f0ad350ce23c438b44017079487f429'; // the replay's boards.jsonl, as pinned in its config
const packetBytes = readFileSync(args.packet), packetHash = createHash('sha256').update(packetBytes).digest('hex');
if (packetHash !== PACKET_SHA256) throw Error(`Board packet hash ${packetHash}, expected ${PACKET_SHA256}`);
const packet = packetBytes.toString('utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const load = dir => {
  if (!existsSync(join(dir, 'manifest.json'))) return { failed: 'no manifest' };
  const manifest = readJson(join(dir, 'manifest.json'));
  if (manifest.status !== 'complete') return { failed: `status ${manifest.status}${manifest.error ? `: ${manifest.error}` : ''}` };
  return readJson(join(dir, 'result.json'));
};
const results = Object.fromEntries(Object.keys(CIRCUITS).map(c => [c, Object.fromEntries(CONDITIONS.map(k => [k, load(join(args.runs, `${c}-${k}`))]))]));
const row = readJson(args.baseline).rows[0];
const baseline = { boardId: row.boardId, scores: { [row.bestSafe.move]: row.bestSafe.score, [row.bestOther.move]: row.bestOther.score } };
const decision = decide(results, baseline, packet);
const pct = x => `${(100 * x).toFixed(1)}%`;
console.log(`Verdict: ${decision.verdict} (${decision.reason})`);
for (const f of decision.failures) console.log(`  failed check: ${f}`);
for (const b of decision.boards) {
  console.log(`${b.boardId}: qualifies in both circuits ${b.eligibleInBoth ? 'yes' : 'no'}`);
  for (const c of Object.keys(CIRCUITS)) {
    const r = b[c], k = r.conditions;
    console.log(`  ${c}: gap ${r.gap.toExponential(4)} (${r.eligible ? 'qualifies' : 'too small or safe capture ahead'}; ${pct(r.gapShareOfRange)} of score range, ${r.movesAboveSafe} moves above), `
      + `closure correct ${pct(k.correct.closure)}, swapped ${pct(k.swapped.closure)}, off ${pct(k.off.closure)}, advantage ${(100 * r.advantage).toFixed(1)} points`);
    for (const name of CONDITIONS) console.log(`    ${name}: safe ${k[name].safe.from.move}->${k[name].safe.to.move} ${k[name].safe.change.toExponential(3)}, rival ${k[name].rival.from.move}->${k[name].rival.to.move} ${k[name].rival.change.toExponential(3)}, gap change ${k[name].gapChange.toExponential(3)}`);
  }
}
if (args.out) writeFileSync(args.out, `${JSON.stringify(decision, null, 1)}\n`);
