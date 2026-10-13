// Independently replays records, schedule, equation and gates. No model/decoder imports.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' },
  prefix: { type: 'string' }, origin: { type: 'string' } } });
if (!args.run || !args.out || existsSync(args.out)) throw Error('Require completed --run and fresh --out');
const hash = value => createHash('sha256').update(value).digest('hex'), digest = v => hash(JSON.stringify(v));
const read = path => JSON.parse(readFileSync(path)), r = read(join(args.run, 'report.json')), p = r.protocol;
assert.equal(r.complete, true); assert.equal(p.schema, 'positive-channel-association-v1');
for (const [path, sha] of Object.entries({ ...r.identity.inputs, ...r.identity.sources })) assert.equal(hash(readFileSync(path)), sha);
const mapping = read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
assert.equal(r.identity.mappingHash, digest(mapping));
const expectedPopulations = Object.fromEntries(['PAM02', 'PPL103'].map(type => [type,
  mapping.groups.filter(g => g.danType === type).flatMap(g => g.dan)]));
assert.deepEqual(r.identity.populations, expectedPopulations);
const prior = read('research/reports/mbon-choice-v1-2026-10-06/report.json');
assert.equal(p.seeds.length, 6); assert.equal(new Set(p.seeds).size, 6);
assert.ok(p.seeds.every(seed => !prior.protocol.seeds.includes(seed)));
for (const key of ['encoder', 'steps', 'modelSeed', 'current', 'fen', 'actions', 'taskContext']) assert.deepEqual(p[key], prior.protocol[key]);
for (const key of Object.keys(p.memory)) assert.equal(p.memory[key], prior.protocol[key]);
const board = new Chess(p.fen), pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a, b) => a - b);
function projectedCue(seed, candidate) {
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === candidate);
  assert.ok(move); assert.equal(board.history().length, 0);
  const [,, castling, ep, halfmove] = board.fen().split(' ');
  const tokens = [`turn:${board.turn()}`, `castling:${castling}`, `ep:${ep}`, `halfmove:${halfmove}`,
    'repetition:1', `task:${p.taskContext.objective}:${p.taskContext.plies}`, `action:${candidate}`,
    `origin:${move.from}`, `destination:${move.to}`, `moving:${move.color}:${move.piece}`, `promotion:${move.promotion ?? '-'}`];
  for (const piece of board.board().flat().filter(Boolean)) {
    const token = `piece:${piece.color}:${piece.type}:${piece.square}`; tokens.push(token, `${token}|action:${candidate}`); }
  const bucket = (token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
  const cells = [...new Set(tokens.map(token => pool[bucket(token, pool.length)]))];
  cells.sort((a, b) => bucket(`budget:${a}`, 0x100000000) - bucket(`budget:${b}`, 0x100000000) || a - b);
  const selected = cells.slice(0, p.encoder.maxCells).sort((a, b) => a - b);
  return selected.map(index => ({ index, current: Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / selected.length) }));
}
const jobs = p.seeds.flatMap((seed, i) => p.conditions.map(condition => ({ seed, condition, initialPunished: i % 2 === 0 ? 'A' : 'B' })));
assert.deepEqual(r.identity.jobs, jobs); assert.equal(r.results.length, jobs.length);
function shuffle(rows, seed) { const values = [...rows]; let state = seed >>> 0;
  for (let i = values.length - 1; i > 0; i--) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state / 2 ** 32 * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; } return values; }
function score(probe) {
  for (const cue of ['A', 'B']) { const row = probe[cue];
    for (const type of ['MBON12', 'MBON01']) {
      assert.ok(row.cells[type].every(Number.isFinite));
      assert.equal(row.cells[type].length, r.identity.readouts[type].length);
      assert.equal(row[type], row.cells[type].reduce((a, b) => a + b, 0) / row.cells[type].length); }
    assert.equal(row.score, row.MBON12 - row.MBON01); }
  assert.equal(probe.M, probe.A.score - probe.B.score);
  assert.equal(probe.choice, probe.A.score >= probe.B.score ? 'A' : 'B');
}
let transitions = 0, localUpdates = 0;
for (let index = 0; index < jobs.length; index++) {
  const a = r.results[index], job = jobs[index]; assert.deepEqual(a.job, job); assert.equal(a.fixedStatePreserved, true);
  for (const cue of ['A', 'B']) assert.deepEqual(a.cues[cue], projectedCue(job.seed, p.actions[cue]));
  const order = job.seed % 2 ? ['A', 'B'] : ['B', 'A'];
  const schedule = ['acquisition', 'reversal'].flatMap((phase, phaseIndex) => {
    const count = phaseIndex === 0 ? p.acquisitionTrials : p.reversalTrials;
    const punished = phaseIndex === 0 ? job.initialPunished : job.initialPunished === 'A' ? 'B' : 'A';
    const adverse = Array.from({ length: count }, (_, i) => order[i % 2] === punished);
    const permuted = shuffle(adverse, (job.seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0);
    return adverse.map((isAdverse, i) => ({ phase, trial: i, cue: order[i % 2], punished,
      expectedChannel: isAdverse ? 'PPL103' : 'PAM02',
      deliveredChannel: job.condition === 'absent' ? null : job.condition === 'punishment-only' ? (isAdverse ? 'PPL103' : null)
        : job.condition === 'shuffled' ? (permuted[i] ? 'PPL103' : 'PAM02') : isAdverse ? 'PPL103' : 'PAM02' }));
  });
  assert.deepEqual(a.schedule, schedule); assert.equal(a.receiptRefs.length, schedule.length);
  let previous = null;
  for (let i = 0; i < schedule.length; i++) {
    const ref = a.receiptRefs[i], bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256);
    const t = JSON.parse(bytes), trial = schedule[i]; assert.deepEqual(t.job, job); assert.deepEqual(t.trial, trial);
    if (previous) assert.deepEqual(t.before, previous);
    else { assert.equal(t.before.events, 0); assert.ok(t.before.gains.every(g => g === 1)); }
    const channel = trial.deliveredChannel, cells = channel === null ? [] : expectedPopulations[channel];
    assert.equal(t.presentation.channel, channel); assert.deepEqual(t.presentation.reinforcementCells, cells);
    assert.deepEqual(t.presentation.stimulation, [...a.cues[trial.cue], ...cells.map(c => ({ index: c.index, current: p.current }))]);
    let expected = [...t.before.gains];
    if (job.condition !== 'disabled') {
      assert.equal(t.local.factors.length, mapping.groups.length); assert.deepEqual(t.update.factors, t.local.factors);
      assert.equal(t.local.kc.length, mapping.groups.reduce((n, g) => n + g.kc.length, 0));
      let offset = 0;
      for (let g = 0; g < mapping.groups.length; g++) {
        const D = t.local.factors[g]; assert.ok(Number.isFinite(D) && D <= 0 && -p.memory.eta * D <= 1);
        assert.equal(t.local.dan[g].length, mapping.groups[g].dan.length);
        assert.ok(t.local.dan[g].every(rate => Number.isFinite(rate) && rate >= 0));
        // JSON records -0 as 0; both represent absent excess modulation.
        assert.ok(D === -t.local.dan[g].reduce((sum, rate) => sum + rate, 0) / t.local.dan[g].length);
        for (let e = 0; e < mapping.groups[g].edges.length; e++, offset++) {
          const activity = t.local.kc[offset], gain = t.before.gains[offset];
          assert.ok(Number.isFinite(activity) && activity >= 0);
          expected[offset] = Math.max(p.memory.minGain, Math.min(p.memory.maxGain, gain + p.memory.eta * D * (activity + gain - 1)));
        }
      }
      localUpdates++;
    }
    assert.deepEqual(t.after.gains, expected); assert.equal(t.after.identity, t.before.identity);
    assert.equal(t.after.events, t.before.events + (job.condition === 'disabled' ? 0 : 1));
    assert.equal(t.update.events, t.after.events);
    assert.equal(t.update.changedEdges, expected.filter((v, k) => v !== t.before.gains[k]).length);
    previous = t.after; transitions++;
  }
  assert.deepEqual(a.memory, previous);
  for (const value of Object.values(a.probes)) score(value);
  assert.deepEqual(a.probes.baseline, a.probes.reset); assert.deepEqual(a.probes.reversal, a.probes.restored);
  assert.deepEqual(a.probes.acquisition, a.probes.persistence);
}
assert.equal(r.totalTrials, transitions);
const other = cue => cue === 'A' ? 'B' : 'A', margin = (probe, safe) => probe[safe].score - probe[other(safe)].score;
const bySeed = p.seeds.map(seed => {
  const rows = Object.fromEntries(r.results.filter(a => a.job.seed === seed).map(a => [a.job.condition, a]));
  const a = rows.informative, safe = other(a.job.initialPunished), reversedSafe = a.job.initialPunished;
  const acquisition = row => margin(row.probes.acquisition, safe) - margin(row.probes.baseline, safe);
  const reversal = row => margin(row.probes.reversal, reversedSafe) - margin(row.probes.acquisition, reversedSafe);
  const counts = row => Object.fromEntries(['acquisition', 'reversal'].map(phase => [phase, Object.fromEntries(['PAM02', 'PPL103'].map(channel =>
    [channel, row.schedule.filter(t => t.phase === phase && t.deliveredChannel === channel).length]))]));
  return { seed, acquisitionCorrect: a.probes.acquisition.choice === safe && margin(a.probes.acquisition, safe) > p.tolerance,
    reversalCorrect: a.probes.reversal.choice === reversedSafe && margin(a.probes.reversal, reversedSafe) > p.tolerance,
    rankingSwitch: a.probes.acquisition.M * a.probes.reversal.M < 0, acquisitionEffect: acquisition(a), reversalEffect: reversal(a),
    acquisitionAbsentAdvantage: acquisition(a) - acquisition(rows.absent), acquisitionShuffledAdvantage: acquisition(a) - acquisition(rows.shuffled),
    reversalAbsentAdvantage: reversal(a) - reversal(rows.absent), reversalShuffledAdvantage: reversal(a) - reversal(rows.shuffled),
    punishmentOnlyAcquisitionDifference: acquisition(a) - acquisition(rows['punishment-only']), punishmentOnlyReversalDifference: reversal(a) - reversal(rows['punishment-only']),
    persistenceExact: digest(a.probes.acquisition) === digest(a.probes.persistence),
    resetExact: Object.values(rows).every(v => digest(v.probes.reset) === digest(v.probes.baseline)),
    restoredExact: Object.values(rows).every(v => digest(v.probes.restored) === digest(v.probes.reversal)),
    disabledUnchanged: ['acquisition', 'reversal'].every(key => digest(rows.disabled.probes[key]) === digest(rows.disabled.probes.baseline)) && rows.disabled.memory.gains.every(g => g === 1),
    matchedPopulationCounts: digest(counts(a)) === digest(counts(rows.shuffled)), fixedStatePreserved: Object.values(rows).every(v => v.fixedStatePreserved) };
});
assert.deepEqual(r.summary.bySeed, bySeed);
const advantages = ['acquisitionAbsentAdvantage', 'acquisitionShuffledAdvantage', 'reversalAbsentAdvantage', 'reversalShuffledAdvantage'];
for (const key of advantages) { const values = bySeed.map(v => v[key]), n = values.filter(v => Math.abs(v) > p.tolerance).length,
  positives = values.filter(v => v > p.tolerance).length;
  let tail = 0, coefficient = 1;
  for (let k = 0; k <= n; k++) { if (k >= positives) tail += coefficient / 2 ** n; coefficient = coefficient * (n - k) / (k + 1); }
  assert.equal(r.summary.tests[key].p, tail);
}
const gates = { acquisition: bySeed.every(v => v.acquisitionCorrect && v.acquisitionEffect > p.tolerance),
  reversal: bySeed.every(v => v.reversalCorrect && v.rankingSwitch && v.reversalEffect > p.tolerance),
  informative: advantages.every(key => r.summary.tests[key].p < p.alpha),
  persistence: bySeed.every(v => v.persistenceExact && v.restoredExact), causalReset: bySeed.every(v => v.resetExact),
  controls: bySeed.every(v => v.disabledUnchanged && v.matchedPopulationCounts), fixedState: bySeed.every(v => v.fixedStatePreserved) };
assert.deepEqual(r.summary.gates, gates); assert.equal(r.summary.allBehavioralGatesPassed, Object.values(gates).every(Boolean));
let prefixExact = null;
if (args.prefix) {
  const strip = value => Array.isArray(value) ? value.map(strip) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'path' && key !== 'checkpoint').map(([k, v]) => [k, strip(v)])) : value;
  const checkpoints = directory => readdirSync(directory).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
  const targets = checkpoints(args.prefix).map(name => ({ hash: digest(strip(read(join(args.prefix, name, 'state.json')))), matched: false }));
  assert.ok(targets.length >= 2);
  for (const directory of [args.origin, args.run].filter(Boolean)) {
    for (const name of checkpoints(directory)) { const state = read(join(directory, name, 'state.json')); assert.deepEqual(state.identity, r.identity);
      const sha = digest(strip(state)); for (const t of targets) t.matched ||= t.hash === sha;
      if (targets.every(t => t.matched)) break; }
    if (targets.every(t => t.matched)) break;
  }
  prefixExact = targets.every(t => t.matched); assert.equal(prefixExact, true);
}
const audit = { passed: true, transitions, localUpdates, gates, prefixExact, reportSha256: hash(readFileSync(join(args.run, 'report.json'))),
  scope: 'Recorded local recurrence, dual-population stimulation, fixed schedules, gates and optional after-update exact checkpoint replay; not independent full-graph inference or biological validity' };
writeFileSync(args.out, JSON.stringify(audit, null, 2), { flag: 'wx' }); console.log(JSON.stringify(audit));
