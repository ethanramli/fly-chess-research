import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd(), oldPath = 'research/data/adaptive-near-transfer-v4/protocol.json';
const run = 'research/reports/adaptive-near-transfer-v4-2026-10-07';
const originalAuditorPath = '.codebase/scripts/puzzle-learning/audit-adaptive-near-transfer.mjs';
const originalAuditorArchive = `${run}/auditor-v4-first-failure.mjs`;
const freezePath = '.codebase/scripts/puzzle-learning/freeze-adaptive-near-transfer-audit-correction.mjs';
const readBytes = path => readFileSync(resolve(root, path));
const sha = path => createHash('sha256').update(readBytes(path)).digest('hex');
const old = JSON.parse(readBytes(oldPath));
const archiveHash = sha(originalAuditorArchive);
if (archiveHash !== old.sources[originalAuditorPath]) throw Error('Archived original auditor does not match frozen v4 source identity');
for (const [path, expected] of Object.entries(old.inputs)) if (sha(path) !== expected) throw Error(`Frozen input changed: ${path}`);

const inputs = {
  ...old.inputs,
  [oldPath]: sha(oldPath),
  [`${run}/report.json`]: sha(`${run}/report.json`),
  [`${run}/RUN_COMPLETE.json`]: sha(`${run}/RUN_COMPLETE.json`),
  [originalAuditorArchive]: archiveHash,
};
const sources = Object.fromEntries([
  ...Object.keys(old.sources).filter(path => path !== originalAuditorPath),
  originalAuditorPath, freezePath,
].map(path => [path, sha(path)]));
const protocol = {
  schema: 'adaptive-near-transfer-audit-correction-v1',
  purpose: 'Independently audit the completed v4 no-feedback near-generalization report using a corrected auditor after preserving its first audit failure.',
  originalProtocolPath: oldPath,
  originalProtocolSha256: sha(oldPath),
  originalAuditorPath,
  originalAuditorArchive,
  inputs,
  sources,
  output: run,
  scope: 'Audit correction only; does not rerun neural scoring, add learning, or upgrade same-motif development data to final transfer evidence.',
};
const out = 'research/data/adaptive-near-transfer-v4-audit-correction-v1/protocol.json';
mkdirSync(resolve(root, 'research/data/adaptive-near-transfer-v4-audit-correction-v1'), { recursive: true });
writeFileSync(resolve(root, out), `${JSON.stringify(protocol, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ protocol: out, sha256: sha(out), sources: Object.keys(sources).length, inputs: Object.keys(inputs).length }, null, 2));
