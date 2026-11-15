#!/usr/bin/env node
// Offline check of the reading-before-feedback rule (documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md).
// Reads the fixed-weight recording of record-pulse-readings-v1.mjs, the saved quiet learning-off run of probe-wide-learning-v3.mjs, the verified
// board packet and the annotation file (output-cell counts only). Loads no graph and runs no network.
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/neural-learning/check-reading-before-feedback-v1.mjs --recording DIR --packet BOARDS_JSONL --learning-off-run DIR --annotations TSV --out FILE
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { checkReadingBeforeFeedback, countOutputCells } from '../../src/neural-learning/reading-before-feedback-check-v1.mjs';

const { values: args } = parseArgs({ options: { recording: { type: 'string' }, packet: { type: 'string' }, 'learning-off-run': { type: 'string' }, annotations: { type: 'string' }, out: { type: 'string' } } });
if (!args.recording || !args.packet || !args['learning-off-run'] || !args.annotations || !args.out) throw Error('Need --recording DIR, --packet BOARDS_JSONL, --learning-off-run DIR, --annotations TSV and --out FILE');
if (existsSync(args.out)) throw Error(`${args.out} exists; choose a new file`);
const PACKET_SHA256 = 'fc058e1eda3604c7dc74db625778f1645f0ad350ce23c438b44017079487f429'; // the replay's boards.jsonl, as pinned in its config
const packetBytes = readFileSync(args.packet), packetHash = createHash('sha256').update(packetBytes).digest('hex');
if (packetHash !== PACKET_SHA256) throw Error(`Board packet hash ${packetHash}, expected ${PACKET_SHA256}`);
const lines = text => text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const read = (dir, name) => { const path = join(dir, name); if (!existsSync(path)) throw Error(`${path} is missing`); return readFileSync(path, 'utf8'); };
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

const { counts: outputCells, repeatedRoots } = await countOutputCells(createInterface({ input: createReadStream(args.annotations), crlfDelay: Infinity }));
const recording = { manifest: JSON.parse(read(args.recording, 'manifest.json')), summary: JSON.parse(read(args.recording, 'summary.json')), mapping: JSON.parse(read(args.recording, 'mapping.json')),
  records: lines(read(args.recording, 'records.jsonl')), packet: lines(packetBytes.toString('utf8')), expectedPacketHash: PACKET_SHA256 };
const savedRun = JSON.parse(read(args['learning-off-run'], 'result.json'));
const check = checkReadingBeforeFeedback({ recording, savedRun, outputCells });
writeFileSync(args.out, `${JSON.stringify({ ...check, inputs: { recording: args.recording, learningOffRun: args['learning-off-run'], packetSha256: packetHash,
  annotations: args.annotations, annotationsSha256: sha256(args.annotations), repeatedOutputRoots: repeatedRoots } }, null, 1)}\n`);

const e = x => x === null ? 'n/a' : x.toExponential(3), pct = x => x === null ? 'n/a' : `${(100 * x).toFixed(2)}%`;
console.log(`Rule: ${check.rule}; scale ${check.scale}. ${check.note}`);
console.log(`Output cells from the annotation file: ${Object.entries(outputCells).map(([t, n]) => `${t} ${n}`).join(', ')} (attraction ${check.groupSize.attraction}, avoidance ${check.groupSize.avoidance}; repeated roots ${repeatedRoots})`);
const s = check.selfCheck.savedRun;
console.log(`\nSelf-check: ${check.selfCheck.passes ? 'passes' : 'FAILS'}. Saved run: ${s.lessonsMatching} of 72 lessons and ${s.startingScoresMatching} of 106 starting scores match exactly; `
  + `first update by hand ${check.selfCheck.firstStepMatches ? 'matches' : 'DIFFERS'}; sums by type and by cell ${check.selfCheck.sumsAgree ? 'agree' : 'DIFFER'}`);
for (const p of s.problems.slice(0, 5)) console.log(`  ${p}`);
console.log('\nEstimated push toward the safe capture after 24 lessons (rates and signals fixed; positive favours the safe capture):');
for (const b of check.boards) {
  console.log(`  ${b.boardId}: safe ${b.safe.move}, rival ${b.rival.move}, gap ${e(b.gap)} (${b.eligible ? 'qualifies' : 'does not qualify'})`);
  for (const c of ['correct', 'swapped']) console.log(`    ${c}: net ${e(b[c].net)} (after 12 lessons ${e(b[c].netAfter12)}); by output type ${Object.entries(b[c].byType).map(([t, v]) => `${t} ${e(v)}`).join(', ')}${b[c].guardTrips ? `; step guard ${b[c].guardTrips}` : ''}`);
  console.log(`    top cell ${b.topCell.cell} supplies ${pct(b.topCell.shareOfChange)} of all change (${e(b.topCell.contribution)}); 12-lesson share ${pct(b.twelveLessonShare)}; `
    + `favours safe without its most helpful cell ${b.conditions.withoutTopCell ? 'yes' : 'no'}, beats swapped ${b.conditions.beatsSwapped ? 'yes' : 'no'}, favours safe by lesson 12 ${b.conditions.byHalfway ? 'yes' : 'no'}`);
}
const n = check.conditionCounts;
console.log(`\nQualifying boards ${n.qualifying}: without its most helpful cell ${n.withoutTopCell}, beats swapped ${n.beatsSwapped}, by lesson 12 ${n.byHalfway}, all three ${n.all}.`);
console.log(`Screen: ${check.screen.answer} (${check.screen.reason}). This can rule the rule out; it cannot show learning.`);
console.log(`\nWrote ${args.out}`);
if (!check.selfCheck.passes) process.exitCode = 1;
