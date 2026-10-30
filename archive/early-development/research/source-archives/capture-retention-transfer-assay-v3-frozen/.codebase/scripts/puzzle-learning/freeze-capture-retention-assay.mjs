import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { graphHash } from '../runtime/fetch-graph.mjs';

const dataDir = 'research/data/capture-retention-transfer-assay-v3';
const archiveDir = 'research/source-archives/capture-retention-transfer-assay-v3-frozen';
const protocolPath = join(dataDir, 'protocol.json');
assert.ok(!existsSync(dataDir) && !existsSync(archiveDir), 'Frozen protocol or source archive already exists');
const bytes = path => readFileSync(path);
const sha = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(bytes(path));
const sourcePaths = [
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/scripts/puzzle-learning/train-capture-retention-assay.mjs',
  '.codebase/scripts/puzzle-learning/audit-capture-retention-assay.mjs',
  '.codebase/scripts/puzzle-learning/analyze-capture-retention-assay.mjs',
  '.codebase/scripts/puzzle-learning/freeze-capture-retention-assay.mjs',
  '.codebase/scripts/search-and-feedback/audit-capture-retention-dataset.mjs',
  '.codebase/scripts/search-and-feedback/audit-capture-retention-role-ablation.mjs',
  '.codebase/scripts/search-and-feedback/audit-capture-retention-nearest-cue.mjs',
  '.codebase/src/runtime/graph.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/dual-valence-interface.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v3.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'
];
const inputPaths = [
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  'package.json', 'package-lock.json', 'node_modules/chess.js/package.json',
  'research/data/capture-retention-transfer-v2/protocol.json',
  'research/data/capture-retention-transfer-v2/train.jsonl',
  'research/data/capture-retention-transfer-v2/validation.jsonl',
  'research/data/capture-retention-transfer-v2/final.jsonl',
  'research/reports/reversal-candidate-2026-10-05/mapping.json',
  'research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit-v2.json',
  'research/reports/capture-retention-role-ablation-preflight-2026-10-07/report-v2.json',
  'research/reports/capture-retention-nearest-cue-baseline-2026-10-07/report.json',
  'research/data/multi-context-stability-v1/protocol.json'
];
for (const path of [...sourcePaths, ...inputPaths]) assert.ok(existsSync(path), `Missing frozen input: ${path}`);
const data = read('research/data/capture-retention-transfer-v2/protocol.json');
const datasetAuditPath = 'research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit-v2.json';
const roleAuditPath = 'research/reports/capture-retention-role-ablation-preflight-2026-10-07/report-v2.json';
const nearestAuditPath = 'research/reports/capture-retention-nearest-cue-baseline-2026-10-07/report.json';
const datasetAudit = read(datasetAuditPath), roleAudit = read(roleAuditPath), nearestAudit = read(nearestAuditPath);
assert.equal(datasetAudit.schema, 'capture-retention-dataset-audit-v1');
assert.equal(datasetAudit.protocolSha256, sha(bytes('research/data/capture-retention-transfer-v2/protocol.json')));
assert.equal(roleAudit.result.candidateCues, 16); assert.equal(roleAudit.result.changedStimulatedSets, 16);
assert.equal(nearestAudit.result.pairChoiceAccuracy, 0.5);
const stability = read('research/data/multi-context-stability-v1/protocol.json');
const chessPackagePath = 'node_modules/chess.js/package.json';
const chessPackage = read(chessPackagePath);
const resolvedChess = fileURLToPath(import.meta.resolve('chess.js')).replaceAll('\\', '/');
assert.equal(chessPackage.version, data.dependencies['chess.js']);
assert.equal(datasetAudit.resolvedDependency.entrypointSha256, sha(bytes(resolvedChess)));
assert.equal(datasetAudit.resolvedDependency.packageJsonSha256, sha(bytes(chessPackagePath)));
assert.equal(datasetAudit.resolvedDependency.version, chessPackage.version);

const trainPath = 'research/data/capture-retention-transfer-v2/train.jsonl';
const readJsonl = path => bytes(path).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
const train = readJsonl(trainPath);
const trueChannels = train.flatMap(panel => panel.candidates.map(candidate => candidate.proof.status === 'success'));
assert.equal(trueChannels.filter(Boolean).length, 8); assert.equal(trueChannels.length, 16);
const shuffledChannels = shuffledFeedback(trueChannels, 20261007).map(value => value ? 'PAM02' : 'PPL103');
assert.equal(shuffledChannels.filter(channel => channel === 'PAM02').length, 8);
assert.ok(shuffledChannels.some((channel, i) => channel !== (trueChannels[i] ? 'PAM02' : 'PPL103')));

const inputHashes = Object.fromEntries(inputPaths.map(path => [path, sha(bytes(path))]));
const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path, sha(bytes(path))]));
const mappingPath = data.cue.mappingPath, mappingFile = read(mappingPath), mapping = mappingFile.mapping;
const protocol = {
  schema: 'capture-retention-transfer-assay-v3', date: '2026-10-07',
  purpose: 'One-pass from-scratch neural memory-to-choice test on disjoint capture-retention positions; a prerequisite, not Monte Carlo reasoning evidence.',
  task: data.task,
  graphPath: '.cache/full.npz', graphSha256: sha(bytes('.cache/full.npz')),
  annotationPath: '.cache/flywire-annotations-v2.1.0.tsv', annotationSha256: sha(bytes('.cache/flywire-annotations-v2.1.0.tsv')),
  mappingPath, mappingHash: digest(mapping), cue: { identity: data.cue.identity, config: data.cue.config },
  families: {
    train: 'research/data/capture-retention-transfer-v2/train.jsonl',
    validation: 'research/data/capture-retention-transfer-v2/validation.jsonl',
    final: 'research/data/capture-retention-transfer-v2/final.jsonl'
  },
  seeds: [47, 53, 59, 61, 67], conditions: ['informative', 'no-channel', 'shuffled', 'disabled'],
  shuffledChannels,
  model: { ...stability.shared.model, seed: 47 }, memory: stability.shared.memory,
  readouts: stability.shared.readouts,
  current: 1.5, priorScale: 4, maxPresentations: 256,
  analysis: { script: '.codebase/scripts/puzzle-learning/analyze-capture-retention-assay.mjs',
    bootstrapReplicates: 10_000, bootstrapSeed: 20261008, seedsWithReplacement: 5,
    finalPanelsWithReplacement: 8, oneSidedPercentile: 0.05 },
  runtime: { nodeVersion: process.version, heapMiB: 256, cpuDuty: 0.5,
    chessJs: chessPackage.version, chessEntrypoint: resolvedChess,
    chessEntrypointSha256: sha(bytes(resolvedChess)), chessPackageJsonSha256: sha(bytes(chessPackagePath)) },
  requiredAudits: [
    { report: datasetAuditPath, reportSha256: sha(bytes(datasetAuditPath)), expected: {
      schema: 'capture-retention-dataset-audit-v1', 'fullSet.distinctPositions': 20,
      'fullSet.distinctCuePatterns': 40, 'fullSet.conflictingCueLabels': 0,
      'splits.train.candidateExperiences': 16, 'splits.validation.candidateExperiences': 8,
      'splits.final.candidateExperiences': 16
    } },
    { report: roleAuditPath, reportSha256: sha(bytes(roleAuditPath)), expected: {
      schema: 'capture-retention-role-ablation-preflight-v1', 'result.candidateCues': 16,
      'result.duplicateTokenCues': 0, 'result.stimulatedCellCountRange': [14, 14],
      'result.totalCurrentPerCue': 21, 'result.changedStimulatedSets': 16
    } },
    { report: nearestAuditPath, reportSha256: sha(bytes(nearestAuditPath)), expected: {
      schema: 'capture-retention-nearest-cue-baseline-v1', 'result.pairChoiceAccuracy': 0.5,
      'result.counterfactualPairCorrect': false
    } }
  ],
  inputHashes, sourceHashes,
  outcomeContract: { unknownMeansNoEvent: true, teacherProvidesVerifiedConsequencesOnly: true,
    permittedPersistentState: 'ReversalMemory gains only', fixedReadout: 'mean(MBON12)-mean(MBON01)',
    noMonteCarlo: true, noTransferClaimUnlessEveryFrozenGatePasses: true }
};
assert.equal(graphHash, protocol.graphSha256); assert.equal(annotationHash, protocol.annotationSha256);

mkdirSync(dataDir, { recursive: true });
writeFileSync(protocolPath, JSON.stringify(protocol, null, 2) + '\n', { flag: 'wx' });
mkdirSync(archiveDir, { recursive: true });
for (const path of sourcePaths) {
  const target = join(archiveDir, path); mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target, 1);
}
for (const path of inputPaths) {
  const target = join(archiveDir, 'inputs', path.replaceAll(':', '_')); mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target, 1);
}
const protocolSha256 = sha(bytes(protocolPath));
writeFileSync(join(archiveDir, 'protocol.json'), bytes(protocolPath), { flag: 'wx' });
writeFileSync(join(archiveDir, 'manifest.json'), JSON.stringify({ schema: 'capture-retention-assay-source-manifest-v3',
  protocolSha256, sourceHashes, inputHashes, graphSha256: protocol.graphSha256,
  annotationSha256: protocol.annotationSha256 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ frozen: true, protocolPath, protocolSha256,
  sourceCount: Object.keys(sourceHashes).length, inputCount: Object.keys(inputHashes).length,
  seeds: protocol.seeds, conditions: protocol.conditions, shuffledChannels }));
