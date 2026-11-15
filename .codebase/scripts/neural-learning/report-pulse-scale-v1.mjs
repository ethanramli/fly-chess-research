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
import { PASSES } from '../../src/neural-learning/three-board-feedback-v1.mjs';

function compareLearningOff(run, protocol, packet, records) {
  const boards = Array.isArray(run.boards) ? run.boards : [];
  const expectedBoards = protocol.boards.map(b => b.boardId);
  const boardOrderMatches = boards.length === expectedBoards.length && expectedBoards.every((id, i) => boards[i]?.boardId === id);
  const scores = new Map(records.filter(r => r.pulse === 'none').map(r => [`${r.boardId} ${r.move}`, r.score]));
  const lessonCheck = { what: 'learning-off run: lesson identities and worst shares match exactly', reference: 0, recorded: 0, problems: [] };
  const scoreCheck = { what: 'learning-off run: starting move identities and scores match exactly', reference: 0, recorded: 0, problems: [] };
  for (const [i, { boardId, lessons }] of protocol.boards.entries()) {
    const legal = packet.find(b => b.boardId === boardId).legal;
    const board = boards[i]?.boardId === boardId ? boards[i] : null;
    const previousLessons = board?.lessons;
    const expectedLessons = PASSES * lessons.length;
    lessonCheck.reference += expectedLessons;
    if (previousLessons?.length !== expectedLessons || !Array.isArray(previousLessons)) {
      lessonCheck.problems.push(`${boardId}: expected ${expectedLessons} lessons`);
    }
    for (let pass = 1; pass <= PASSES; pass++) {
      for (const [index, lesson] of lessons.entries()) {
        const previous = previousLessons?.[(pass - 1) * lessons.length + index];
        const kept = previous?.cap?.worstKept;
        if (previous?.pass === pass && previous.index === index && previous.move === lesson.move && previous.label === lesson.label
          && Number.isFinite(kept) && Object.is(kept, lesson.worstKeptAtOldScale)) lessonCheck.recorded++;
        else lessonCheck.problems.push(`${boardId}: pass ${pass}, lesson ${index} (${lesson.move}, ${lesson.label}) differs or is missing`);
      }
    }
    const starting = board?.checkpoints?.[0];
    const previousScores = starting?.pass === 0 && starting.scores ? starting.scores : {};
    scoreCheck.reference += legal.length;
    if (Object.keys(previousScores).length !== legal.length) scoreCheck.problems.push(`${boardId}: expected ${legal.length} starting move scores`);
    for (const move of legal) {
      const previous = previousScores[move];
      if (Number.isFinite(previous) && Object.is(previous, scores.get(`${boardId} ${move}`))) scoreCheck.recorded++;
      else scoreCheck.problems.push(`${boardId}: starting score for ${move} differs or is missing`);
    }
  }
  return [
    { what: 'learning-off run: boards match in packet order', reference: expectedBoards, recorded: boards.map(b => b?.boardId), matches: boardOrderMatches },
    ...[lessonCheck, scoreCheck].map(check => ({ ...check, matches: check.problems.length === 0 })),
  ];
}

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
const records = lines(read('records.jsonl')), packet = lines(packetBytes.toString('utf8'));
const report = buildReport({ manifest: JSON.parse(read('manifest.json')), summary: JSON.parse(read('summary.json')), mapping: JSON.parse(read('mapping.json')),
  records, packet, expectedPacketHash: PACKET_SHA256, extraScales });
// Published figures provide context. The exact check below uses the saved per-lesson and per-move data.
const none = report.sets['same pulse: none'], protocol = report.sets['protocol, correct labels'];
const crossCheck = [
  ...[['Q04sIPQ5:13', 1], ['SjmcbcGu:16', 0.9900033121133562], ['5XRGyGSj:13', 0.990053543838129]].map(([boardId, reference]) => ({
    what: `no pulse, ${boardId}: worst share kept at 0.014047 (calibration replay scale.json)`, reference, recorded: none.boards.find(b => b.boardId === boardId).all.atOldScale.worstKept })),
  { what: 'no pulse: smallest passing scale (calibration replay scale.json)', reference: 0.014047, recorded: none.smallestPassing?.scale },
  { what: 'protocol, correct labels: worst share kept at 0.014047, within 0.01 point of 22.35% (researcher\'s report of the quiet learning-off run)', reference: 0.2235, recorded: protocol.atOldScale.worstKept, within: 1e-4 },
  { what: 'protocol, correct labels: lessons failing at 0.014047 (same report)', reference: 72, recorded: protocol.failingLessonsAtOldScale },
];
for (const c of crossCheck) c.matches = c.within ? Math.abs(c.recorded - c.reference) <= c.within : c.recorded === c.reference;
const learningOffCheck = { status: 'not checked' };
if (args['learning-off-run']) {
  const run = JSON.parse(readFileSync(join(args['learning-off-run'], 'result.json'), 'utf8'));
  if (run.circuit !== 'quiet' || run.condition !== 'off') throw Error(`${args['learning-off-run']} is ${run.circuit} ${run.condition}, not quiet off`);
  const checks = compareLearningOff(run, protocol, packet, records);
  learningOffCheck.status = checks.every(c => c.matches) ? 'matches' : 'differs';
  crossCheck.push(...checks);
}
writeFileSync(args.out, `${JSON.stringify({ ...report, crossCheck, learningOffCheck, recording: args.recording, packetSha256: packetHash }, null, 1)}\n`);

const pct = x => `${(Math.floor(x * 1e6) / 1e4).toFixed(4)}%`, e = x => x.toExponential(3); // shares rounded down, so a share under 99% never prints as 99%
const reduction = x => x === null ? 'n/a (no gain change with pulsed readings)' : pct(x);
console.log(`Readings: ${report.maskEdges} learnable connections from ${report.learnableCells} cells; weights fixed. ${report.note}`);
console.log('\nCross-check against earlier results:');
for (const c of crossCheck) {
  console.log(`  ${c.matches ? 'matches' : 'DIFFERS'}: ${c.what}: recorded ${c.recorded}, expected ${c.reference}`);
  if (c.problems?.length) console.log(`    ${c.problems[0]}`);
}
if (learningOffCheck.status === 'not checked') console.log('  NOT CHECKED: exact learning-off comparison (supply --learning-off-run)');
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
  for (const b of r.boards) {
    console.log(`    ${b.boardId}: mean |gain - 1| correct ${e(b.correct.meanAbsChange)}, swapped ${e(b.swapped.meanAbsChange)}; `
      + `correct vs swapped mean |difference| ${e(b.divergence.meanAbs)}, max ${e(b.divergence.maxAbs)}; at limit ${b.correct.atLimit}/${b.swapped.atLimit}; share of capped reading added by the pulse ${pct(b.shareOfCappedReadingAddedByPulse)}; lesson readings at cap ${pct(b.lessonShareAtCap)}${b.guardTrips ? `; step guard ${b.guardTrips}` : ''}`);
    const { divergence, fractionOfMeanAbsChangeRemoved } = b.unpulsedReadingReplay;
    console.log(`      Unpulsed cell readings, same learning signals: mean gain change reduction correct ${reduction(fractionOfMeanAbsChangeRemoved.correct)}, swapped ${reduction(fractionOfMeanAbsChangeRemoved.swapped)}; correct vs swapped mean |difference| ${e(divergence.meanAbs)}`);
  }
}
console.log(`\nWrote ${args.out}`);
if (learningOffCheck.status === 'differs') process.exitCode = 1;
