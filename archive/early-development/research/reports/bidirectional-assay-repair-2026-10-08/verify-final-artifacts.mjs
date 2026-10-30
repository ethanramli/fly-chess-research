// Static final evidence collection. No graph/model load, inference or training.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { completePreflight } from '../../../.codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs';
const parse = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const protocol = parse('research/data/bidirectional-plasticity-assay-v4/protocol.json');
const preflight = await completePreflight(protocol, protocol.feasibilityReport.path);
assert.equal(preflight.passed, false);
assert.ok(preflight.pinnedFiles.every(ref => ref.matches));
assert.ok(preflight.mapping.passed && preflight.feasibilityHashMatches);
assert.deepEqual(preflight.evidence.map(e => e.status), ['success', 'failure', 'unknown']);
const preserved = [];
for (const ref of parse('research/source-archives/bidirectional-plasticity-assay-v3-reviewed/manifest.json')) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(ref.archived)) hash.update(chunk);
  const actual = hash.digest('hex'); assert.equal(actual, ref.sha256);
  if (ref.source.includes('/bidirectional-plasticity-assay-v3/'))
    assert.equal(createHash('sha256').update(readFileSync(ref.source)).digest('hex'), ref.sha256);
  preserved.push({ source: ref.source, archivedSha256: actual });
}
const output = { verifiedAt: new Date().toISOString(), scope: 'Static hashes/certificates plus recorded fixture results; no learner execution',
  fullSuite: { passed: 195, failed: 0, log: 'npm-test-final.txt' },
  protocol: protocol.identity.protocol, preflight, preservedV3: preserved };
assert.match(readFileSync(new URL('./npm-test-final.txt', import.meta.url), 'utf16le').replace(/^\uFEFF/, ''), /# pass 195/);
writeFileSync(new URL('./final-verification.json', import.meta.url), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ pinsMatched: preflight.pinnedFiles.length, preservedV3: preserved.length,
  fullSuite: output.fullSuite, graphExecutionBlocked: !preflight.passed, errors: preflight.protocol.errors }));
