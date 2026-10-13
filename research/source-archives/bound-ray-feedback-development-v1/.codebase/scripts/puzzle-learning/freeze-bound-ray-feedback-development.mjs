import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';

const out = 'research/data/bound-ray-feedback-development-v1';
const archive = 'research/source-archives/bound-ray-feedback-development-v1';
assert.ok(!existsSync(out) && !existsSync(archive), 'Never overwrite frozen artifacts');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const probePath = 'research/data/bound-ray-activity-probe-v1/protocol.json';
assert.equal(await sha256(probePath), '336f2f0759c4014fef053cb700bdb5ac0e533d8d1dfb21dabde89b35b4d4f399');
const prior = read(probePath);
const auditPath = 'research/reports/bound-ray-activity-probe-v1-2026-10-07/audit.json';
const audit = read(auditPath);
assert.equal(audit.reportSha256, await sha256(audit.reportPath));
assert.equal(audit.exactGraphReadoutReplays, true); assert.equal(audit.zeroPlasticUpdates, true);
const auditComplete = 'research/reports/bound-ray-activity-probe-v1-2026-10-07/audit.json.COMPLETE';
assert.equal(read(auditComplete).auditSha256, await sha256(auditPath));
const train = readFileSync(prior.data.trainPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const validation = readFileSync(prior.data.validationPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
for (const panel of [...train, ...validation]) {
  const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
  for (const candidate of panel.candidates)
    assert.equal(checkCaptureRetentionCertificate(board, candidate.move, candidate.proof).verified, true);
}
const events = train.flatMap(panel => panel.candidates);
const channels = shuffledFeedback(events.map(row => row.proof.status === 'failure'), 20261008)
  .map((adverse, index) => ({ index, channel: adverse ? 'PPL103' : 'PAM02' }));
assert.ok(channels.some((row, i) => row.channel !== (events[i].proof.status === 'failure' ? 'PPL103' : 'PAM02')));
const sources = new Set();
function visit(path) {
  path = relative(process.cwd(), resolve(path)).replaceAll('\\', '/');
  if (sources.has(path)) return;
  assert.ok(path.startsWith('.codebase/'), 'Dependency must stay in codebase'); sources.add(path);
  const body = readFileSync(path, 'utf8');
  for (const match of body.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]|\bimport\s*['"](\.[^'"]+)['"]/g))
    visit(resolve(dirname(path), match[1] ?? match[2]));
}
for (const path of ['freeze', 'train', 'audit'].map(name =>
  `.codebase/scripts/puzzle-learning/${name}-bound-ray-feedback-development.mjs`)) visit(path);
const sourceHashes = Object.fromEntries(await Promise.all([...sources].sort().map(async path => [path, await sha256(path)])));
const require = createRequire(import.meta.url);
const dependencies = [require.resolve('chess.js/package.json'), require.resolve('chess.js')];
const inputs = [...new Set([...Object.keys(prior.inputHashes), probePath, auditPath, audit.reportPath,
  auditComplete, 'research/reports/bound-ray-activity-probe-v1-2026-10-07/report.json.COMPLETE',
  'research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit.json', ...dependencies])];
for (const [path, expected] of Object.entries(prior.inputHashes)) assert.equal(await sha256(path), expected);
const inputHashes = Object.fromEntries(await Promise.all(inputs.map(async path => [path, await sha256(path)])));
const p = {
  schema: 'bound-ray-feedback-development-protocol-v1', frozenAt: new Date().toISOString(),
  scope: 'One fixed candidate-experience pass with verified feedback and matched controls; development data only. Narrow one-reply recapturability, not strategic choice or reasoning.',
  graphPath: prior.graphPath, graphSha256: prior.graphSha256,
  annotationPath: prior.annotationPath, annotationSha256: prior.annotationSha256,
  mappingPath: prior.mappingPath, mappingHash: prior.mappingHash,
  data: prior.data, model: prior.model, memory: prior.memory, task: prior.task, readouts: prior.readouts,
  encoders: [
    { id: 'relational-v3', identity: prior.cueIdentityV3, config: prior.cueConfigs.relationalV3 },
    { id: 'bound-ray', identity: prior.cueIdentityBoundRay, config: prior.cueConfigs.boundRay },
  ], conditions: ['informative', 'no-channel', 'shuffled', 'disabled'], shuffledChannels: channels,
  current: 1.5, priorScale: 4, maxPresentations: 128,
  schedule: 'Frozen training panel/candidate order; both certified alternatives get one teaching experience. Fresh candidate-subset ranking before every event. Controls replay identical experiences and assessment counts.',
  gates: { acquisition: 'Informative final training correctness improves over scratch and each matched control, with reset/restoration and exact audit. Candidate-subset evidence only.',
    validation: 'Report all four development panels and their individual margins; no checkpoint selection or final-family access.',
    reasoning: 'Not evaluated by this protocol; original all-legal, search and disjoint/counterfactual gates remain required.' },
  runtime: { nodeVersion: process.version, heapMiB: 256, cpuDuty: 0.5,
    maxRssBytes: 768 * 1024 ** 2, minFreeBytes: 256 * 1024 ** 2 },
  requiredAudits: [{ report: auditPath, reportSha256: await sha256(auditPath),
    expected: { exactGraphReadoutReplays: true, zeroPlasticUpdates: true, finalFamilyFilesRead: false } },
    { report: 'research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit.json',
      reportSha256: inputHashes['research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit.json'],
      expected: { protocolSha256: prior.inputHashes['research/data/capture-retention-transfer-v2/protocol.json'],
        'fullSet.conflictingCueLabels': 0, 'splits.train.panels': 8, 'splits.validation.panels': 4 } }],
  inputHashes, sourceHashes, dependency: prior.dependency,
};
mkdirSync(out, { recursive: true }); mkdirSync(archive, { recursive: true });
const protocolPath = join(out, 'protocol.json');
writeFileSync(`${protocolPath}.partial`, JSON.stringify(p, null, 2) + '\n', { flag: 'wx' });
renameSync(`${protocolPath}.partial`, protocolPath);
const files = [];
for (const [path, hash] of Object.entries({ ...sourceHashes, ...inputHashes, [protocolPath]: await sha256(protocolPath) })) {
  if (path === prior.graphPath || path === prior.annotationPath) continue;
  const target = path.startsWith(process.cwd()) ? join(archive, 'dependencies', relative(process.cwd(), path)) : join(archive, path);
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(path, target);
  assert.equal(await sha256(target), hash); files.push({ path, archivedPath: target, sha256: hash });
}
const manifest = { protocolPath, protocolSha256: await sha256(protocolPath), files,
  graphAndAnnotations: 'Pinned by hash, not duplicated in this source archive' };
writeFileSync(join(archive, 'manifest.json.partial'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
renameSync(join(archive, 'manifest.json.partial'), join(archive, 'manifest.json'));
console.log(JSON.stringify({ frozen: true, protocolPath, protocolSha256: manifest.protocolSha256,
  sourceCount: sources.size, archivedFiles: files.length, checkedTrainingAndValidationCertificates: 24 }));
