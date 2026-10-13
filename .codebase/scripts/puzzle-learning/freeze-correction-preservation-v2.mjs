import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';

const out = 'research/data/correction-preservation-v2';
const archive = 'research/source-archives/correction-preservation-v2';
assert.ok(!existsSync(out) && !existsSync(archive), 'Never overwrite frozen artifacts');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const baseProtocolPath = 'research/data/bound-ray-feedback-development-v1/protocol.json';
const baseProtocol = read(baseProtocolPath);
const baseArchive = read('research/source-archives/bound-ray-feedback-development-v1/manifest.json');
assert.equal(await sha256(baseProtocolPath), baseArchive.protocolSha256, 'Base frozen protocol changed');
for (const [path, expected] of Object.entries({ ...baseProtocol.inputHashes, ...baseProtocol.sourceHashes }))
  assert.equal(await sha256(path), expected, `Base identity changed: ${path}`);
const schedulePath = 'research/data/correction-preservation-schedules-v2/schedules.json';
const scheduleManifestPath = 'research/data/correction-preservation-schedules-v2/manifest.json';
const scheduleManifest = read(scheduleManifestPath);
assert.equal(scheduleManifest.schedulesPath.replaceAll('\\', '/'), schedulePath);
assert.equal(await sha256(schedulePath), scheduleManifest.schedulesSha256, 'Prepared schedule changed');
assert.equal(await sha256(scheduleManifest.preparationScript), scheduleManifest.preparationScriptSha256);
const scheduleSource = read(schedulePath);
const train = readFileSync(baseProtocol.data.trainPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const panels = new Map(train.map(panel => [panel.id, panel]));
const task = baseProtocol.task;
const schedules = {};
for (const id of ['selected', 'uniform']) {
  const source = scheduleSource[id];
  assert.equal(source.events.length, 4, `${id} event count`);
  const events = source.events.map((event, index) => {
    assert.equal(event.index, index);
    const panel = panels.get(event.panelId);
    assert.ok(panel, `Unknown training panel ${event.panelId}`);
    const candidate = panel.candidates.find(row => row.move === event.move);
    assert.ok(candidate, `Unknown candidate ${event.panelId}/${event.move}`);
    assert.equal(candidate.proof.status, event.status);
    assert.equal(event.experience.certificateSha256, candidate.proof.certificateSha256);
    assert.deepEqual(event.experience.context, { fen: panel.fen, pgn: panel.pgn, task });
    assert.deepEqual(event.experience.proof, candidate.proof);
    const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
    const checked = checkCaptureRetentionCertificate(board, candidate.move, candidate.proof);
    assert.equal(checked.verified, true); assert.equal(checked.status, event.status);
    assert.equal(checked.certificateSha256, candidate.proof.certificateSha256);
    return { index, panelId: event.panelId, move: event.move, role: event.role,
      status: event.status, certificateSha256: checked.certificateSha256 };
  });
  const counts = new Map();
  for (const event of events) {
    if (!counts.has(event.move)) counts.set(event.move, []);
    counts.get(event.move).push(event);
  }
  const shuffledChannels = events.map(event => {
    const pair = counts.get(event.move);
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0].status, pair[1].status);
    const opposite = pair.find(other => other.index !== event.index);
    return { index: event.index, channel: opposite.status === 'success' ? 'PAM02' : 'PPL103' };
  });
  assert.equal(shuffledChannels.filter(row => row.channel === 'PAM02').length, 2);
  assert.equal(shuffledChannels.filter(row => row.channel === 'PPL103').length, 2);
  assert.ok(shuffledChannels.some((row, index) => row.channel !== (events[index].status === 'success' ? 'PAM02' : 'PPL103')));
  schedules[id] = { events, shuffledChannels };
}
assert.deepEqual(schedules.selected.events.map(({ move, status }) => [move, status]),
  schedules.uniform.events.map(({ move, status }) => [move, status]));

const sourcePaths = new Set();
function visit(path) {
  path = relative(process.cwd(), resolve(path)).replaceAll('\\', '/');
  if (sourcePaths.has(path)) return;
  assert.ok(path.startsWith('.codebase/'), `Dependency outside codebase: ${path}`);
  sourcePaths.add(path);
  const body = readFileSync(path, 'utf8');
  for (const match of body.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]|\bimport\s*['"](\.[^'"]+)['"]/g))
    visit(resolve(dirname(path), match[1] ?? match[2]));
}
for (const path of [
  '.codebase/scripts/puzzle-learning/freeze-correction-preservation-v2.mjs',
  '.codebase/scripts/puzzle-learning/train-correction-preservation-v2.mjs',
  '.codebase/scripts/puzzle-learning/audit-correction-preservation-v2.mjs',
  '.codebase/scripts/diagnostics/prepare-correction-preservation-v2-recovery.mjs',
  '.codebase/scripts/diagnostics/audit-correction-preservation-v2-recovery.mjs',
]) visit(path);
const sourceHashes = Object.fromEntries(await Promise.all([...sourcePaths].sort()
  .map(async path => [path, await sha256(path)])));
const require = createRequire(import.meta.url);
const dependencyPaths = [require.resolve('chess.js/package.json'), require.resolve('chess.js')];
const inputPaths = [...new Set([
  ...Object.keys(baseProtocol.inputHashes), baseProtocolPath,
  'research/source-archives/bound-ray-feedback-development-v1/manifest.json',
  schedulePath, scheduleManifestPath, scheduleManifest.preparationScript, ...dependencyPaths,
])];
const inputHashes = Object.fromEntries(await Promise.all(inputPaths.map(async path => [path, await sha256(path)])));
const encoder = baseProtocol.encoders.find(row => row.id === 'bound-ray');
assert.ok(encoder);
const protocol = {
  schema: 'correction-preservation-v2-frozen-protocol-v1', frozenAt: new Date().toISOString(),
  scope: 'One-seed, one-ply candidate-pair mechanism screen. No delayed biological retention, all-legal usefulness, unfamiliar transfer, or reasoning claim.',
  graphPath: baseProtocol.graphPath, graphSha256: baseProtocol.graphSha256,
  annotationPath: baseProtocol.annotationPath, annotationSha256: baseProtocol.annotationSha256,
  mappingPath: baseProtocol.mappingPath, mappingHash: baseProtocol.mappingHash,
  data: baseProtocol.data, model: baseProtocol.model, memory: baseProtocol.memory,
  task, readouts: baseProtocol.readouts, encoders: [encoder], schedules,
  scheduleSource: { path: schedulePath, sha256: scheduleManifest.schedulesSha256,
    manifestPath: scheduleManifestPath, manifestSha256: inputHashes[scheduleManifestPath] },
  conditions: ['informative', 'no-channel', 'shuffled', 'disabled'],
  current: baseProtocol.current, priorScale: baseProtocol.priorScale,
  maxPresentations: baseProtocol.maxPresentations,
  gates: {
    selected: 'Report tr-06 correction, tr-03 preservation and all 12 candidate-pair panels per condition; no required-panel regressions.',
    controls: 'Compare informative only with matched no-channel, within-move shuffled and disabled-plasticity arms.',
    policy: 'Selected versus score-blind schedule is descriptive only; one schedule per policy cannot establish policy superiority.',
    interpretation: 'Candidate-pair and one-ply only. No delayed biological retention, all-legal choice, final-family access, or transferable reasoning claim.',
  },
  runtime: baseProtocol.runtime, requiredAudits: baseProtocol.requiredAudits,
  baseProtocol: { path: baseProtocolPath, sha256: inputHashes[baseProtocolPath] },
  inputHashes, sourceHashes,
  dependency: baseProtocol.dependency,
};
assert.ok(!JSON.stringify(protocol).includes('final.jsonl'));
mkdirSync(out, { recursive: true }); mkdirSync(archive, { recursive: true });
const protocolPath = join(out, 'protocol.json');
writeFileSync(`${protocolPath}.partial`, JSON.stringify(protocol, null, 2) + '\n', { flag: 'wx' });
renameSync(`${protocolPath}.partial`, protocolPath);
const files = [];
for (const [path, hash] of Object.entries({ ...sourceHashes, ...inputHashes, [protocolPath]: await sha256(protocolPath) })) {
  if (path === baseProtocol.graphPath || path === baseProtocol.annotationPath) continue;
  const target = path.startsWith(process.cwd())
    ? join(archive, 'dependencies', relative(process.cwd(), path)) : join(archive, path);
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(path, target);
  assert.equal(await sha256(target), hash, `Archive hash mismatch: ${path}`);
  files.push({ path, archivedPath: target, sha256: hash });
}
const manifest = { protocolPath, protocolSha256: await sha256(protocolPath), files,
  graphAndAnnotations: 'Pinned by protocol hash; not duplicated in this source archive' };
writeFileSync(join(archive, 'manifest.json.partial'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
renameSync(join(archive, 'manifest.json.partial'), join(archive, 'manifest.json'));
console.log(JSON.stringify({ frozen: true, protocolPath, protocolSha256: manifest.protocolSha256,
  sourceCount: sourcePaths.size, archivedFiles: files.length, checkedScheduleEvents: 8,
  conditions: protocol.conditions, graphInference: false, finalFamilyRead: false }));
