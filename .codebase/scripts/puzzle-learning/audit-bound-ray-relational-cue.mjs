// Static input audit on train/validation only. No connectome inference or learning.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';

const root = process.cwd(), protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const reportPath = 'research/reports/capture-retention-assay-v3-2026-10-07/bound-ray-input-audit.json';
const sha = value => createHash('sha256').update(value).digest('hex');
const bytes = path => readFileSync(resolve(root, path));
const protocolBytes = bytes(protocolPath), protocol = JSON.parse(protocolBytes);
for (const [path, expected] of Object.entries(protocol.sourceHashes))
  if (sha(bytes(path)) !== expected) throw Error(`Frozen source mismatch: ${path}`);
if (digest(JSON.parse(bytes(protocol.mappingPath)).mapping) !== protocol.mappingHash)
  throw Error('Frozen mapping identity mismatch');
for (const path of ['package.json', 'package-lock.json', 'node_modules/chess.js/package.json'])
  if (sha(bytes(path)) !== protocol.inputHashes[path]) throw Error(`Dependency identity mismatch: ${path}`);
const mapping = JSON.parse(bytes(protocol.mappingPath)).mapping;
const config = { ...protocol.cue.config, maxRelationCells: 4 };
const baseEncoder = createRelationalChessCueEncoder(mapping, protocol.cue.config);
const boundEncoder = createBoundRayRelationalCueEncoder(mapping, config);
const splits = {};
for (const split of ['train', 'validation']) {
  const path = protocol.families[split], raw = bytes(path);
  if (sha(raw) !== protocol.inputHashes[path]) throw Error(`Frozen ${split} family hash mismatch`);
  const panels = raw.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  let candidateCues = 0, panelContrastsWithRayChange = 0, raySelectedCues = 0, totalSelectedRayCells = 0;
  let baselinePairOverlap = 0, boundPairOverlap = 0, cueIdentityChanges = 0;
  const rows = [];
  for (const panel of panels) {
    const board = new Chess(); board.loadPgn(panel.pgn);
    if (board.fen() !== panel.fen) throw Error(`History/FEN mismatch: ${panel.id}`);
    const cueRows = [];
    for (const candidate of panel.candidates) {
      const base = baseEncoder.encode(board, candidate.move, panel.task);
      const bound = boundEncoder.encode(board, candidate.move, panel.task);
      if (bound.stimulation.length !== 14 || bound.accounting.totalCurrent !== 21)
        throw Error(`Dose mismatch: ${panel.id}/${candidate.move}`);
      if (bound.tokens.some(token => /success|failure|safe|unsafe|recaptur/i.test(token)))
        throw Error(`Outcome-like token in cue: ${panel.id}/${candidate.move}`);
      const baseCells = base.stimulation.map(row => row.index).sort((a, b) => a - b);
      const boundCells = bound.stimulation.map(row => row.index).sort((a, b) => a - b);
      const ray = new Set(bound.relation.tokens);
      raySelectedCues += bound.relation.selectedCells > 0 ? 1 : 0;
      totalSelectedRayCells += bound.relation.selectedCells;
      cueIdentityChanges += JSON.stringify(baseCells) !== JSON.stringify(boundCells) ? 1 : 0;
      candidateCues++;
      cueRows.push({ move: candidate.move, baselineCells: baseCells, boundCells,
        relationTokens: [...ray].sort(), relationTokenCount: ray.size,
        relationCellsSelected: bound.relation.selectedCells,
        droppedRelationTokens: bound.relation.droppedTokens });
    }
    const [a, b] = cueRows;
    if (JSON.stringify(a.relationTokens) !== JSON.stringify(b.relationTokens)) panelContrastsWithRayChange++;
    baselinePairOverlap += a.baselineCells.filter(index => b.baselineCells.includes(index)).length;
    boundPairOverlap += a.boundCells.filter(index => b.boundCells.includes(index)).length;
    rows.push({ panel: panel.id, candidates: cueRows });
  }
  splits[split] = { datasetPath: path, datasetSha256: sha(raw), panels: panels.length,
    candidateCues, panelsWithDifferentBoundRayInventories: panelContrastsWithRayChange,
    cuesWithSelectedRelationCells: raySelectedCues,
    meanSelectedRelationCellsPerCue: Number((totalSelectedRayCells / candidateCues).toFixed(4)),
    cuesWithChangedStimulationVsV3: cueIdentityChanges,
    meanWithinPanelSharedCellsV3: Number((baselinePairOverlap / panels.length).toFixed(4)),
    meanWithinPanelSharedCellsBoundRay: Number((boundPairOverlap / panels.length).toFixed(4)), rows };
}
const output = { schema: 'bound-ray-relational-cue-static-audit-v1',
  scope: 'Static train/validation input comparison only. The final family is not opened. No neural activity, connectome inference, feedback, plastic update, search, or performance claim.',
  protocolSha256: sha(protocolBytes), mappingHash: protocol.mappingHash,
  v3CueIdentity: baseEncoder.identity, boundRayCueIdentity: boundEncoder.identity,
  auditScriptSha256: sha(bytes('.codebase/scripts/puzzle-learning/audit-bound-ray-relational-cue.mjs')),
  encoderSha256: sha(bytes('.codebase/src/chess-input/bound-ray-relational-cue.mjs')),
  config, dose: { cells: 14, totalCurrent: 21 }, splits,
  interpretation: 'This checks whether a label-blind, candidate-target slider/intervening-piece geometry feature is present and selected under the fixed input budget. Different tokens and KC stimulation do not establish neural activation, useful synaptic change, learning, causal credit, transfer, or improved search. This is an engineering hypothesis requiring a new frozen protocol and untouched final families.' };
mkdirSync(dirname(resolve(root, reportPath)), { recursive: true });
const temp = `${resolve(root, reportPath)}.partial`;
writeFileSync(temp, `${JSON.stringify(output, null, 2)}\n`);
renameSync(temp, resolve(root, reportPath));
console.log(JSON.stringify({ passed: true, reportPath, reportSha256: sha(bytes(reportPath)),
  finalRead: false, splits: Object.fromEntries(Object.entries(splits).map(([name, value]) => [name, value.panels])) }));
