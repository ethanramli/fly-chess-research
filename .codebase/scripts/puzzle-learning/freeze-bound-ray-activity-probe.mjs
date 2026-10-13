import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { graphHash } from '../runtime/fetch-graph.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';

const protocolPath = 'research/data/bound-ray-activity-probe-v1/protocol.json';
const archivePath = 'research/source-archives/bound-ray-activity-probe-v1';
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const require = createRequire(import.meta.url);
assert.equal(graphHash, '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2');

const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mapping = read(mappingPath).mapping;
assert.equal(digest(mapping), 'b2d7bf351dbe9889aa6a17216cca6cb7671f4f99d9661e604609a7ff51686fff');
const chessPackagePath = require.resolve('chess.js/package.json');
const chessPackage = read(chessPackagePath);
const chessEntryPath = require.resolve('chess.js');
const pinnedPaths = [
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv', mappingPath,
  'research/data/capture-retention-transfer-v2/protocol.json',
  'research/data/capture-retention-transfer-v2/train.jsonl',
  'research/data/capture-retention-transfer-v2/validation.jsonl',
  'package.json', 'package-lock.json', chessPackagePath, chessEntryPath,
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/scripts/puzzle-learning/freeze-bound-ray-activity-probe.mjs',
  '.codebase/scripts/puzzle-learning/probe-bound-ray-activity.mjs',
  '.codebase/scripts/puzzle-learning/audit-bound-ray-activity-probe.mjs',
  '.codebase/src/runtime/graph.mjs', '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v3.mjs',
  '.codebase/src/chess-input/bound-ray-relational-cue.mjs',
];
const inputPaths = pinnedPaths.filter(path => !path.includes('/scripts/') && !path.includes('/src/'));
const sourcePaths = pinnedPaths.filter(path => path.includes('/scripts/') || path.includes('/src/'));
const inputHashes = Object.fromEntries(inputPaths.map(path => [path, hash(path)]));
const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path, hash(path)]));
const packageLock = read('package-lock.json');
const chessLock = packageLock.packages?.['node_modules/chess.js'];
assert.equal(chessPackage.version, '1.4.0');
assert.equal(chessLock?.version, chessPackage.version);
assert.ok(chessLock?.integrity);

const protocol = {
  schema: 'bound-ray-readonly-activity-probe-v1',
  frozenAt: '2026-10-07',
  scope: 'Read-only scratch-memory comparison of the existing relational v3 cue and the bound-ray cue on training and validation only. No feedback, plastic update, training, checkpoint selection, search, or access to final-family files.',
  graphPath: '.cache/full.npz', graphSha256: hash('.cache/full.npz'),
  graphHashFromFetchSource: graphHash,
  annotationPath: '.cache/flywire-annotations-v2.1.0.tsv', annotationSha256: hash('.cache/flywire-annotations-v2.1.0.tsv'),
  mappingPath, mappingSha256: hash(mappingPath), mappingHash: digest(mapping),
  data: {
    trainPath: 'research/data/capture-retention-transfer-v2/train.jsonl',
    validationPath: 'research/data/capture-retention-transfer-v2/validation.jsonl',
    trainPanels: 8, validationPanels: 4, candidatesPerPanel: 2,
    splits: ['train', 'validation'],
  },
  model: { steps: 8, inputDim: 1, outputs: 1, seed: 47, precision: 'float32',
    saturation: 10, recurrentScale: 0.9, normalization: 'row' },
  task: { objective: 'capture-retention', plies: 1 },
  readouts: {
    MBON12: [
      { index: 56337, rootId: '720575940623001480' },
      { index: 49989, rootId: '720575940621828443' },
      { index: 61287, rootId: '720575940623905719' },
      { index: 93832, rootId: '720575940630075703' },
    ],
    MBON01: [
      { index: 62498, rootId: '720575940624117245' },
      { index: 128004, rootId: '720575940643309197' },
    ],
  },
  cueConfigs: {
    relationalV3: { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5 },
    boundRay: { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5,
      maxRelationCells: 4, maxHistoryPlies: 512 },
  },
  cueIdentityV3: createRelationalChessCueEncoder(mapping,
    { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5 }).identity,
  cueIdentityBoundRay: createBoundRayRelationalCueEncoder(mapping,
    { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5,
      maxRelationCells: 4, maxHistoryPlies: 512 }).identity,
  memory: { eta: 0.5, minGain: 0.2, maxGain: 1.8, activityScale: 1.5 },
  method: {
    pairsPerSplit: { train: 8, validation: 4 },
    comparisons: ['relational-v3', 'bound-ray'],
    modelAndMemory: 'one common from-scratch graph initialization, fixed parameters, scratch efficacy gains all one',
    outcomes: 'read only after cue encoding and neural presentations; used only for post-hoc margin summaries',
    noFinalFilesRead: true, noPlasticity: true, noSearch: true,
  },
  runtime: { nodeMajor: Number(process.versions.node.split('.')[0]), heapMiB: 256,
    dutyPolicy: 'CPU work followed by equal-duration sleep; pacing, not an OS CPU cap',
    maxRssBytes: 768 * 2 ** 20, minFreeBytes: 256 * 2 ** 20 },
  inputHashes, sourceHashes,
  dependency: { name: 'chess.js', version: chessPackage.version,
    packagePath: chessPackagePath, packageSha256: hash(chessPackagePath),
    resolvedEntryPath: chessEntryPath, resolvedEntrySha256: hash(chessEntryPath),
    lockResolved: chessLock.resolved, lockIntegrity: chessLock.integrity },
  reportPath: 'research/reports/bound-ray-activity-probe-v1-2026-10-07/report.json',
};
assert.ok(protocol.runtime.nodeMajor >= 22);
for (const path of [...inputPaths, ...sourcePaths]) assert.ok(hash(path));
mkdirSync(dirname(protocolPath), { recursive: true });
writeFileSync(protocolPath, `${JSON.stringify(protocol, null, 2)}\n`, { flag: 'wx' });
mkdirSync(archivePath, { recursive: false });
copyFileSync(protocolPath, join(archivePath, 'protocol.json'));
assert.equal(hash(join(archivePath, 'protocol.json')), hash(protocolPath));
for (const path of [...inputPaths, ...sourcePaths]) {
  const target = join(archivePath, path.replaceAll('/', '__').replaceAll('\\', '__'));
  copyFileSync(path, target);
  assert.equal(hash(target), hash(path), `Source archive copy mismatch: ${path}`);
}
const manifest = { schema: 'bound-ray-activity-probe-source-archive-v1', protocolPath,
  protocolSha256: hash(protocolPath), archivedFiles: Object.fromEntries([
    ['protocol.json', hash(join(archivePath, 'protocol.json'))],
    ...[...inputPaths, ...sourcePaths].map(path => [path,
      hash(join(archivePath, path.replaceAll('/', '__').replaceAll('\\', '__')))]),
  ]) };
writeFileSync(join(archivePath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ protocolPath, protocolSha256: hash(protocolPath),
  archivedSources: Object.keys(manifest.archivedFiles).length, trainPanels: 8, validationPanels: 4,
  finalFamilyFilesRead: false }));
