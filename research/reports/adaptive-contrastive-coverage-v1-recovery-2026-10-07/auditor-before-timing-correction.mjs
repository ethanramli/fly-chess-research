// Read-only graph-free verification of a pending-receipt prefix resume.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { sha256 } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { original: { type: 'string' },
  resumed: { type: 'string' }, checkpoint: { type: 'string' } } });
assert.ok(args.original && args.resumed && args.checkpoint);
const read = f => JSON.parse(readFileSync(f, 'utf8'));
const saved = read(args.checkpoint), manifest = read(join(dirname(args.checkpoint), 'checkpoint.json'));
assert.equal(await sha256(args.checkpoint), manifest.stateSha256);
const pending = saved.state.active;
assert.equal(pending.phase, 'receipt'); assert.ok(pending.pending);
const reportPath = join(args.resumed, 'report.json'), report = read(reportPath);
assert.equal(report.complete, false); assert.deepEqual(report.identity, saved.identity);
const stem = `${pending.condition}-${pending.eventIndex}`;
const eventPath = join(args.resumed, `event-${stem}.json`);
assert.deepEqual(read(eventPath), pending.pending);
assert.deepEqual(read(eventPath), read(join(args.original, `event-${stem}.json`)));
const rankingPath = join(args.resumed, `ranking-${stem}.json`);
assert.deepEqual(read(rankingPath), read(join(args.original, `ranking-${stem}.json`)));
assert.deepEqual(report.state.memory, saved.state.memory);
assert.equal(report.state.totalEvents, saved.state.totalEvents + 1);
assert.equal(report.state.active.eventIndex, pending.eventIndex + 1);
const candidateCount = read(rankingPath).assessment.rows.length;
assert.equal(report.resources.invocationPresentations, candidateCount);
assert.equal(report.state.presentations, saved.state.presentations + candidateCount);
assert.equal(report.state.active.pending, null);
const audit = { passed: true, checkpointSha256: await sha256(args.checkpoint),
  reportSha256: await sha256(reportPath), receiptSha256: await sha256(eventPath),
  rankingSha256: await sha256(rankingPath), invocationPresentations: candidateCount,
  exactReceipt: true, exactRanking: true, noDuplicateUpdate: true,
  scope: 'Pending receipt publication and fresh all-legal inference recovery; not a new learning seed.' };
const output = join(args.resumed, 'audit-recovery.json'); assert.equal(existsSync(output), false);
writeFileSync(output + '.partial', JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
renameSync(output + '.partial', output); console.log(JSON.stringify(audit));
