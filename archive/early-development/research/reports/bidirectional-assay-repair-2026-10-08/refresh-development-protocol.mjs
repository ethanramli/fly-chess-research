// Refresh v4 development pins after infrastructure edits; never rewrites v1-v3.
import { readFileSync, writeFileSync, mkdirSync, createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { protocolDigest } from '../../../.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';
if (existsSync('research/data/bidirectional-plasticity-assay-v4/FROZEN')) throw Error('V4 is frozen; register a new version instead');
const p = JSON.parse(readFileSync('research/data/bidirectional-plasticity-assay-v3/protocol.json', 'utf8'));
p.schema = 'plasticity-mechanism-assay-protocol-v4';
p.status = 'development protocol; graph execution blocked by biological feasibility, identities and certified reversal';
p.supersedes = 'v1-v3 preserved; reviewed v3 source captured in research/source-archives/bidirectional-plasticity-assay-v3-reviewed';
p.receiptSchema = 'plasticity-assay-receipt-v2';
p.coordinatorSchema = 'plasticity-mechanism-assay-v2';
p.behavioralMetric = { identity: 'candidate-against-certified-opponents-v1',
  definition: 'Success: candidate score minus maximum certified failure score in this exact context. Failure: maximum certified success score minus candidate score. Missing independently checked comparison evidence is unknown.',
  scope: 'Certified development-action separation only; does not establish all-legal usefulness or transferable reasoning' };
p.reversalAssociations = [];
p.checkpointContract.push('assessment/delivery stage', 'acknowledged receipt SHA256', 'initial physiological hashes', 'post-ranking evidence');
const aliases = { assayCoordinator: '.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs',
  assayEntrypoint: '.codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs',
  assayAudit: '.codebase/scripts/puzzle-learning/audit-bidirectional-plasticity-assay.mjs' };
// Pin local import dependencies as well as entry points; reading source is not graph execution.
const pending = p.pinnedFiles.filter(ref => ref.path.endsWith('.mjs')).map(ref => ref.path), visited = new Set();
while (pending.length) {
  const path = pending.pop(); if (visited.has(path)) continue; visited.add(path);
  for (const match of readFileSync(path, 'utf8').matchAll(/\b(?:from\s+|import\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)) {
    const dependency = relative(process.cwd(), resolve(dirname(path), match[1])).replaceAll('\\', '/');
    if (!dependency.startsWith('.codebase/') || !dependency.endsWith('.mjs')) throw Error('Unexpected dependency: ' + dependency);
    if (!p.pinnedFiles.some(ref => ref.path === dependency)) p.pinnedFiles.push({ path: dependency, sha256: '' });
    pending.push(dependency);
  }
}
for (const ref of p.pinnedFiles) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(ref.path)) hash.update(chunk);
  ref.sha256 = hash.digest('hex');
  for (const [key, path] of Object.entries(aliases)) if (path === ref.path) p.identity.algorithms[key] = ref.sha256;
}
p.identity.protocol = protocolDigest(p);
mkdirSync('research/data/bidirectional-plasticity-assay-v4', { recursive: true });
writeFileSync('research/data/bidirectional-plasticity-assay-v4/protocol.json', JSON.stringify(p, null, 2) + '\n');
console.log(JSON.stringify({ protocol: p.identity.protocol, pins: p.pinnedFiles.length, biologicalGate: p.feasibilityReport.gate }));
