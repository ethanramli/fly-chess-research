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
assert.equal(r.complete, true); assert.equal(p.schema, 'compartment-input-association-v1');
const variant = p.variants.find(v => v.id === r.identity.variant.id);
assert.deepEqual(r.identity.variant, variant);
for (const [path, sha] of Object.entries({ ...r.identity.inputs, ...r.identity.sources })) assert.equal(hash(readFileSync(path)), sha);
const mapping = read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
assert.equal(r.identity.mappingHash, digest(mapping));
const expectedPopulations = Object.fromEntries(['PAM02', 'PPL103'].map(type => [type,
  mapping.groups.filter(g => g.danType === type).flatMap(g => g.dan)]));
assert.deepEqual(r.identity.populations, expectedPopulations);
const v1Path = 'research/reports/positive-channel-association-resumed-2026-10-06/report.json', v1 = read(v1Path);
assert.equal(hash(readFileSync(v1Path)), '93176cbcb383a09e558d9619bd6d00108f64466355974325df9056f4364f7a66');
assert.equal(v1.summary.allBehavioralGatesPassed, false);
assert.ok(p.seeds.every(seed => !v1.protocol.seeds.includes(seed)));
for (const key of ['conditions', 'acquisitionTrials', 'reversalTrials', 'steps', 'modelSeed',
  'current', 'fen', 'actions', 'taskContext', 'memory', 'tolerance', 'alpha', 'acceptance', 'maxEvaluations'])
  assert.deepEqual(p[key], v1.protocol[key]);
assert.equal(p.control.schema, 'cue-valence-balanced-shuffle-v1'); assert.equal(p.control.maxAttempts, 128);
const prior = read('research/reports/mbon-choice-v1-2026-10-06/report.json');
assert.equal(p.seeds.length, 6); assert.equal(new Set(p.seeds).size, 6);
assert.ok(p.seeds.every(seed => !prior.protocol.seeds.includes(seed)));
for (const key of ['steps', 'modelSeed', 'current', 'fen', 'actions', 'taskContext']) assert.deepEqual(p[key], prior.protocol[key]);
assert.deepEqual(p.encoder, {maxCells:14,totalCurrent:21,maxCellCurrent:1.5,maxHistoryPlies:512});
const passedPath = 'research/reports/positive-channel-association-v2-2026-10-06/report.json';
const passed = read(passedPath), passedAudit = read('research/reports/positive-channel-association-v2-2026-10-06/audit-prefix.json');
assert.equal(hash(readFileSync(passedPath)), '910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb');
assert.equal(passed.summary.allBehavioralGatesPassed,true); assert.equal(passedAudit.passed,true); assert.equal(passedAudit.prefixExact,true);
assert.ok(p.seeds.every(seed => !passed.protocol.seeds.includes(seed)));
for (const key of Object.keys(p.memory)) assert.equal(p.memory[key], prior.protocol[key]);
const board = new Chess(p.fen), pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a, b) => a - b);
function projectedCue(seed, candidate) {
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === candidate);
  assert.ok(move); assert.equal(board.history().length, 0);
  const [,, castling, ep, halfmove] = board.fen().split(' ');
  const xy = square => [square.charCodeAt(0)-97,Number(square[1])-1];
  const [fx,fy] = xy(move.from), [tx,ty] = xy(move.to), direction = board.turn() === 'w' ? 1 : -1;
  const relativeRights = board.turn() === 'w' ? castling : castling.replace(/[KQkq]/g,c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rights = castling === '-' ? '-' : 'KQkq'.split('').filter(c => relativeRights.includes(c)).join('');
  const inventory = mirror => {
    const action = `${move.piece}:${mirror*(tx-fx)},${direction*(ty-fy)}:${move.promotion??'-'}`;
    const values = [`action:${action}`,`capture:${move.captured??'-'}`,`castle:${rights}`,
      `halfmove:${halfmove}`,'repetition:1',`task:${p.taskContext.objective}:${p.taskContext.plies}`];
    for (const [label,sx,sy] of [['origin',fx,fy],['target',tx,ty]]) {
      const x = mirror === 1 ? sx : 7-sx, y = direction === 1 ? sy : 7-sy;
      values.push(`${label}-walls:${x},${7-x},${y},${7-y}`);
    }
    if (ep === '-') values.push('ep:-'); else { const [ex,ey]=xy(ep); values.push(`ep-from-target:${mirror*(ex-tx)},${direction*(ey-ty)}`); }
    for (const piece of board.board().flat().filter(Boolean)) {
      const [px,py]=xy(piece.square), role=piece.color===board.turn()?'self':'opponent';
      values.push(`around-target:${move.piece}:${role}:${piece.type}:${mirror*(px-tx)},${direction*(py-ty)}`);
      values.push(`around-origin:${action}:${role}:${piece.type}:${mirror*(px-fx)},${direction*(py-fy)}`);
    }
    return values.sort();
  };
  let tokens = inventory(1); const reflected = castling === '-' ? inventory(-1) : null;
  if (reflected && JSON.stringify(reflected)<JSON.stringify(tokens)) tokens=reflected;
  if (variant.conjoin) { const action=tokens.find(t=>t.startsWith('action:')); tokens=tokens.map(token=>`joint:${JSON.stringify([action,token])}`).sort(); }
  const bucket = (token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
  const selected=[];
  for (const group of variant.stratify ? ['PAM02','PPL103'] : ['pooled']) {
    const eligible = group === 'pooled' ? pool : [...new Set(mapping.groups.filter(g=>g.danType===group).flatMap(g=>g.kc))].sort((a,b)=>a-b);
    const cells=[...new Set(tokens.map(token=>eligible[bucket(group==='pooled'?token:`${group}:${token}`,eligible.length)]))];
    cells.sort((a,b)=>bucket(`budget:${a}`,2**32)-bucket(`budget:${b}`,2**32)||a-b);
    selected.push(...cells.filter(cell=>!selected.includes(cell)).slice(0,variant.stratify?7:14));
  }
  selected.sort((a,b)=>a-b); assert.equal(selected.length,14);
  return selected.map(index => ({ index, current: Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / selected.length) }));
}
const jobs = p.seeds.flatMap((seed, i) => p.conditions.map(condition => ({ seed, condition, initialPunished: i % 2 === 0 ? 'A' : 'B' })));
assert.deepEqual(r.identity.jobs, jobs); assert.equal(r.results.length, jobs.length);
function balancedShuffle(rows, cues, seed) {
  let state = seed >>> 0;
  for (let attempts = 1; attempts <= p.control.maxAttempts; attempts++) {
    const values = [...rows];
    for (let i = values.length - 1; i > 0; i--) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = Math.floor(state / 2 ** 32 * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    const balanced = ['A', 'B'].every(cue => [true, false].every(value =>
      values.filter((v, i) => cues[i] === cue && v === value).length === values.length / 4));
    if (balanced) return { values, attempts };
  }
  throw Error('Independent balanced-shuffle reconstruction exhausted budget');
}
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
  const diagnostics = [];
  const schedule = ['acquisition', 'reversal'].flatMap((phase, phaseIndex) => {
    const count = phaseIndex === 0 ? p.acquisitionTrials : p.reversalTrials;
    const punished = phaseIndex === 0 ? job.initialPunished : job.initialPunished === 'A' ? 'B' : 'A';
    const adverse = Array.from({ length: count }, (_, i) => order[i % 2] === punished);
    const permutation = job.condition === 'shuffled'
      ? balancedShuffle(adverse, adverse.map((_, i) => order[i % 2]), (job.seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0)
      : { values: adverse, attempts: 0 };
    const permuted = permutation.values;
    diagnostics.push(job.condition === 'shuffled' ? { phase, attempts: permutation.attempts,
      totalPerChannel: count / 2, perCuePerChannel: count / 4,
      meaning: 'Conditioned Fisher-Yates permutation with equal cue/valence counts; not unconstrained shuffle or biological omission' }
      : { phase, attempts: 0 });
    return adverse.map((isAdverse, i) => ({ phase, trial: i, cue: order[i % 2], punished,
      expectedChannel: isAdverse ? 'PPL103' : 'PAM02',
      deliveredChannel: job.condition === 'absent' ? null : job.condition === 'punishment-only' ? (isAdverse ? 'PPL103' : null)
        : job.condition === 'shuffled' ? (permuted[i] ? 'PPL103' : 'PAM02') : isAdverse ? 'PPL103' : 'PAM02' }));
  });
  assert.deepEqual(a.controlDiagnostics, diagnostics);
  assert.deepEqual(a.schedule, schedule); assert.equal(a.receiptRefs.length, schedule.length);
  if (job.condition === 'shuffled') for (const phase of ['acquisition', 'reversal']) {
    const rows = schedule.filter(t => t.phase === phase);
    assert.notDeepEqual(rows.map(t => t.deliveredChannel), rows.map(t => t.expectedChannel));
    for (const cue of ['A', 'B']) for (const channel of ['PAM02', 'PPL103'])
      assert.equal(rows.filter(t => t.cue === cue && t.deliveredChannel === channel).length, rows.length / 4);
  }
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
