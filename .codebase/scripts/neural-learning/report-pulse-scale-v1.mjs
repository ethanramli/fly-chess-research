#!/usr/bin/env node
// Pulse scale report (documentation/design/neural-learning/pulse-scale-check-2026-11-15.md). Offline: reads one recording from
// record-pulse-readings-v1.mjs and the verified board packet; loads no graph. Shows how the quiet circuit's scale affects move differences
// before and during each pulse, the smallest scale passing 99% per set of comparisons, and the update size replayed from the fixed readings.
// Usage (repo root): node .codebase/scripts/neural-learning/report-pulse-scale-v1.mjs --recording DIR --packet BOARDS_JSONL --out FILE [--scales 0.02,0.03] [--learning-off-run DIR]
// --learning-off-run: the probe's quiet learning-off run folder (result.json); its lesson cap records and starting scores are compared exactly.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildReport } from '../../src/neural-learning/pulse-readings-v1.mjs';
const { values: args } = parseArgs({ options: { recording: { type: 'string' }, packet: { type: 'string' }, out: { type: 'string' }, scales: { type: 'string' }, 'learning-off-run': { type: 'string' } } });
if (!args.recording || !args.packet || !args.out) throw Error('Need --recording DIR, --packet BOARDS_JSONL and --out FILE');
if (existsSync(args.out)) throw Error(`${args.out} exists; choose a new file`);
const PACKET_SHA256 = 'fc058e1eda3604c7dc74db625778f1645f0ad350ce23c438b44017079487f429'; // the replay's boards.jsonl, as pinned in its config
const packetBytes = readFileSync(args.packet), packetHash = createHash('sha256').update(packetBytes).digest('hex');
if (packetHash !== PACKET_SHA256) throw Error(`Board packet hash ${packetHash}, expected ${PACKET_SHA256}`);
const lines = text => text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const read = name => { const path = join(args.recording, name); if (!existsSync(path)) throw Error(`Recording rejected: ${name} is missing`); return readFileSync(path, 'utf8'); };
const extraScales = args.scales ? args.scales.split(',').map(Number) : [];
if (extraScales.some(s => !(s > 0))) throw Error('--scales must be positive numbers');
const records = lines(read('records.jsonl'));
const report = buildReport({ manifest: JSON.parse(read('manifest.json')), summary: JSON.parse(read('summary.json')), mapping: JSON.parse(read('mapping.json')),
  records, packet: lines(packetBytes.toString('utf8')), expectedPacketHash: PACKET_SHA256, extraScales });
// Earlier results this recording should reproduce if its readings are the ones those checks used. A mismatch is reported, not fixed:
// it would mean the calibration, the probe and this recorder did not read the same cells.
const none = report.sets['same pulse: none'], protocol = report.sets['protocol, correct labels'];
const crossCheck = [
  ...[['Q04sIPQ5:13', 1], ['SjmcbcGu:16', 0.9900033121133562], ['5XRGyGSj:13', 0.990053543838129]].map(([boardId, reference]) => ({
    what: `no pulse, ${boardId}: worst share kept at 0.014047 (calibration replay scale.json)`, reference, recorded: none.boards.find(b => b.boardId === boardId).all.atOldScale.worstKept })),
  { what: 'no pulse: smallest passing scale (calibration replay scale.json)', reference: 0.014047, recorded: none.smallestPassing?.scale },
  { what: 'protocol, correct labels: worst share kept at 0.014047, within 0.01 point of 22.35% (researcher\'s report of the quiet learning-off run)', reference: 0.2235, recorded: protocol.atOldScale.worstKept, within: 1e-4 },
  { what: 'protocol, correct labels: lessons failing at 0.014047 (same report)', reference: 72, recorded: protocol.failingLessonsAtOldScale },
];
// The recorder runs the probe's own forward with weights fixed, so the probe's learning-off run must agree to the last bit.
if (args['learning-off-run']) {
  const run = JSON.parse(readFileSync(join(args['learning-off-run'], 'result.json'), 'utf8'));
  if (run.circuit !== 'quiet' || run.condition !== 'off') throw Error(`${args['learning-off-run']} is ${run.circuit} ${run.condition}, not quiet off`);
  const score = new Map(records.filter(r => r.pulse === 'none').map(r => [`${r.boardId} ${r.move}`, r.score]));
  let lessons = 0, sameLessons = 0, scores = 0, sameScores = 0;
  for (const b of run.boards) {
    const mine = protocol.boards.find(x => x.boardId === b.boardId)?.lessons ?? [];
    for (const l of b.lessons) { lessons++; if (Object.is(l.cap?.worstKept, mine[l.index]?.worstKeptAtOldScale)) sameLessons++; }
    for (const [move, s] of Object.entries(b.checkpoints[0].scores)) { scores++; if (Object.is(s, score.get(`${b.boardId} ${move}`))) sameScores++; }
  }
  crossCheck.push({ what: 'learning-off run: lessons whose worst share kept at 0.014047 is bit-identical', reference: lessons, recorded: sameLessons },
    { what: 'learning-off run: starting move scores bit-identical to the no-pulse readings', reference: scores, recorded: sameScores });
}
for (const c of crossCheck) c.matches = c.within ? Math.abs(c.recorded - c.reference) <= c.within : c.recorded === c.reference;
writeFileSync(args.out, `${JSON.stringify({ ...report, crossCheck, recording: args.recording, packetSha256: packetHash }, null, 1)}\n`);

const pct = x => `${(Math.floor(x * 1e6) / 1e4).toFixed(4)}%`, e = x => x.toExponential(3); // shares rounded down, so a share under 99% never prints as 99%
console.log(`Readings: ${report.maskEdges} learnable connections from ${report.learnableCells} cells; weights fixed. ${report.note}`);
console.log('\nCross-check against earlier results:');
for (const c of crossCheck) console.log(`  ${c.matches ? 'matches' : 'DIFFERS'}: ${c.what}: recorded ${c.recorded}, earlier ${c.reference}`);
console.log('\nHow much moves differ (edge-weighted summed rate difference; median over pairs or moves):');
for (const d of report.differences) {
  console.log(`  ${d.boardId} (${d.moves} moves): between moves none ${e(d.betweenMoves.none.median)}, reward ${e(d.betweenMoves.reward.median)}, punish ${e(d.betweenMoves.punish.median)}; `
    + `pulse shift reward ${e(d.pulseShift.reward.median)}, punish ${e(d.pulseShift.punish.median)}; peak rate none ${e(d.peakRate.none)}, reward ${e(d.peakRate.reward)}, punish ${e(d.peakRate.punish)}`);
}
console.log(`\nComparison sets, at the old scale ${report.oldScale} and the smallest scale keeping >= 99% (shares rounded down):`);
for (const [name, s] of Object.entries(report.sets)) {
  const lessons = s.kind === 'protocol' ? `; lessons failing ${s.failingLessonsAtOldScale} of ${s.lessons}` : '';
  const sp = s.smallestPassing, below = sp?.oneStepBelow ? `; one step below (${sp.oneStepBelow.scale}) keeps ${pct(sp.oneStepBelow.worstKept)}` : '';
  console.log(`  ${name}: ${s.comparisons} comparisons; at ${report.oldScale} worst keeps ${pct(s.atOldScale.worstKept)}, ${s.atOldScale.failing} fail${lessons}; `
    + `smallest passing ${sp ? `${sp.scale} (keeps ${pct(sp.worstKept)}, set by ${sp.boundaryBoard}${below})` : 'none: all pairs identical'}`);
}
console.log('\nUpdate replay from fixed readings, 24 lessons per board (estimate of update size only; actual learning not measured):');
for (const r of report.replay) {
  console.log(`  scale ${r.scale}: passes 99% for ${Object.entries(r.passes99).filter(([, ok]) => ok).map(([n]) => n).join('; ') || 'no set'}`);
  for (const b of r.boards) console.log(`    ${b.boardId}: mean |gain - 1| correct ${e(b.correct.meanAbsChange)}, swapped ${e(b.swapped.meanAbsChange)}; `
    + `correct vs swapped mean |difference| ${e(b.divergence.meanAbs)}, max ${e(b.divergence.maxAbs)}; at limit ${b.correct.atLimit}/${b.swapped.atLimit}; pulse share of reading ${pct(b.pulseShareOfReading)}; lesson readings at cap ${pct(b.lessonShareAtCap)}${b.guardTrips ? `; step guard ${b.guardTrips}` : ''}`);
}
console.log(`\nWrote ${args.out}`);
