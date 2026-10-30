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
const runPath = 'research/reports/bound-ray-activity-probe-v1-2026-10-07';
const reportPath = `${runPath}/report.json`;
const protocol = JSON.parse(readFileSync(protocolPath, 'utf8'));
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = path => hashBytes(readFileSync(path));
const guard = () => {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > protocol.runtime.maxRssBytes || free < protocol.runtime.minFreeBytes)
    throw Error(`Resource guard: RSS=${rss}; free=${free}`);
};
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
for (const [path, expected] of Object.entries({ ...protocol.inputHashes, ...protocol.sourceHashes }))
  assert.equal(sha(path), expected, `Pinned source/input mismatch: ${path}`);
assert.equal(sha(protocolPath), report.protocolSha256);
assert.equal(sha(reportPath), JSON.parse(readFileSync(`${reportPath}.COMPLETE`, 'utf8')).reportSha256);
assert.equal(sha(protocolPath), JSON.parse(readFileSync(`${reportPath}.COMPLETE`, 'utf8')).protocolSha256);
assert.equal(protocol.graphSha256, graphHash);
assert.equal(report.finalFamilyFilesRead, false);
assert.deepEqual(report.inputSplitScope, ['train', 'validation']);
assert.deepEqual(Object.keys(report.learning).sort(), ['fixedStateUnchanged', 'memoryEvents',
  'neuralPresentations', 'parameterArraysUnchanged', 'persistentMemoryUnchanged', 'plasticityUpdates',
  'searchCalls', 'teacherFeedbackCalls'].sort());
assert.equal(report.learning.neuralPresentations, 48);
assert.equal(report.learning.plasticityUpdates, 0);
assert.equal(report.learning.searchCalls, 0);
assert.equal(report.learning.teacherFeedbackCalls, 0);
assert.equal(report.learning.memoryEvents, 0);
assert.equal(report.learning.parameterArraysUnchanged, true);
assert.equal(report.learning.fixedStateUnchanged, true);
assert.equal(report.learning.persistentMemoryUnchanged, true);
assert.equal(report.rows.length, 12);
assert.ok(report.rows.every(row => ['train', 'validation'].includes(row.split)));
assert.ok(!JSON.stringify(report).includes('final.jsonl'));
assert.ok(!JSON.stringify(protocol).includes('final.jsonl'));

const mapping = JSON.parse(readFileSync(protocol.mappingPath, 'utf8')).mapping;
assert.equal(digest(mapping), protocol.mappingHash);
const rootIds = readNpz(protocol.graphPath, ['root_ids']).root_ids; guard();
for (const cell of Object.values(protocol.readouts).flat()) assert.equal(rootIds[cell.index].toString(), cell.rootId);
const graph = loadGraph(protocol.graphPath); guard();
const model = new SparseTrainer(graph, protocol.model); guard();
const memory = new ReversalMemory(model, mapping, protocol.memory);
const startFixed = fixedStateHash(model, memory.edges), startGains = digest(memory.snapshot());
const v3 = createRelationalChessCueEncoder(mapping, protocol.cueConfigs.relationalV3);
const boundRay = createBoundRayRelationalCueEncoder(mapping, protocol.cueConfigs.boundRay);
assert.equal(v3.identity, protocol.cueIdentityV3);
assert.equal(boundRay.identity, protocol.cueIdentityBoundRay);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); guard();
const actual = new Map();
for (const split of ['train', 'validation']) {
  const path = split === 'train' ? protocol.data.trainPath : protocol.data.validationPath;
  const panels = readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(panels.length, protocol.data[`${split}Panels`]);
  for (const panel of panels) {
    const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
    const row = report.rows.find(entry => entry.split === split && entry.panelId === panel.id);
    assert.ok(row, `Missing panel row ${split}/${panel.id}`);
    assert.equal(row.candidates.length, protocol.data.candidatesPerPanel);
    for (const candidate of panel.candidates) {
      const recorded = row.candidates.find(item => item.move === candidate.move);
      assert.ok(recorded);
      assert.equal(recorded.consequence, candidate.proof.status);
      for (const [encoderName, encoder] of [['relationalV3', v3], ['boundRay', boundRay]]) {
        const cue = encoder.encode(board, candidate.move, protocol.task);
        const before = board.pgn();
        model.forward([0], cue.stimulation);
        const h = model.h[model.steps];
        const response = readMBON(Object.fromEntries(Object.entries(protocol.readouts).map(([type, cells]) =>
          [type, cells.map(cell => h[cell.index])])));
        const summary = recorded[encoderName];
        assert.deepEqual(summary.selectedIndices,
          cue.stimulation.map(cell => cell.index).sort((a,b) => a-b), `Cue differs ${split}/${panel.id}/${candidate.move}/${encoderName}`);
        assert.equal(summary.cueIdentity, cue.identity);
        assert.equal(summary.response.MBON12, response.MBON12);
        assert.equal(summary.response.MBON01, response.MBON01);
        assert.equal(summary.response.score, response.score);
        assert.equal(summary.totalCurrent, 21);
        assert.equal(board.pgn(), before);
        const relations = (cue.assignments ?? []).filter(item => item.family === 'relation'
          || item.token.startsWith('around-target:') || item.token.startsWith('around-origin:'));
        assert.equal(summary.relationActivity.length, relations.length);
        for (const item of relations) {
          const activity = summary.relationActivity.find(value => value.token === item.token && value.index === item.index);
          assert.ok(activity);
          assert.equal(activity.selected, cue.stimulation.some(cell => cell.index === item.index));
          assert.ok(Number.isFinite(activity.excessRate) && activity.excessRate >= 0);
        }
        actual.set(`${split}/${panel.id}/${candidate.move}/${encoderName}`, response.score);
      }
    }
  }
}
assert.equal(fixedStateHash(model, memory.edges), startFixed);
assert.equal(digest(memory.snapshot()), startGains);
assert.equal(memory.events, 0);
for (const row of report.rows) {
  for (const encoder of ['relationalV3', 'boundRay']) {
    const success = row.candidates.find(candidate => candidate.consequence === 'success');
    const failure = row.candidates.find(candidate => candidate.consequence === 'failure');
    const margin = actual.get(`${row.split}/${row.panelId}/${success.move}/${encoder}`)
      - actual.get(`${row.split}/${row.panelId}/${failure.move}/${encoder}`);
    assert.equal(row.margins[encoder], margin);
    assert.equal(row.correctChoice[encoder], margin > 0);
  }
}
const audit = { schema: 'bound-ray-readonly-activity-probe-audit-v1',
  reportPath, reportSha256: sha(reportPath), protocolSha256: sha(protocolPath),
  verifiedPanels: report.rows.length, verifiedCandidatePresentations: report.learning.neuralPresentations,
  exactGraphReadoutReplays: actual.size === report.learning.neuralPresentations,
  allCandidatesAreTrainingOrValidation: true, finalFamilyFilesRead: false,
  zeroPlasticUpdates: memory.events === 0, fixedStateUnchanged: fixedStateHash(model, memory.edges) === startFixed,
  limitations: 'The audit reproduces the activity/readout computation and record arithmetic. It is a read-only engineering sensitivity screen, not evidence of plastic learning or transfer.' };
const out = `${runPath}/audit.json`, partial = `${out}.partial`;
if (existsSync(out) || existsSync(partial) || existsSync(`${out}.COMPLETE`)) throw Error('Audit output already exists');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(partial, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' }); renameSync(partial, out);
writeFileSync(`${out}.COMPLETE.partial`, `${JSON.stringify({ schema: 'bound-ray-activity-probe-audit-complete-v1',
  auditSha256: sha(out), reportSha256: sha(reportPath), protocolSha256: sha(protocolPath) }, null, 2)}\n`, { flag: 'wx' });
renameSync(`${out}.COMPLETE.partial`, `${out}.COMPLETE`);
console.log(JSON.stringify({ auditPath: out, verifiedPanels: audit.verifiedPanels,
  exactGraphReadoutReplays: audit.exactGraphReadoutReplays, finalFamilyFilesRead: false }));
