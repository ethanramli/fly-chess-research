// Compare exact continuation artifacts after a separate fresh neural audit.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
const [fixtureArg, recoveredArg, outArg] = process.argv.slice(2);
assert.ok(fixtureArg && recoveredArg && outArg, 'Pass fixture.json, recovered run, and fresh output JSON');
const fixturePath = resolve(fixtureArg), recovered = resolve(recoveredArg), out = resolve(outArg);
assert.ok(!existsSync(out) && !existsSync(`${out}.partial`), 'Never overwrite a recovery audit');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const fixture = read(fixturePath);
assert.equal(fixture.schema, 'correction-preservation-v2-recovery-fixture-v1');
assert.equal(sha(fixture.statePath), fixture.stateSha256);
assert.equal(sha(join(fixture.origin, 'report.json')), fixture.originReportSha256);
assert.equal(sha(join(fixture.origin, 'audit.json')), fixture.originAuditSha256);
const original = read(join(fixture.origin, 'report.json')), actual = read(join(recovered, 'report.json'));
assert.equal(read(join(recovered, 'COMPLETE')).reportSha256, sha(join(recovered, 'report.json')));
const auditPath = join(recovered, 'audit.json'), audit = read(auditPath);
assert.equal(read(`${auditPath}.COMPLETE`).auditSha256, sha(auditPath));
assert.equal(audit.reportSha256, sha(join(recovered, 'report.json')));
assert.equal(audit.exactFreshNeuralReplays, true);
for (const key of ['identity', 'schedule', 'condition', 'baseline', 'afterTraining', 'repeat', 'reset',
  'restored', 'initialMemoryHash', 'finalMemoryHash', 'receipts', 'presentations'])
  assert.deepEqual(actual[key], original[key], `Recovery mismatch: ${key}`);
for (const ref of actual.receipts) assert.equal(sha(join(recovered, ref.path)), ref.sha256);
const before = read(fixture.statePath);
const firstNew = readdirSync(recovered).filter(name => /^checkpoint-\d{5}$/.test(name)).sort()
  .find(name => Number(name.slice(11)) > before.sequence);
assert.ok(firstNew);
const resumed = read(join(recovered, firstNew, 'state.json')).state;
assert.equal(resumed.eventIndex, before.state.eventIndex + 1);
assert.equal(resumed.pending, null);
assert.equal(resumed.presentations, before.state.presentations);
assert.deepEqual(resumed.memory, before.state.memory);
assert.equal(resumed.receiptRefs.length, before.state.receiptRefs.length + 1);
assert.equal(resumed.receiptRefs.at(-1).sha256, before.state.pending.receiptRef.sha256);
const result = { schema: 'correction-preservation-v2-recovery-audit-v1', passed: true,
  fixtureSha256: sha(fixturePath), originalReportSha256: fixture.originReportSha256,
  recoveredReportSha256: sha(join(recovered, 'report.json')), freshReplayAuditSha256: sha(auditPath),
  pendingUpdateDuplicated: false, newPresentationsBeforeAcknowledgment: 0,
  finalMemoryExact: true, allRankingsExact: true, exactReceiptHashes: actual.receipts.length,
  scope: 'Simulated pending-receipt continuation; not biological retention, a historical crash or a speed comparison.' };
writeFileSync(`${out}.partial`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
renameSync(`${out}.partial`, out);
console.log(JSON.stringify(result));
