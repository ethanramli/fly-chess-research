// Reanalyse historical receipts; never instantiate a learner or update memory.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const hashes = {};
function read(path) {
  const bytes = readFileSync(path); hashes[path] = createHash('sha256').update(bytes).digest('hex');
  return JSON.parse(bytes);
}
const target = read('research/reports/plasticity-timing-candidate-2026-10-09/target.json');
const mapPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const { mapping } = read(mapPath); assert.equal(hashes[mapPath], target.hashes.mapping);
const protocolPath = 'research/data/mate-conjoined-input-v1/protocol.json';
const protocol = read(protocolPath);
const run = 'research/reports/mate-conjoined-input-v1-2026-10-08';
const result = read(`${run}/result.json`);
assert.equal(hashes[protocolPath], result.identity.protocolSha256);
const edges = mapping.groups.flatMap(g => g.edges), kcs = mapping.groups.flatMap(g => g.kc);
const candidates = new Set(target.groups.flatMap(g => g.candidateEdges));
const offsets = edges.flatMap((e,i) => candidates.has(e) ? [i] : []);
assert.equal(offsets.length, 122);
const candidateKCs = new Set(offsets.map(i => kcs[i]));
const rows = [];
for (let arm = 0; arm < protocol.conditions.length; arm++) {
  for (let slot = 0; slot < protocol.moves.length; slot++) {
    const receipt = read(`${run}/receipt-${arm}-${slot}.json`);
    assert.equal(receipt.eligibility.length, edges.length);
    assert(receipt.eligibility.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    const cue = receipt.frames[0].cue, frame = receipt.frames[0].frame;
    assert.equal(frame.action, protocol.moves[slot]);
    assert.equal(cue.identity, result.identity.encoderIdentities[protocol.variants[arm]]);
    const eligible = offsets.map(i => receipt.eligibility[i]);
    rows.push({ arm, slot, variant: protocol.variants[arm], condition: protocol.conditions[arm],
      action: frame.action, directlyStimulatedCandidateKCs: cue.stimulation.filter(c => candidateKCs.has(c.index)).map(c => c.index),
      totalEligibility: eligible.reduce((a,b) => a+b, 0), maxEligibility: Math.max(...eligible),
      eligibleEdges: eligible.filter(e => e > 0).length, eligible });
  }
}
const comparisons = [0,4].map(arm => {
  const a = rows.find(r => r.arm === arm && r.slot === 0), b = rows.find(r => r.arm === arm && r.slot === 1);
  const dot = a.eligible.reduce((n,v,i) => n+v*b.eligible[i], 0);
  const norm = x => Math.hypot(...x);
  return { arm, variant: a.variant, cosine: dot/(norm(a.eligible)*norm(b.eligible)) || null,
    l1Difference: a.eligible.reduce((n,v,i) => n+Math.abs(v-b.eligible[i]),0),
    limitation: 'Consecutive historical lessons, not same-state counterfactuals; includes different delays and learned states.' };
});
const output = { hashes, candidateEdges: offsets.map(i => edges[i]), rows, comparisons,
  scope: 'Historical input and delayed eligibility coverage only; not new dynamics, receptor timing, causal sensitivity or proposed-rule performance.' };
writeFileSync(new URL('./saved-credit.json', import.meta.url), JSON.stringify(output,null,2)+'\n', { flag:'wx' });
console.log(JSON.stringify({ rows: rows.filter(r => [0,4].includes(r.arm)).map(({eligible,...r}) => r), comparisons },null,2));
