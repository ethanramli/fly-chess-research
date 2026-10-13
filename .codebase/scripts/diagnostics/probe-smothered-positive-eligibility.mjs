// Frozen single-reward diagnostic. It measures positive-channel eligibility,
// not acquired choices, learning efficacy, transfer, or biological validity.
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { annotationHash, digest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const protocolPath = 'research/data/smothered-positive-eligibility-v1/protocol.json';
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const duty = Number(args['cpu-duty']);
if (!args.out || existsSync(args.out) || !Number.isFinite(duty) || duty < 0.1 || duty > 1
  || duty !== p.runtime.cpuDuty) throw Error('Require fresh output and the frozen finite CPU duty');
if (process.version !== p.runtime.nodeVersion
  || !process.execArgv.some(arg => arg === `--max-old-space-size=${p.runtime.heapMiB}`))
  throw Error('Runtime version or explicit heap limit differs from the frozen protocol');

const hashFile = async (path, expected) => assert.equal(await sha256(path), expected, `SHA-256 mismatch: ${path}`);
for (const [path, hash] of Object.entries(p.inputs)) await hashFile(path, hash);
for (const [path, hash] of Object.entries(p.sources)) await hashFile(path, hash);
const require = createRequire(import.meta.url);
const chessEntry = require.resolve('chess.js');
let packageDir = dirname(chessEntry), chessPackage;
while (packageDir !== dirname(packageDir)) {
  const candidate = resolve(packageDir, 'package.json');
  if (existsSync(candidate)) {
    const value = JSON.parse(readFileSync(candidate, 'utf8'));
    if (value.name === 'chess.js') { chessPackage = { path: relative(process.cwd(), candidate).replaceAll('\\', '/'), version: value.version }; break; }
  }
  packageDir = dirname(packageDir);
}
assert.ok(chessPackage, 'Cannot resolve the installed chess.js package identity');
assert.deepEqual(chessPackage, p.runtime.chessPackage);

const acquisition = JSON.parse(readFileSync(p.acquisition.reportPath, 'utf8'));
const acquisitionAudit = JSON.parse(readFileSync(p.acquisition.auditPath, 'utf8'));
assert.equal(acquisition.complete, true);
assert.equal(acquisition.identity.variant.id, 'original');
assert.equal(acquisitionAudit.passed, true);
assert.equal(acquisitionAudit.reportSha256, await sha256(p.acquisition.reportPath));
assert.equal(acquisitionAudit.reportSha256, p.acquisition.reportSha256);
assert.equal(await sha256(p.acquisition.auditPath), p.acquisition.auditSha256);

const baseProtocol = JSON.parse(readFileSync(p.baseProtocolPath, 'utf8'));
assert.equal(baseProtocol.experimentId, 'smothered-acquisition-v1');
assert.deepEqual(p.encoder, baseProtocol.encoder);
assert.deepEqual(p.memory, baseProtocol.memory);
assert.equal(p.current, baseProtocol.current);
assert.equal(acquisition.identity.inputs[p.baseProtocolPath], p.inputs[p.baseProtocolPath]);
assert.equal(acquisition.identity.inputs[p.mappingPath], p.inputs[p.mappingPath]);
assert.equal(acquisition.identity.inputs['.cache/full.npz'], p.inputs['.cache/full.npz']);
assert.equal(acquisition.identity.inputs['.cache/flywire-annotations-v2.1.0.tsv'], p.inputs['.cache/flywire-annotations-v2.1.0.tsv']);

const mapping = JSON.parse(readFileSync(p.mappingPath, 'utf8')).mapping;
assert.equal(digest(mapping), p.shared.mappingHash);
assert.deepEqual(baseProtocol.variants.map(v => ({ id: v.id, conjoin: v.conjoin, stratify: v.stratify })),
  p.variants.map(({ id, conjoin, stratify }) => ({ id, conjoin, stratify })));
for (const variant of p.variants) {
  const report = JSON.parse(readFileSync(variant.reportPath, 'utf8'));
  const audit = JSON.parse(readFileSync(variant.auditPath, 'utf8'));
  assert.equal(report.complete, true);
  assert.equal(report.summary.allBehavioralGatesPassed, true);
  assert.equal(audit.passed, true);
  assert.equal(audit.prefixExact, true);
  assert.equal(audit.reportSha256, variant.reportSha256);
  assert.equal(await sha256(variant.reportPath), variant.reportSha256);
  assert.equal(await sha256(variant.auditPath), variant.auditSha256);
  assert.deepEqual(report.identity.variant, { id: variant.id, conjoin: variant.conjoin, stratify: variant.stratify });
  for (const field of ['model', 'memory', 'invariant', 'readouts', 'mappingHash'])
    assert.deepEqual(report.identity[field], p.shared[field], `Shared prerequisite identity differs: ${variant.id}/${field}`);
  assert.equal(report.identity.inputs[p.mappingPath], p.inputs[p.mappingPath]);
}
for (const field of ['model', 'readouts', 'mappingHash']) assert.deepEqual(acquisition.identity[field], p.shared[field]);
assert.deepEqual(acquisition.identity.memory, p.shared.memory);
assert.equal(acquisition.identity.invariant, p.shared.invariant);

const plan = JSON.parse(readFileSync(p.fixedPlanPath, 'utf8'));
const experience = plan.experiences[0];
assert.equal(experience.status, 'success');
assert.equal(experience.move, 'c4g8');
const inputs = { ...p.inputs, [protocolPath]: await sha256(protocolPath) };
const sources = { ...p.sources };
assert.equal(inputs['.cache/full.npz'], graphHash);
assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'], annotationHash);
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('768 MiB RSS / 256 MiB free-memory resource guard');
};
async function pace(ms) {
  let rest = ms * (1 / duty - 1);
  while (rest > 0) { const delay = Math.min(rest, 250); await new Promise(resolve => setTimeout(resolve, delay)); rest -= delay; guard(); }
}
function atomicJson(path, value) {
  const temporary = `${path}.partial`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  renameSync(temporary, path);
}

const started = performance.now();
guard();
const graph = loadGraph('.cache/full.npz');
guard();
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
guard();
const model = new SparseTrainer(graph, p.shared.model);
guard();
const memory = new ReversalMemory(model, mapping, p.shared.memory);
assert.equal(fixedStateHash(model, memory.edges), p.shared.invariant);
for (const cells of Object.values(p.shared.readouts)) for (const cell of cells) assert.equal(ids[cell.index].toString(), cell.rootId);
for (const group of mapping.groups) for (const cell of group.dan) assert.equal(ids[cell.index].toString(), cell.rootId);
const naive = memory.snapshot();
model.forward([0]);
guard();
const rest = Float32Array.from(model.h[model.steps]);
guard();
await pace(performance.now() - started);

const parent = dirname(resolve(args.out));
if (!existsSync(parent)) throw Error(`Output parent must already exist: ${parent}`);
mkdirSync(args.out, { recursive: false });
const receiptRefs = [], records = [];
for (const variant of p.variants) {
  memory.restore(naive);
  guard();
  const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, conjoin: variant.conjoin, stratify: variant.stratify });
  const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
    readouts: p.shared.readouts, rest, current: p.current, maxPresentations: 1, guard, pace });
  const fixedStateBefore = fixedStateHash(model, memory.edges);
  const receipt = await brain.replay(experience, { channel: 'PAM02' });
  const fixedStateAfter = fixedStateHash(model, memory.edges);
  assert.equal(fixedStateBefore, p.shared.invariant);
  assert.equal(fixedStateAfter, p.shared.invariant);
  // Preserve teacher evidence so the independent auditor can replay the
  // certificate instead of trusting the learner's `verified` receipt fields.
  receipt.independentEvidence = {
    proof: experience.proof,
    fixedStateBefore,
    fixedStateAfter,
  };
  const receiptPath = `${args.out}/${variant.id}.json`;
  atomicJson(receiptPath, receipt);
  const ref = { variant: variant.id, path: receiptPath.replaceAll('\\', '/'), sha256: await sha256(receiptPath) };
  receiptRefs.push(ref);
  let offset = 0;
  const groups = mapping.groups.map(group => {
    let activeEdgeAssociatedKCEntries = 0, changedEdges = 0;
    const activeKCCells = new Set();
    for (let j = 0; j < group.edges.length; j++, offset++) {
      if (receipt.local.kc[offset] > 0) { activeEdgeAssociatedKCEntries++; activeKCCells.add(group.kc[j]); }
      if (receipt.before.gains[offset] !== receipt.after.gains[offset]) changedEdges++;
    }
    return { danType: group.danType, side: group.side, edgeCount: group.edges.length,
      activeEdgeAssociatedKCEntries, activeUniqueKCCells: activeKCCells.size, changedEdges };
  });
  records.push({ variant: variant.id, encoderIdentity: encoder.identity, groups });
}
memory.restore(naive);
const report = {
  schema: p.schema, complete: true,
  identity: { protocolPath, protocolSha256: await sha256(protocolPath), inputs, sources,
    runtime: { nodeVersion: process.version, execArgv: process.execArgv, heapMiB: p.runtime.heapMiB,
      chessPackage, packageJsonSha256: p.inputs['package.json'], packageLockSha256: p.inputs['package-lock.json'] },
    model: model.config, memory: memory.config, memoryIdentity: naive.identity,
    readouts: p.shared.readouts, invariant: p.shared.invariant, mappingHash: digest(mapping) },
  receiptRefs, records, command: { argv: process.argv, execArgv: process.execArgv, cwd: process.cwd() },
  resources: { elapsedSeconds: (performance.now() - started) / 1000,
    peakRssMiB: process.resourceUsage().maxRSS / 1024, duty },
  scope: 'One fresh-state independently verified PAM02 reward per four input variants. Eligibility/update diagnostic only; no candidate-choice acquisition, controls, retention, reversal, or transfer.'
};
atomicJson(`${args.out}/report.json`, report);
console.log(JSON.stringify({ complete: report.complete, records, reportPath: `${args.out}/report.json` }));
