import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { readMBON } from '../../src/neural-learning/mbon-readout.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';
import { fileURLToPath } from 'node:url';

const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const runPath = 'research/reports/capture-retention-assay-v3-2026-10-07/seed-47-informative';
const outPath = 'research/reports/capture-retention-assay-v3-2026-10-07/counterfactual-activity-probe-v3.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const p = read(protocolPath), report = read(join(runPath, 'report.json'));
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Frozen identity differs: ${path}`);
assert.equal(await sha256(p.graphPath), p.graphSha256);
assert.equal(await sha256(p.annotationPath), p.annotationSha256);
assert.equal(p.graphSha256, graphHash); assert.equal(p.annotationSha256, annotationHash);
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('Resource guard: 768 MiB RSS / 256 MiB free memory');
};
guard();
const rootIds = readNpz(p.graphPath, ['root_ids']).root_ids;
guard(); const graph = loadGraph(p.graphPath); guard();
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.mappingHash);
const model = new SparseTrainer(graph, { ...p.model, seed: 47 }); guard();
const memory = new ReversalMemory(model, mapping, p.memory); guard();
assert.equal(fixedStateHash(model, memory.edges), report.identity.fixedStateHash);
for (const cell of [...Object.values(p.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)])
  assert.equal(rootIds[cell.index].toString(), cell.rootId);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); guard();
const encoder = createRelationalChessCueEncoder(mapping, p.cue.config);
assert.equal(encoder.identity, report.identity.cueIdentity);
const checkpointNames = readdirSync(runPath).filter(n => /^checkpoint-\d{5}$/.test(n)).sort();
const latestName = checkpointNames.at(-1), latestDir = join(runPath, latestName);
const saved = read(join(latestDir, 'state.json'));
assert.equal(await sha256(join(latestDir, 'state.json')), read(join(latestDir, 'checkpoint.json')).stateSha256);
assert.equal(saved.state.phase, 'complete'); assert.equal(saved.state.pending, null);
assert.equal(digest(saved.state.memory), report.finalMemoryHash);
const initial = memory.snapshot(), learned = saved.state.memory;
const families = readFileSync(p.families.final, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const panels = families.filter(panel => ['te-01', 'te-05'].includes(panel.id));
assert.equal(panels.length, 2);
const expectedReport = new Map(report.final.map(panel => [panel.panelId, panel]));
const memoryHash = () => digest(memory.snapshot());
async function pace(ms) {
  let remaining = ms;
  while (remaining > 0) { const delay = Math.min(250, remaining); await new Promise(resolve => setTimeout(resolve, delay)); remaining -= delay; guard(); }
}
const uniqueGroupKCs = [...new Set(mapping.groups.flatMap(group => group.kc))];
const groupForIndex = new Map();
for (let g = 0; g < mapping.groups.length; g++) for (const i of mapping.groups[g].kc)
  groupForIndex.set(i, [...(groupForIndex.get(i) ?? []), g]);
const edgesByKC = new Map(); let edgeOffset = 0;
for (let g = 0; g < mapping.groups.length; g++) {
  const group = mapping.groups[g];
  for (let j = 0; j < group.edges.length; j++, edgeOffset++) {
    const kc = group.kc[j];
    edgesByKC.set(kc, [...(edgesByKC.get(kc) ?? []), { group: `${group.mbonType}-${group.side}`,
      gainOffset: edgeOffset }]);
  }
}
const states = [{ name: 'scratch', memory: initial }, { name: 'informative-trained', memory: learned }];
const results = [];
for (const state of states) {
  memory.restore(state.memory); const frozen = memoryHash();
  for (const panel of panels) {
    const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
    const candidates = [];
    for (const candidate of [...panel.candidates].sort((a,b) => a.move.localeCompare(b.move))) {
      const cue = encoder.encode(board, candidate.move, p.task), before = board.pgn();
      guard(); const start = performance.now(); model.forward([0], cue.stimulation); await pace(performance.now() - start); guard();
      const h = model.h[model.steps], response = readMBON(Object.fromEntries(Object.entries(p.readouts).map(([type, cells]) =>
        [type, cells.map(cell => h[cell.index])])));
      const rates = new Map(uniqueGroupKCs.map(i => [i, Math.max(0, h[i] - rest[i])]));
      const selected = new Set(cue.stimulation.map(cell => cell.index));
      const tokenRows = cue.assignments.map(({token,index}) => {
        const edges = (edgesByKC.get(index) ?? []).map(edge => ({ ...edge,
          gain: state.memory.gains[edge.gainOffset], changedFromScratch: state.memory.gains[edge.gainOffset] !== 1 }));
        return { token, index, selected: selected.has(index), excessRate: rates.get(index) ?? null,
          relation: token.startsWith('around-target:') ? 'around-target'
            : token.startsWith('around-origin:') ? 'around-origin' : 'other',
          eligiblePlasticEdges: edges.length, changedEligibleEdges: edges.filter(edge => edge.changedFromScratch).length,
          plasticEdgeGroups: [...new Set(edges.map(edge => edge.group))], plasticEdges: edges };
      });
      const activeKCs = uniqueGroupKCs.filter(i => (rates.get(i) ?? 0) > 0);
      const selectedActiveKCs = cue.stimulation.filter(cell => (rates.get(cell.index) ?? 0) > 0).length;
      const mbonGroups = mapping.groups.map(group => ({ side: group.side, mbonType: group.mbonType,
        danType: group.danType, meanDanExcess: group.dan.reduce((sum, cell) => sum + Math.max(0, h[cell.index] - rest[cell.index]), 0) / group.dan.length,
        activeEligibleKCs: [...new Set(group.kc)].filter(i => (rates.get(i) ?? 0) > 0).length,
        changedGainEdgesForCue: group.edges.reduce((count, edge, j) => {
          const kc = group.kc[j], offset = mapping.groups.slice(0, mapping.groups.indexOf(group)).reduce((n,g)=>n+g.edges.length,0)+j;
          return count + (selected.has(kc) && state.memory.gains[offset] !== 1 ? 1 : 0);
        }, 0) }));
      candidates.push({ move: candidate.move, consequence: candidate.proof.status,
        cueIdentity: cue.identity, tokenCount: cue.tokens.length, selectedKCCount: cue.stimulation.length,
        selectedActiveKCs, uniqueActiveKCCount: activeKCs.length,
        selectedKCExcessRateSum: cue.stimulation.reduce((sum, cell) => sum + (rates.get(cell.index) ?? 0), 0),
        response, tokenRows, mbonGroups });
      assert.equal(board.pgn(), before);
    }
    assert.equal(memoryHash(), frozen, 'Read-only evaluation changed memory');
    const row = expectedReport.get(panel.id);
    const runRow = state.name === 'scratch' ? report.baseline.find(x => x.panelId === panel.id) : row;
    for (const candidate of candidates) {
      const frozenRow = runRow.rows.find(x => x.move === candidate.move);
      assert.equal(candidate.response.score, frozenRow.score, `Replay score differs ${state.name}/${panel.id}/${candidate.move}`);
    }
    const byMove = new Map(candidates.map(candidate => [candidate.move, candidate]));
    results.push({ state: state.name, panelId: panel.id, chosenMove: [...candidates].sort((a,b) => b.response.score-a.response.score || a.move.localeCompare(b.move))[0].move,
      correctMove: panel.candidates.find(candidate => candidate.proof.status === 'success').move,
      a2a4MinusE2e6: byMove.get('a2a4').response.score - byMove.get('e2e6').response.score,
      candidates });
  }
}
const scriptPath = fileURLToPath(import.meta.url).replaceAll('\\','/');
const output = { schema: 'capture-retention-counterfactual-activity-probe-v1', protocolSha256: sha(protocolPath),
  frozenRun: runPath, runReportSha256: sha(join(runPath,'report.json')),
  checkpoint: latestName, checkpointStateSha256: sha(join(latestDir,'state.json')),
  scriptPath, scriptSha256: sha(scriptPath), graphSha256: p.graphSha256, annotationSha256: p.annotationSha256,
  mappingHash: p.mappingHash, cueIdentity: encoder.identity, seed: 47,
  scope: 'Read-only re-presentation of the frozen counterfactual candidates at scratch and trained memory; no feedback, plastic update, new learning, or Monte Carlo search.',
  exactReplayMatchesFrozenScores: true, memoryUnchangedDuringAssessment: true,
  interpretation: 'Compare selected/active KC rates, relation-token projection and group DAN activity with the MBON score gap. The same report scores are reproduced exactly; this localizes signal transmission but does not repair or prove transfer.', results };
const text = JSON.stringify(output, null, 2) + '\n';
writeFileSync(`${outPath}.partial`, text, { flag: 'wx' }); renameSync(`${outPath}.partial`, outPath);
writeFileSync(`${outPath}.COMPLETE.partial`, JSON.stringify({ schema: 'capture-retention-counterfactual-activity-probe-complete-v1',
  reportSha256: sha(outPath), protocolSha256: sha(protocolPath) }, null, 2) + '\n', { flag: 'wx' });
renameSync(`${outPath}.COMPLETE.partial`, `${outPath}.COMPLETE`);
console.log(JSON.stringify({ reportPath: outPath, exactReplayMatchesFrozenScores: true,
  choices: results.map(row => ({ state: row.state, panelId: row.panelId, chosenMove: row.chosenMove,
    correctMove: row.correctMove, a2a4MinusE2e6: row.a2a4MinusE2e6 })) }));
