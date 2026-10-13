// Static audit only: compare deterministic KC projections on train/validation.
// Does not read final data, run the connectome, teach, or select a seed.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';

const root = process.cwd();
const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const dataDir = 'research/data/capture-retention-transfer-v2';
const outPath = 'research/reports/capture-retention-assay-v3-2026-10-07/projection-seed-audit.json';
const seeds = [14009, 47, 53, 59, 61, 67, 101, 2026];
const sha = value => createHash('sha256').update(value).digest('hex');
const bytes = path => readFileSync(resolve(root, path));
const protocolBytes = bytes(protocolPath), protocol = JSON.parse(protocolBytes);
if (digest(JSON.parse(bytes(protocol.mappingPath)).mapping) !== protocol.mappingHash) throw Error('Mapping identity differs from frozen protocol');
for (const [path, expected] of Object.entries(protocol.sourceHashes))
  if (sha(bytes(path)) !== expected) throw Error(`Pinned source differs: ${path}`);
for (const path of ['package.json', 'package-lock.json', 'node_modules/chess.js/package.json'])
  if (sha(bytes(path)) !== protocol.inputHashes[path]) throw Error(`Pinned dependency identity differs: ${path}`);
const mapping = JSON.parse(bytes(protocol.mappingPath)).mapping;
const splits = {};

for (const split of ['train', 'validation']) {
  const path = `${dataDir}/${split}.jsonl`, raw = bytes(path);
  if (sha(raw) !== protocol.inputHashes[path]) throw Error(`Pinned ${split} dataset identity differs`);
  const panels = raw.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const results = [];
  for (const seed of seeds) {
    const encoder = createRelationalChessCueEncoder(mapping, { ...protocol.cue.config, seed });
    let sharedCells = 0, exactCandidatePairs = 0, cueCount = 0;
    const patterns = new Set(), cellsByLabel = new Map();
    for (const panel of panels) {
      if (panel.schema !== 'capture-retention-panel-v1' || panel.candidates.length !== 2) throw Error(`Unexpected panel ${panel.id}`);
      const board = new Chess(); board.loadPgn(panel.pgn);
      if (board.fen() !== panel.fen) throw Error(`FEN mismatch ${panel.id}`);
      const candidateCells = [];
      for (const candidate of panel.candidates) {
        const cue = encoder.encode(board, candidate.move, panel.task);
        if (cue.stimulation.length !== protocol.cue.config.maxCells
          || cue.accounting.totalCurrent !== protocol.cue.config.totalCurrent) throw Error(`Dose mismatch ${panel.id}/${candidate.move}`);
        const selected = new Set(cue.stimulation.map(row => row.index));
        const sorted = [...selected].sort((a, b) => a - b);
        patterns.add(sorted.join(',')); candidateCells.push(selected); cueCount++;
        for (const assignment of cue.assignments) {
          if (!selected.has(assignment.index)) continue;
          const labels = cellsByLabel.get(assignment.index) ?? new Set();
          labels.add(candidate.proof.status); cellsByLabel.set(assignment.index, labels);
        }
      }
      if (JSON.stringify([...candidateCells[0]].sort((a, b) => a - b))
        === JSON.stringify([...candidateCells[1]].sort((a, b) => a - b))) exactCandidatePairs++;
      for (const index of candidateCells[0]) if (candidateCells[1].has(index)) sharedCells++;
    }
    results.push({ seed, cueIdentity: encoder.identity, candidateCues: cueCount,
      uniqueStimulationPatterns: patterns.size, exactSamePatternPanels: exactCandidatePairs,
      meanWithinPanelSharedCells: Number((sharedCells / panels.length).toFixed(4)),
      cellsUsedPerCue: protocol.cue.config.maxCells, mixedOutcomeCellsAcrossSplit:
        [...cellsByLabel.values()].filter(labels => labels.has('success') && labels.has('failure')).length });
  }
  splits[split] = { path, sha256: sha(raw), panels: panels.length,
    candidateOutcomes: panels.flatMap(panel => panel.candidates.map(candidate => candidate.proof.status))
      .reduce((counts, status) => ({ ...counts, [status]: (counts[status] ?? 0) + 1 }), {}), projections: results };
}

const output = { schema: 'capture-retention-projection-seed-audit-v1',
  scope: 'Static cue projection comparison on training and validation only. The final split is deliberately not opened. No graph inference, neural activity, plasticity, or outcome-based seed selection.',
  protocolSha256: sha(protocolBytes), mappingSha256: sha(bytes(protocol.mappingPath)),
  auditScriptSha256: sha(bytes('.codebase/scripts/puzzle-learning/audit-capture-retention-projection-seeds.mjs')),
  encoderSourceSha256: sha(bytes('.codebase/src/chess-input/relational-chess-cue-v3.mjs')),
  projectionSeeds: seeds, cueDose: protocol.cue.config, splits,
  interpretation: 'Changing the cue projection seed changes the deterministic KC assignment and may create distinct input projections. These are not independent neural initializations or evidence of learning. Overlap/collision counts are static input diagnostics; do not select the lowest-overlap seed from this report. Any future assay must declare projection seeds as a factor, use fresh final families, and test learned rankings against matched controls.' };
mkdirSync(dirname(resolve(root, outPath)), { recursive: true });
const tmp = `${resolve(root, outPath)}.partial`;
writeFileSync(tmp, `${JSON.stringify(output, null, 2)}\n`);
renameSync(tmp, resolve(root, outPath));
console.log(JSON.stringify({ passed: true, outPath, reportSha256: sha(bytes(outPath)), finalRead: false,
  seeds: seeds.length, splits: Object.fromEntries(Object.entries(splits).map(([name, value]) => [name, value.panels])) }));
