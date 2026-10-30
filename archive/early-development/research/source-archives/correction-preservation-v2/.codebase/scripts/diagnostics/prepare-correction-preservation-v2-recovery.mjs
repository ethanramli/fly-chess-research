// Copy a published pending prefix; preserve the historical completed run.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
const [originArg, outArg] = process.argv.slice(2);
assert.ok(originArg && outArg, 'Pass completed original run and fresh fixture directory');
const origin = resolve(originArg), out = resolve(outArg);
assert.ok(!existsSync(out), 'Never overwrite a recovery fixture');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const report = read(join(origin, 'report.json')), audit = read(join(origin, 'audit.json'));
assert.equal(report.schema, 'correction-preservation-v2-run-v1');
assert.equal(read(join(origin, 'COMPLETE')).reportSha256, sha(join(origin, 'report.json')));
assert.equal(audit.reportSha256, sha(join(origin, 'report.json')));
assert.equal(audit.exactFreshNeuralReplays, true);
assert.equal(read(join(origin, 'audit.json.COMPLETE')).auditSha256, sha(join(origin, 'audit.json')));
const names = readdirSync(origin).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
const selected = names.find(name => read(join(origin, name, 'state.json')).state.pending);
assert.ok(selected);
const saved = read(join(origin, selected, 'state.json'));
assert.equal(saved.state.eventIndex, 0);
assert.equal(saved.state.pending.receipt.eventIndex, 0);
mkdirSync(out, { recursive: true });
const lineage = [];
for (const name of names.filter(name => name <= selected)) {
  const statePath = join(origin, name, 'state.json');
  assert.equal(sha(statePath), read(join(origin, name, 'checkpoint.json')).stateSha256);
  cpSync(join(origin, name), join(out, name), { recursive: true, errorOnExist: true, force: false });
  lineage.push({ name, stateSha256: sha(statePath) });
}
for (const ref of saved.state.receiptRefs) {
  const target = join(out, ref.path);
  assert.equal(sha(join(origin, ref.path)), ref.sha256);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(origin, ref.path), target, { errorOnExist: true, force: false });
}
const fixture = { schema: 'correction-preservation-v2-recovery-fixture-v1', origin,
  originReportSha256: sha(join(origin, 'report.json')), originAuditSha256: sha(join(origin, 'audit.json')),
  schedule: report.schedule, condition: report.condition,
  statePath: join(out, selected, 'state.json'), stateSha256: sha(join(out, selected, 'state.json')),
  selectedCheckpoint: selected, pendingEventIndex: saved.state.eventIndex,
  presentationsAtInterruption: saved.state.presentations, lineage,
  protocolSha256: saved.identity.protocolSha256,
  scope: 'Simulated interruption at a published updated-memory/pending-receipt prefix; not a historical crash.' };
const target = join(out, 'fixture.json');
writeFileSync(`${target}.partial`, JSON.stringify(fixture, null, 2) + '\n', { flag: 'wx' });
renameSync(`${target}.partial`, target);
console.log(JSON.stringify(fixture));
