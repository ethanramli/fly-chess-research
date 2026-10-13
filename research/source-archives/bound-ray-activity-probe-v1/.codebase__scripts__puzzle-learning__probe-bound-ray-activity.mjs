import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { readMBON } from '../../src/neural-learning/mbon-readout.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';
import { graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/bound-ray-activity-probe-v1/protocol.json';
const protocol = JSON.parse(readFileSync(protocolPath, 'utf8'));
const argv = process.argv.slice(2);
const value = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const duty = Number(value('--cpu-duty'));
const outPath = value('--out') ?? protocol.reportPath;
if (!process.execArgv.includes('--max-old-space-size=256') || duty !== 0.5)
  throw Error('Run with --max-old-space-size=256 and --cpu-duty 0.5');
if (protocol.schema !== 'bound-ray-readonly-activity-probe-v1' || !protocol.method.noFinalFilesRead
  || !protocol.method.noPlasticity || !protocol.method.noSearch) throw Error('Unexpected frozen probe scope');
if (!outPath.startsWith('research/reports/bound-ray-activity-probe-v1-2026-10-07/'))
  throw Error('Output must remain in the declared probe report family');
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = path => hashBytes(readFileSync(path));
const paramHash = model => {
  const h = createHash('sha256');
  for (const [key, array] of Object.entries(model.params)) { h.update(key); h.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)); }
  return h.digest('hex');
};
const guard = () => {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > protocol.runtime.maxRssBytes || free < protocol.runtime.minFreeBytes)
    throw Error(`Resource guard: RSS=${rss}; free=${free}`);
  return { rssBytes: rss, freeBytes: free };
};
for (const [path, expected] of Object.entries({ ...protocol.inputHashes, ...protocol.sourceHashes }))
  assert.equal(sha(path), expected, `Pinned source/input mismatch: ${path}`);
assert.equal(sha(protocol.graphPath), protocol.graphSha256);
assert.equal(sha(protocol.annotationPath), protocol.annotationSha256);
assert.equal(protocol.graphSha256, graphHash);
assert.equal(sha(protocol.dependency.resolvedEntryPath), protocol.dependency.resolvedEntrySha256);
assert.equal(JSON.parse(readFileSync(protocol.dependency.packagePath, 'utf8')).version, protocol.dependency.version);
guard();

const mapping = JSON.parse(readFileSync(protocol.mappingPath, 'utf8')).mapping;
assert.equal(digest(mapping), protocol.mappingHash);
const rootIds = readNpz(protocol.graphPath, ['root_ids']).root_ids;
guard();
for (const cell of Object.values(protocol.readouts).flat())
  assert.equal(rootIds[cell.index].toString(), cell.rootId, 'Readout identity differs from released root ID');
const graph = loadGraph(protocol.graphPath); guard();
const model = new SparseTrainer(graph, protocol.model); guard();
const memory = new ReversalMemory(model, mapping, protocol.memory);
assert.ok(memory.gains.every(gain => gain === 1));
assert.equal(memory.events, 0);
const initialParamHash = paramHash(model), initialFixedHash = fixedStateHash(model, memory.edges);
const initialMemoryHash = digest(memory.snapshot());
const v3 = createRelationalChessCueEncoder(mapping, protocol.cueConfigs.relationalV3);
const boundRay = createBoundRayRelationalCueEncoder(mapping, protocol.cueConfigs.boundRay);
assert.equal(v3.identity, protocol.cueIdentityV3);
assert.equal(boundRay.identity, protocol.cueIdentityBoundRay);
model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]);
guard();

async function pace(computeMs) {
  let remaining = computeMs * (1 / duty - 1);
  while (remaining > 0) {
    const sleepMs = Math.min(250, remaining);
    await new Promise(resolve => setTimeout(resolve, sleepMs));
    remaining -= sleepMs;
    guard();
  }
}
function cueActivity(encoder, board, move) {
  const cue = encoder.encode(board, move, protocol.task);
  const before = performance.now();
  model.forward([0], cue.stimulation);
  const computeMs = performance.now() - before;
  return pace(computeMs).then(() => {
    const h = model.h[model.steps];
    const response = readMBON(Object.fromEntries(Object.entries(protocol.readouts).map(([type, cells]) =>
      [type, cells.map(cell => h[cell.index])])));
    const activeKC = index => Math.max(0, h[index] - rest[index]);
    const selected = new Set(cue.stimulation.map(cell => cell.index));
    const relations = (cue.assignments ?? []).filter(row => row.family === 'relation'
      || row.token.startsWith('around-target:') || row.token.startsWith('around-origin:'))
      .map(row => ({ token: row.token, index: row.index, selected: selected.has(row.index),
        excessRate: activeKC(row.index) }));
    return { cueIdentity: cue.identity, selectedIndices: [...selected].sort((a,b) => a-b),
      totalCurrent: cue.accounting?.totalCurrent ?? protocol.cueConfigs.relationalV3.totalCurrent,
      response, relationActivity: relations, selectedActiveKCCount: cue.stimulation.filter(cell => activeKC(cell.index) > 0).length,
      selectedKCExcessRateSum: cue.stimulation.reduce((sum, cell) => sum + activeKC(cell.index), 0),
      computeMs };
  });
}
function panelsFor(split) {
  const path = split === 'train' ? protocol.data.trainPath : protocol.data.validationPath;
  return readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
}
const outputRows = [];
let presentations = 0, presentationCpuMs = 0, maxRssBytes = process.memoryUsage().rss;
for (const split of protocol.data.splits) {
  for (const panel of panelsFor(split)) {
    assert.equal(panel.task?.objective, protocol.task.objective);
    assert.equal(panel.task?.plies, protocol.task.plies);
    assert.equal(panel.candidates.length, protocol.data.candidatesPerPanel);
    const board = new Chess(); board.loadPgn(panel.pgn);
    assert.equal(board.fen(), panel.fen);
    assert.equal(new Set(panel.candidates.map(candidate => candidate.proof.status)).size, 2);
    const candidates = [];
    for (const candidate of [...panel.candidates].sort((a,b) => a.move.localeCompare(b.move))) {
      const boardBefore = board.pgn();
      const base = await cueActivity(v3, board, candidate.move);
      const enhanced = await cueActivity(boundRay, board, candidate.move);
      candidates.push({ move: candidate.move, consequence: candidate.proof.status,
        relationalV3: base, boundRay: enhanced,
        scoreDifferenceBoundRayMinusV3: enhanced.response.score - base.response.score,
        changedSelectedCells: base.selectedIndices.filter(index => !enhanced.selectedIndices.includes(index)).length
          + enhanced.selectedIndices.filter(index => !base.selectedIndices.includes(index)).length });
      assert.equal(board.pgn(), boardBefore);
      presentations += 2; presentationCpuMs += base.computeMs + enhanced.computeMs;
      maxRssBytes = Math.max(maxRssBytes, process.memoryUsage().rss); guard();
    }
    const success = candidates.find(candidate => candidate.consequence === 'success');
    const failure = candidates.find(candidate => candidate.consequence === 'failure');
    assert.ok(success && failure);
    outputRows.push({ split, panelId: panel.id, candidates,
      margins: { relationalV3: success.relationalV3.response.score - failure.relationalV3.response.score,
        boundRay: success.boundRay.response.score - failure.boundRay.response.score },
      correctChoice: { relationalV3: success.relationalV3.response.score > failure.relationalV3.response.score,
        boundRay: success.boundRay.response.score > failure.boundRay.response.score } });
  }
}
assert.equal(presentations, 48);
assert.equal(paramHash(model), initialParamHash, 'Neural parameter arrays changed during read-only probe');
assert.equal(fixedStateHash(model, memory.edges), initialFixedHash, 'Fixed-state identity changed');
assert.equal(digest(memory.snapshot()), initialMemoryHash, 'Persistent memory changed');
assert.equal(memory.events, 0);
const summary = Object.fromEntries(protocol.data.splits.map(split => {
  const rows = outputRows.filter(row => row.split === split);
  return [split, Object.fromEntries(['relationalV3', 'boundRay'].map(name => {
    const margins = rows.map(row => row.margins[name]);
    return [name, { panels: rows.length, positiveMargins: margins.filter(x => x > 0).length,
      negativeMargins: margins.filter(x => x < 0).length, ties: margins.filter(x => x === 0).length,
      meanSuccessMinusFailureMargin: margins.reduce((a,b) => a+b, 0) / margins.length }];
  }))];
}));
const report = { schema: 'bound-ray-readonly-activity-probe-result-v1',
  protocolPath, protocolSha256: sha(protocolPath), graphSha256: protocol.graphSha256,
  annotationSha256: protocol.annotationSha256, mappingHash: protocol.mappingHash,
  cueIdentities: { relationalV3: v3.identity, boundRay: boundRay.identity },
  inputSplitScope: [...protocol.data.splits], finalFamilyFilesRead: false,
  learning: { neuralPresentations: presentations, plasticityUpdates: 0, memoryEvents: memory.events,
    parameterArraysUnchanged: true, fixedStateUnchanged: true, persistentMemoryUnchanged: true,
    searchCalls: 0, teacherFeedbackCalls: 0 },
  metrics: { wallSeconds: process.uptime(), presentationCpuMs, maxRssBytes,
    currentFreeBytes: os.freemem(), node: process.version, cpuDuty: duty },
  summary, rows: outputRows,
  interpretation: 'Read-only activity/readout sensitivity screen on train and validation. A change in KC activity or MBON margin shows the engineered input reaches this model response; it does not show that feedback can teach a useful ranking, that the relation is learned, or that it transfers.' };
mkdirSync(dirname(outPath), { recursive: true });
const partial = `${outPath}.partial`;
if (existsSync(outPath) || existsSync(partial) || existsSync(`${outPath}.COMPLETE`)) throw Error('Output already exists; choose a fresh run directory');
writeFileSync(partial, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
renameSync(partial, outPath);
const completePath = `${outPath}.COMPLETE`;
writeFileSync(`${completePath}.partial`, `${JSON.stringify({ schema: 'bound-ray-activity-probe-complete-v1',
  reportSha256: sha(outPath), protocolSha256: sha(protocolPath) }, null, 2)}\n`, { flag: 'wx' });
renameSync(`${completePath}.partial`, completePath);
console.log(JSON.stringify({ reportPath: outPath, reportSha256: sha(outPath), presentations,
  summary, maxRssBytes, finalFamilyFilesRead: false }));
