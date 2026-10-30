import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

// Independent recorded-evidence audit: no neural, encoder or learning imports.
const { values: args } = parseArgs({ options: { run:{type:'string'},out:{type:'string'} } });
if (!args.run || !args.out) throw Error('Require --run and fresh --out');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const bytes = readFileSync(join(args.run,'report.json')), report = JSON.parse(bytes);
assert.equal(report.complete,true); assert.equal(report.identity.schema,'positive-puzzle-memory-probe-v1');
for (const [path,expected] of Object.entries({...report.identity.inputs,...report.identity.sources}))
  assert.equal(hash(readFileSync(path)),expected);
const sourcePath = Object.keys(report.identity.inputs).find(path => /[\\/]report\.json$/.test(path));
assert.ok(sourcePath); const source = read(sourcePath);
const auditPath = Object.keys(report.identity.inputs).find(path => /[\\/]audit-prefix\.json$/.test(path));
const originalAudit = read(auditPath); assert.equal(originalAudit.passed,true); assert.equal(originalAudit.prefixExact,true);
assert.equal(originalAudit.reportSha256,hash(readFileSync(sourcePath)));
const fixture = source.results.find(row => row.condition === 'informative' && row.row.id === 'pipeline-kqk-fixture');
assert.ok(fixture); const ref = fixture.receiptRefs[0], receipt = read(ref.path);
assert.equal(hash(readFileSync(ref.path)),ref.sha256); assert.equal(receipt.event.channel,'PAM02');
assert.equal(receipt.event.status,'success'); assert.deepEqual(receipt.before,fixture.beforeMemory);
const mapping = read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
assert.equal(hash(JSON.stringify(mapping)),source.identity.mappingHash);
const types = mapping.groups.flatMap(group => group.edges.map(() => group.danType));
const expectedStates = {
  baseline:fixture.beforeMemory,
  'after-first-event':receipt.after,
  'first-PAM02-only':{...receipt.after,gains:receipt.after.gains.map((v,i) => types[i] === 'PAM02' ? v : receipt.before.gains[i])},
  'first-PPL103-only':{...receipt.after,gains:receipt.after.gains.map((v,i) => types[i] === 'PPL103' ? v : receipt.before.gains[i])},
  final:fixture.afterMemory,restored:fixture.afterMemory,
};
assert.deepEqual(report.identity.jobs,Object.keys(expectedStates)); assert.equal(report.results.length,6);
const board = new Chess(fixture.row.fen); if (fixture.row.pgn !== undefined) board.loadPgn(fixture.row.pgn);
const legal = board.moves({verbose:true}).map(move => move.from+move.to+(move.promotion??'')).sort();
const summary = [];
for (let i=0;i<report.results.length;i++) {
  const row = report.results[i]; assert.equal(row.job,report.identity.jobs[i]);
  assert.deepEqual(row.memory,expectedStates[row.job]); assert.equal(row.fixedStatePreserved,true);
  const assessment = row.assessment; assert.equal(assessment.memoryFingerprint,hash(JSON.stringify(row.memory)));
  assert.deepEqual(assessment.rows.map(v => v.move).sort(),legal);
  for (const candidate of assessment.rows) {
    assert.ok([candidate.score,candidate.MBON12,candidate.MBON01].every(Number.isFinite));
    assert.equal(candidate.score,candidate.MBON12-candidate.MBON01);
  }
  const ranked = [...assessment.rows].sort((a,b) => b.score-a.score); assert.equal(assessment.choice,ranked[0].move);
  if (row.job === 'baseline') assert.deepEqual(assessment,fixture.before);
  if (row.job === 'final' || row.job === 'restored') assert.deepEqual(assessment,fixture.after);
  const target = ranked.find(v => v.move === receipt.event.move); assert.ok(target);
  const rival = ranked.find(v => v.move !== target.move); assert.ok(rival);
  summary.push({job:row.job,choice:assessment.choice,target:target.move,targetScore:target.score,
    targetRank:ranked.indexOf(target)+1,targetMargin:target.score-rival.score,
    changedGainsFromBaseline:row.memory.gains.filter((v,j) => v !== fixture.beforeMemory.gains[j]).length});
}
assert.deepEqual(report.results[4].assessment,report.results[5].assessment);
writeFileSync(args.out,JSON.stringify({passed:true,reportSha256:hash(bytes),interventionsChecked:6,
  candidatesChecked:legal.length*6,summary,
  scope:'Recorded intervention masks, legal sets, score arithmetic and original/restored-score equality; not independent neural inference, learning acceptance, biological necessity or transfer'},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,interventions:6,candidates:legal.length*6,summary}));
