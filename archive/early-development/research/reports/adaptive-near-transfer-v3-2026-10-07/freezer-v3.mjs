import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const sha = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const acquisitionDir = 'research/reports/adaptive-contrastive-coverage-v1-2026-10-07';
const variationDir = 'research/reports/smothered-training-variations-v1-2026-10-07';
const sources = [
  '.codebase/scripts/puzzle-learning/freeze-adaptive-near-transfer.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/src/runtime/graph.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/chess-input/compartment-chess-cue.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs',
  '.codebase/scripts/puzzle-learning/evaluate-adaptive-near-transfer.mjs',
  '.codebase/scripts/puzzle-learning/audit-adaptive-near-transfer.mjs',
];
const inputs = [
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  'package.json', 'package-lock.json',
  'node_modules/chess.js/package.json', 'node_modules/chess.js/dist/cjs/chess.js',
  'research/reports/reversal-candidate-2026-10-05/mapping.json',
  `${acquisitionDir}/report.json`, `${acquisitionDir}/audit.json`, `${acquisitionDir}/COMPLETE`,
  ...['informative', 'absent', 'shuffled', 'disabled'].map(c => `${acquisitionDir}/condition-${c}.json`),
  `${variationDir}/plan.json`, `${variationDir}/report.json`, `${variationDir}/audit.json`,
  `${variationDir}/puzzles.jsonl`, `${variationDir}/certificates.jsonl`,
];
const acq = read(`${acquisitionDir}/report.json`), audit = read(`${acquisitionDir}/audit.json`), complete = read(`${acquisitionDir}/COMPLETE`);
if (!acq.complete || !audit.passed || !complete.auditPassed || complete.reportSha256 !== sha(`${acquisitionDir}/report.json`)
    || complete.auditSha256 !== sha(`${acquisitionDir}/audit.json`)) throw Error('Acquisition prerequisite is not complete and audited');
const varReport = read(`${variationDir}/report.json`), varAudit = read(`${variationDir}/audit.json`), varPlan = read(`${variationDir}/plan.json`);
if (!varAudit.passed || varAudit.reportSha256 !== sha(`${variationDir}/report.json`)) throw Error('Variation prerequisite audit mismatch');
const accepted = new Set(varReport.results.filter(result => result.accepted).map(result => result.row.id));
const positions = varPlan.candidates.filter(p => p.finalTestEligible === false && accepted.has(p.id));
if (positions.length !== 5) throw Error(`Expected five accepted training-only positions, got ${positions.length}`);
const original = read('research/data/adaptive-contrastive-coverage-v1/protocol.json');
const protocol = {
  schema: 'adaptive-near-transfer-v3',
  purpose: 'No-feedback all-legal assessment of the one-fixture learned memory on five unseen related development positions, compared with saved matched-control memories.',
  scope: 'Same-motif developmental near-generalization only; positions are not independent families, final-test eligible, or evidence of transferable reasoning.',
  output: 'research/reports/adaptive-near-transfer-v3-2026-10-07',
  inputs: Object.fromEntries(inputs.map(path => [path, sha(path)])),
  sources: Object.fromEntries(sources.map(path => [path, sha(path)])),
  prerequisites: {
    acquisition: { reportSha256: complete.reportSha256, auditSha256: complete.auditSha256,
      protocolSha256: acq.identity.protocolSha256, acquiredMemoryIdentity: acq.state.memory.identity },
    variations: { reportSha256: sha(`${variationDir}/report.json`), auditSha256: sha(`${variationDir}/audit.json`),
      certificateCount: varAudit.certificates },
  },
  runtime: { nodeVersion: process.version, heapMiB: 256, cpuDuty: 0.5, rssMiB: 768, freeMemoryMiB: 256,
    chessJs: read('node_modules/chess.js/package.json').version, chessEntrypoint: 'node_modules/chess.js/dist/cjs/chess.js' },
  model: original.shared.model, memory: original.shared.memory, mappingPath: original.mappingPath,
  mappingHash: original.shared.mappingHash, fixedStateHash: original.shared.invariant,
  readouts: original.shared.readouts, encoder: original.encoder, variant: original.variant,
  current: original.current, priorScale: original.priorScale,
  conditions: Object.fromEntries(['informative', 'absent', 'shuffled', 'disabled'].map(c => [c, `${acquisitionDir}/condition-${c}.json`])),
  positions: positions.map(({ id, fen, objective, plies, finalTestEligible }) => ({ id, fen, objective, plies, finalTestEligible })),
  certificatePath: `${variationDir}/certificates.jsonl`, maxLegalMoves: 64,
  verification: { maxNodes: 100000, milliseconds: 60000 },
  requirements: { allLegalPanels: true, memoryUnchanged: true, feedbackDisabled: true,
    certificatesRechecked: true, independentAuditRequired: true, atomicPanelAndStatePublication: true },
};
const path = 'research/data/adaptive-near-transfer-v3/protocol.json';
mkdirSync(resolve(root, 'research/data/adaptive-near-transfer-v3'), { recursive: true });
writeFileSync(resolve(root, path), `${JSON.stringify(protocol, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ protocol: path, sha256: sha(path), positions: protocol.positions.map(p => p.id), sources: sources.length, inputs: inputs.length }, null, 2));
