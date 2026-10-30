import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const run = resolve(process.argv[2] ?? 'runs/curriculum-g0-assay-v1-resumed5');
const protocol = JSON.parse(readFileSync(resolve(run, 'protocol.json'), 'utf8'));
const runnerResult = JSON.parse(readFileSync(resolve(run, 'result.json'), 'utf8'));
const archived = resolve(run, 'sources/.codebase/src/neural-learning');
const {createG0Table, planG0Schedule} = await import(pathToFileURL(resolve(archived, 'curriculum-g0.mjs')));
const {digest} = await import(pathToFileURL(resolve(archived, 'mushroom-body.mjs')));
const sourceHashes = {};
for (const name of ['curriculum-g0.mjs', 'mushroom-body.mjs']) {
  const key = `.codebase/src/neural-learning/${name}`;
  const bytes = readFileSync(resolve(archived, name));
  sourceHashes[key] = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sourceHashes[key], protocol.sources[key], `Archived source hash mismatch: ${key}`);
}

function stats(seed) {
  const schedule = planG0Schedule(createG0Table(), {shuffleSeed: seed});
  const reversal = schedule.filter(x => x.experience.phase === 'reversal');
  const targetHistory = schedule.filter(x => ['acquisition', 'reversal'].includes(x.experience.phase));
  const truthKey = event => `${event.experience.publicInput.cue.join('')}:${event.experience.publicInput.action}`;
  const reversalTruth = new Map(reversal.map(event => [truthKey(event), event.experience.status]));
  const cueCounts = (events, matches) => {
    const cues = [...new Set(events.map(x => x.experience.publicInput.cue.join('')))];
    const perCue = cues.map(cue => events.filter(x => x.experience.publicInput.cue.join('') === cue)
      .filter(matches).length);
    return {cues, perCue, matchingAssignments: perCue.reduce((sum, count) => sum + count, 0)};
  };
  const reversalRows = cueCounts(reversal, event => event.shuffledStatus === event.experience.status);
  const cumulativeRows = cueCounts(targetHistory, event =>
    event.shuffledStatus === reversalTruth.get(truthKey(event)));
  return {
    seed,
    reversal: {
      matchingAssignments: reversalRows.matchingAssignments,
      assignments: reversal.length,
      cuesWithAtLeastThreeOfFourMatching: reversalRows.perCue.filter(count => count >= 3).length,
      cuesWithAllFourMatching: reversalRows.perCue.filter(count => count === 4).length,
      perCueMatches: Object.fromEntries(reversalRows.cues.map((cue, i) => [cue, reversalRows.perCue[i]])),
    },
    cumulativeTargetHistory: {
      matchingAssignmentsToFinalReversalTruth: cumulativeRows.matchingAssignments,
      assignments: targetHistory.length,
      cuesWithAtLeastSixOfEightMatching: cumulativeRows.perCue.filter(count => count >= 6).length,
      cuesWithAllEightMatching: cumulativeRows.perCue.filter(count => count === 8).length,
      perCueMatches: Object.fromEntries(cumulativeRows.cues.map((cue, i) => [cue, cumulativeRows.perCue[i]])),
    },
  };
}

const frozenSchedule = planG0Schedule(createG0Table(), {shuffleSeed: protocol.shuffleSeed});
assert.equal(digest(frozenSchedule), protocol.scheduleHash, 'Archived schedule must match frozen protocol hash');
const frozenSeed = stats(protocol.shuffleSeed);
const sampleStart = 0;
const sampleCount = 512;
const histogram = {
  reversal: {matchingAssignments: {}, cuesWithAtLeastThreeOfFourMatching: {}, cuesWithAllFourMatching: {}},
  cumulativeTargetHistory: {
    matchingAssignmentsToFinalReversalTruth: {},
    cuesWithAtLeastSixOfEightMatching: {},
    cuesWithAllEightMatching: {},
  },
};
let totalReversalMatches = 0;
let totalCumulativeMatches = 0;
let schedulesWithAtLeastTwoFullyMatchingReversalCues = 0;
let schedulesWithAtLeastTwoCumulativeCues = 0;
let schedulesAtLeastAsAlignedCumulativelyAsFrozenSeed = 0;
for (let seed = sampleStart; seed < sampleStart + sampleCount; seed++) {
  const row = stats(seed);
  totalReversalMatches += row.reversal.matchingAssignments;
  totalCumulativeMatches += row.cumulativeTargetHistory.matchingAssignmentsToFinalReversalTruth;
  if (row.reversal.cuesWithAllFourMatching >= 2) schedulesWithAtLeastTwoFullyMatchingReversalCues++;
  if (row.cumulativeTargetHistory.cuesWithAllEightMatching >= 2) schedulesWithAtLeastTwoCumulativeCues++;
  if (row.cumulativeTargetHistory.matchingAssignmentsToFinalReversalTruth
    >= frozenSeed.cumulativeTargetHistory.matchingAssignmentsToFinalReversalTruth)
    schedulesAtLeastAsAlignedCumulativelyAsFrozenSeed++;
  for (const [group, fields] of Object.entries(histogram)) {
    for (const key of Object.keys(fields)) {
      const value = row[group][key];
      fields[key][value] = (fields[key][value] ?? 0) + 1;
    }
  }
}

const output = {
  schema: 'curriculum-g0-shuffle-control-diagnostic-v1',
  scope: 'Static schedule sensitivity only; no neural simulation, training, gate change, or causal explanation.',
  run: run.replaceAll('\\', '/'),
  protocolHash: runnerResult.identity.protocolHash,
  frozenScheduleHash: protocol.scheduleHash,
  sourceHashes,
  frozenSeed,
  sample: {
    seedStartInclusive: sampleStart,
    seedEndInclusive: sampleStart + sampleCount - 1,
    seedCount: sampleCount,
    meanReversalMatchingAssignments: totalReversalMatches / sampleCount,
    schedulesWithAtLeastTwoFullyMatchingReversalCues,
    meanCumulativeTargetHistoryMatchesToFinalReversalTruth: totalCumulativeMatches / sampleCount,
    schedulesWithAtLeastTwoCumulativeCues,
    schedulesAtLeastAsAlignedCumulativelyAsFrozenSeed,
    histogram,
  },
};
writeFileSync(new URL('./result.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
