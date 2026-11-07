// Offline audit only: no learner imports, neural propagation, allocation export, or state writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const BASE = 'runs/memory-retention-2026-11-01';
const RUN = `${BASE}/eye-graph-memory-cubic-v1-recovery1`;
const DIAG = `${BASE}/synaptic-conflict-v1`, OFFSET = `${BASE}/readout-offset-v1`;
const REPORT = 'research/reports/memory-interference-diagnosis-2026-11-01';
const AUDIT = 'research/reports/memory-retention-continuation-2026-11-01/cubic-v1-recovery1-audit.json';
const OUT = process.argv[2] ?? `${REPORT}/diagnostic-audit.json`;
assert(!existsSync(OUT), 'Refuse to replace an existing audit; choose a fresh output path');
const started = performance.now(), pins = {}, phases = ['T0', 'T1', 'T2', 'T3', 'Delay', 'Rev'];
const kinds = ['shared', 'oldOnly', 'notOldActive'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => { const b = readFileSync(path); pins[path] = sha(b); return b; };
const json = path => JSON.parse(read(path));
const lines = path => read(path).toString().trim().split('\n').map(JSON.parse);
const guard = () => assert(performance.now() - started < 300000 && process.memoryUsage().rss < 2048 * 2 ** 20, 'Offline resource bound');
const near = (a, b, why = 'Arithmetic mismatch') => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-10, why);
const hash = state => {
  const h = createHash('sha256');
  for (const field of ['gains', 'traces', 'states']) h.update(Buffer.from(Float64Array.from(state[field]).buffer));
  return h.update(JSON.stringify([state.time, state.pulses])).digest('hex');
};
const med = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const rngFor = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Independently evaluate the declared local transition law using only recorded activity.
function advance(s, cfg, mapping, f) {
  assert.equal(hash(s), f.before);
  const rates = new Map(f.ks), allowed = new Set(mapping.groups.flatMap(g => g.kc));
  assert.equal(rates.size, f.ks.length);
  for (const [cell, rate] of rates) assert(allowed.has(cell) && rate > cfg.theta && rate <= 1);
  assert(f.dt > 0 && Number.isFinite(f.dt));
  assert.equal(f.ds.length, mapping.groups.length);
  let i = 0, pulsed = false;
  for (let g = 0; g < mapping.groups.length; g++) {
    const up = f.ds[g].deficit, down = f.ds[g].excess, drive = down + up;
    assert([up, down].every(x => Number.isFinite(x) && x >= 0));
    pulsed ||= drive > 0;
    for (const cell of mapping.groups[g].kc) {
      const target = Math.min(1, Math.max(0, ((rates.get(cell) ?? 0) - cfg.theta) / (1 - cfg.theta)));
      const trace = target + (s.traces[i] - target) * Math.exp(-f.dt / cfg.tauE);
      s.traces[i] = trace;
      if (drive !== 0 && trace !== 0) {
        const exposure = trace * cfg.eta * drive * f.dt;
        const entry = -Math.expm1(-exposure), exit = -Math.expm1(-exposure * (drive / .25) ** 2);
        const pd = entry * down / drive, pu = entry * up / drive, xd = exit * down / drive, xu = exit * up / drive;
        const q = i * 4, [a, b, c, d] = s.states.slice(q, q + 4);
        const next = [(1 - entry) * a + xd * b, (1 - xd) * b + pu * (a + c), (1 - entry) * c + xu * d, (1 - xu) * d + pd * (c + a)];
        const total = next.reduce((x, y) => x + y, 0);
        assert(Math.abs(total - 1) <= 1e-12 && next.every(v => v >= 0 && Number.isFinite(v)));
        for (let j = 0; j < 4; j++) s.states[q + j] = next[j] / total;
        s.gains[i] = cfg.minGain + (cfg.maxGain - cfg.minGain) * (s.states[q] + s.states[q + 1]);
      }
      i++;
    }
  }
  s.time += f.dt; s.pulses += Number(pulsed);
  assert.equal(hash(s), f.after);
}
function validState(s, n, cfg) {
  assert.equal(s.gains.length, n); assert.equal(s.traces.length, n); assert.equal(s.states.length, 4 * n);
  for (let i = 0; i < n; i++) {
    assert(s.gains[i] >= cfg.minGain && s.gains[i] <= cfg.maxGain);
    assert(s.traces[i] >= 0 && s.traces[i] <= 1);
    const p = s.states.slice(4 * i, 4 * i + 4);
    assert(p.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    assert(Math.abs(p.reduce((x, y) => x + y, 0) - 1) <= 1e-12);
    assert(Math.abs(s.gains[i] - cfg.minGain - (cfg.maxGain - cfg.minGain) * (p[0] + p[1])) <= 1e-13);
  }
}
function movement(a, b) {
  return Object.fromEntries(['gains', 'traces', 'states'].map(field => {
    let changed = 0, aboveTolerance = 0, l1 = 0, maxAbs = 0;
    for (let i = 0; i < a[field].length; i++) {
      const d = Math.abs(b[field][i] - a[field][i]);
      changed += Number(d !== 0); aboveTolerance += Number(d > 1e-12); l1 += d; maxAbs = Math.max(maxAbs, d);
    }
    return [field, { changed, aboveTolerance, l1, maxAbs }];
  }));
}
async function verifyPins(m) {
  for (const [p, expected] of Object.entries(m.pins ?? {})) {
    guard();
    if (!(p in pins)) {
      const h = createHash('sha256');
      for await (const chunk of createReadStream(p)) h.update(chunk);
      pins[p] = h.digest('hex');
    }
    assert.equal(pins[p], expected, `Input/source pin: ${p}`);
  }
}
// A tiny self-check catches broken hash ordering and a no-drive transition.
const fixture = { gains: [1], traces: [0], states: [1, 0, 0, 0], time: 0, pulses: 0 };
const fixtureAfter = { ...structuredClone(fixture), time: 1 };
advance(fixture, { theta: .2, tauE: .5 }, { groups: [{ kc: [7] }] }, { before: hash(fixture), after: hash(fixtureAfter), dt: 1, ks: [], ds: [{ excess: 0, deficit: 0 }] });

const manifest = json(`${DIAG}/manifest.json`), result = json(`${DIAG}/result.json`);
const offsetManifest = json(`${OFFSET}/manifest.json`), offset = json(`${OFFSET}/result.json`);
const sourceManifest = json(`${RUN}/manifest.json`), sourceAudit = json(AUDIT), summary = json(`${RUN}/summary.json`), records = lines(`${RUN}/records.jsonl`);
for (const m of [manifest, offsetManifest, sourceManifest]) { assert.equal(m.status, 'complete'); await verifyPins(m); }
assert.equal(sourceAudit.status, 'audit-passed');
assert.equal(sourceAudit.sources.records, pins[`${RUN}/records.jsonl`]); assert.equal(sourceAudit.sources.summary, pins[`${RUN}/summary.json`]);
assert.equal(sourceManifest.summary, pins[`${RUN}/summary.json`]);
assert.equal(offsetManifest.sourceManifest, pins[`${RUN}/manifest.json`]);
assert.equal(offsetManifest.sourceAudit.sha256, pins[AUDIT]);
for (const [m, dir, receipts] of [[manifest, DIAG, { graphSha256: 'graph-observations.jsonl', updatesSha256: 'update-observations.jsonl' }], [offsetManifest, OFFSET, { observationsSha256: 'observations.jsonl' }]]) {
  assert.equal(m.resultSha256, pins[`${dir}/result.json`]);
  for (const [key, name] of Object.entries(receipts)) { read(`${dir}/${name}`); assert.equal(m[key], pins[`${dir}/${name}`]); }
}
assert.deepEqual(summary.seeds, [4101, 4102, 4103, 4104, 4105, 4106]); assert.equal(records.length, 24);
assert.equal(new Set(records.map(r => `${r.seed}/${r.arm}`)).size, 24);
for (const arm of ['informative', 'absent', 'shuffled', 'disabled']) assert.deepEqual(records.filter(r => r.arm === arm).map(r => r.seed), summary.seeds);

const primaryLines = lines(`${RUN}/frames-4102-informative.jsonl`), header = primaryLines[0];
const old = new Set(), reversal = new Set();
for (const r of primaryLines.filter(r => r.kind === 'frame')) {
  for (const [cell, rate] of r.ks) {
    assert(rate > header.config.theta);
    if (r.context.phase === 'B3' && r.context.step === 'choice' && r.dt === 1) old.add(cell);
    if (r.context.phase === 'REV') reversal.add(cell);
  }
}
const categories = [], cells = [], categoryByGroup = [], edgeGroup = [];
for (const [groupIndex, g] of header.mapping.groups.entries()) {
  assert.equal(g.kc.length, g.edges.length);
  const counts = Object.fromEntries(kinds.map(k => [k, 0]));
  for (const cell of g.kc) {
    const kind = !old.has(cell) ? 'notOldActive' : reversal.has(cell) ? 'shared' : 'oldOnly';
    categories.push(kind); cells.push(cell); edgeGroup.push(groupIndex); counts[kind]++;
  }
  categoryByGroup.push({ mbonType: g.mbonType, danType: g.danType, danCells: g.dan.length, edges: g.kc.length, counts });
}
const counts = Object.fromEntries(kinds.map(k => [k, categories.filter(c => c === k).length]));
assert.deepEqual(counts, result.primary.countByCategory);
assert.equal(old.size, result.primary.oldActiveKcs); assert.equal(reversal.size, result.primary.reversalActiveKcs);
assert.equal(categories.length, 4654);
const snapshots = new Map(), allOutcomes = [];
for (const r of records) {
  const saved = {};
  for (const p of phases) {
    const x = json(`${RUN}/snapshot-${r.seed}-${r.arm}-${p}.json`);
    assert.deepEqual([x.seed, x.arm, x.phase], [r.seed, r.arm, p]);
    assert.equal(hash(x.snapshot), x.localHash); validState(x.snapshot, 4654, header.config);
    assert.deepEqual(x.tests, r.tests[p]);
    for (const t of x.tests) assert.equal(t.greedy, t.mNorm > 0);
    saved[p] = x.snapshot; snapshots.set(`${r.seed}/${r.arm}/${p}`, x);
  }
  const expected = { seed: r.seed, arm: r.arm, items: Array.from({ length: 4 }, (_, item) => ({ item, acquisition: r.tests[`T${item}`][item].mNorm, phases: Object.fromEntries(phases.map(p => [p, r.tests[p][item].mNorm])) })), transitions: phases.slice(1).map((p, i) => ({ from: phases[i], to: p, ...movement(saved[phases[i]], saved[p]) })) };
  assert.deepEqual(result.allItems.find(x => x.seed === r.seed && x.arm === r.arm), expected);
  allOutcomes.push({ ...expected, delayCorrect: r.tests.Delay.map(x => x.greedy), postReversalCorrect: r.tests.Rev.map(x => x.greedy), delayLossItems: r.tests.Delay.flatMap((x, j) => r.tests.T3[j].greedy && !x.greedy ? [j] : []), postReversalLossOldItems: r.tests.Rev.flatMap((x, j) => j > 0 && r.tests.Delay[j].greedy && !x.greedy ? [j] : []) });
}
assert.equal(result.allItems.length, 24);

const primarySaved = p => snapshots.get(`4102/informative/${p}`).snapshot;
const oldDelta = primarySaved('T3').gains.map((x, i) => x - primarySaved('T2').gains[i]);
const metrics = {}, frameMetrics = [], updates = lines(`${DIAG}/update-observations.jsonl`), replays = [];
for (const name of readdirSync(RUN).filter(x => /^frames-.*\.jsonl$/.test(x)).sort()) {
  guard(); const file = `${RUN}/${name}`, source = lines(file), h = source[0], state = structuredClone(h.initial), tests = {};
  const record = records.find(r => r.seed === h.seed && r.arm === h.arm); assert(record);
  assert.equal(hash(state), h.localHash); assert.equal(h.identity, state.identity);
  const rng = rngFor((h.seed ^ { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 }[h.arm]) >>> 0);
  let frames = 0, trials = 0, lastTrial = null, ended = false, restored = false;
  const valences = {};
  for (const r of source.slice(1)) {
    guard(); assert(!ended);
    if (r.kind === 'frame') {
      assert.notEqual(h.arm, 'disabled'); assert.equal(r.frame, frames++);
      const primary = name === 'frames-4102-informative.jsonl' && r.context.phase === 'REV';
      const bg = primary ? [...state.gains] : null, bs = primary ? [...state.states] : null;
      advance(state, h.config, h.mapping, r);
      if (primary) {
        const teacher = r.context.step === 'feedback' && lastTrial?.context.trial === r.context.trial ? lastTrial.valence : null;
        const unknown = lastTrial?.context.trial === r.context.trial && lastTrial.unknown;
        const stage = r.dt === 4 && r.ks.length === 0 ? 'gap' : teacher ? 'teacher' : r.context.step === 'feedback' && unknown ? 'unknownExposure' : 'presentation';
        const bins = metrics[stage] ??= Object.fromEntries(kinds.map(k => [k, { frames: 0, activeEdgeFrames: 0, eligibleEdgeFrames: 0, eligibleAboveTolerance: 0, changedEdgeFrames: 0, changedAboveTolerance: 0, oppositeToOldLearning: 0, gainL1: 0, stateL1: 0, eligibilitySum: 0 }]));
        const perFrame = Object.fromEntries(kinds.map(k => [k, { active: 0, eligibleExact: 0, eligibleAboveTolerance: 0, gainChangedExact: 0, gainChangedAboveTolerance: 0, gainL1: 0, stateL1: 0 }]));
        const active = new Map(r.ks);
        for (const b of Object.values(bins)) b.frames++;
        for (let i = 0; i < categories.length; i++) {
          const m = bins[categories[i]], pf = perFrame[categories[i]], d = state.gains[i] - bg[i];
          m.activeEdgeFrames += (active.get(cells[i]) ?? 0) > h.config.theta;
          m.eligibleEdgeFrames += state.traces[i] > 0; m.eligibleAboveTolerance += state.traces[i] > 1e-12;
          m.changedEdgeFrames += d !== 0; m.changedAboveTolerance += Math.abs(d) > 1e-12;
          m.oppositeToOldLearning += Math.abs(d) > 1e-12 && d * oldDelta[i] < 0;
          m.gainL1 += Math.abs(d); m.eligibilitySum += state.traces[i];
          pf.active += (active.get(cells[i]) ?? 0) > h.config.theta; pf.eligibleExact += state.traces[i] > 0; pf.eligibleAboveTolerance += state.traces[i] > 1e-12;
          pf.gainChangedExact += d !== 0; pf.gainChangedAboveTolerance += Math.abs(d) > 1e-12; pf.gainL1 += Math.abs(d);
          for (let q = 0; q < 4; q++) { const delta = Math.abs(state.states[4 * i + q] - bs[4 * i + q]); m.stateL1 += delta; pf.stateL1 += delta; }
        }
        const ordinal = frameMetrics.length;
        assert.deepEqual(updates[ordinal], { ordinal, frame: r.frame, stage, context: r.context, teacher, unknown, dt: r.dt, dan: r.ds, before: r.before, after: r.after });
        frameMetrics.push({ ordinal, frame: r.frame, stage, teacher, unknown, dt: r.dt, dan: r.ds, categories: perFrame });
      }
    } else if (r.kind === 'trial') {
      trials++; assert.equal(r.context.trial, trials); assert.equal(r.unknown, trials % 8 === 0);
      assert.equal(r.good, r.context.phase === 'REV' ? 1 : 0);
      assert.equal(r.choice, rng() < 1 / (1 + Math.exp((r.scores[1] - r.scores[0]) / .1)) ? 0 : 1);
      const c = r.certificate, item = h.items[r.context.item];
      assert.equal(c.criterion, 'assigned-action-association-v1'); assert.equal(c.fen, item.fen); assert.deepEqual(c.moves, item.moves);
      assert.equal(c.chosenMove, item.moves[r.choice]); assert.equal(c.goodMove, item.moves[r.good]); assert.equal(c.known, !r.unknown);
      if (r.unknown || ['absent', 'disabled'].includes(h.arm)) assert.equal(r.valence, null);
      else if (h.arm === 'informative') assert.equal(r.valence, r.choice === r.good ? 'reward' : 'punish');
      else assert(['reward', 'punish'].includes(r.valence));
      const scale = r.valence ? Math.max(0, Math.min(1, (1.2 - (r.valence === 'reward' ? 1 : -1) * r.now) / 2.4)) : 0;
      assert.equal(r.scale, scale); assert.equal(r.level, .75 + (r.valence === 'reward' ? .75 : r.valence === 'punish' ? -.75 : 0) * scale);
      if (r.valence) (valences[r.context.phase] ??= []).push(r.valence);
      lastTrial = r;
    } else if (r.kind === 'test') {
      assert.equal(r.localHash, hash(state)); tests[r.name] = r.results;
      const suffix = name.slice(7, -6), saved = json(`${RUN}/snapshot-${suffix}-${r.name}.json`);
      assert.deepEqual(saved.snapshot, state); assert.deepEqual(saved.tests, r.results);
    } else if (r.kind === 'fresh-restore') { assert.equal(r.before, hash(state)); assert.equal(r.after, r.before); restored = true; }
    else if (r.kind === 'end') { assert.equal(r.frames, frames); assert.equal(r.finalState, hash(state)); ended = true; }
    else assert.fail(`Unrecognized receipt ${r.kind}`);
  }
  assert(ended); assert.equal(trials, 120); assert.deepEqual(tests, record.tests); assert.equal(hash(state), record.finalLocalState); assert.equal(frames, record.frames);
  replays.push({ file, seed: h.seed, arm: h.arm, frames, trials, restored, finalState: hash(state), valences });
}
assert.equal(replays.length, 25); assert.equal(replays.filter(r => r.restored).length, 1);
assert.equal(frameMetrics.length, 168); assert.equal(updates.length, 168); assert.deepEqual(metrics, result.primary.metrics);
for (const seed of summary.seeds) {
  const inf = records.find(r => r.seed === seed && r.arm === 'informative'), shuffled = replays.find(r => r.seed === seed && r.arm === 'shuffled');
  for (const [phase, values] of Object.entries(inf.realized)) {
    const expected = [...values], rng = rngFor((seed ^ 0x77 ^ Number(phase === 'REV' ? 4 : phase.slice(1))) >>> 0);
    for (let i = expected.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [expected[i], expected[j]] = [expected[j], expected[i]]; }
    assert.deepEqual(shuffled.valences[phase], expected);
  }
}

// Recompute the original pooled gates, preserving the absentUnchanged omission in R5.
const group = arm => records.filter(r => r.arm === arm), informative = group('informative');
const frac = (r, p, js) => js.filter(j => r.tests[p][j].mNorm > 0).length / js.length;
const ratio = (a, b) => b > 0 ? a / b : 0, all = [0, 1, 2, 3];
const own = all.map(j => ({ m: med(informative.map(r => r.tests[`T${j}`][j].mNorm)), g: informative.filter(r => r.tests[`T${j}`][j].mNorm > 0).length / 6 }));
const r2 = { share: med(informative.map(r => frac(r, 'T3', [0, 1]))), ratio: med(informative.map(r => med([0, 1].map(j => ratio(r.tests.T3[j].mNorm, r.tests[`T${j}`][j].mNorm))))) };
const r3 = { item: med(informative.map(r => r.tests.Rev[0].mNorm)), greedy: informative.filter(r => r.tests.Rev[0].mNorm > 0).length / 6, others: med(informative.map(r => med([1, 2, 3].map(j => ratio(r.tests.Rev[j].mNorm, r.tests.Delay[j].mNorm))))) };
const r4 = { share: med(informative.map(r => frac(r, 'Delay', all))), ratio: med(informative.map(r => med(all.map(j => ratio(r.tests.Delay[j].mNorm, r.tests.T3[j].mNorm))))) };
const r5 = { disabledUnchanged: group('disabled').every(r => r.gainsBefore === r.initialGains), absentUnchanged: group('absent').every(r => r.gainsBefore === r.initialGains), shuffled: med(group('shuffled').map(r => frac(r, 'T3', all))), informative: med(informative.map(r => frac(r, 'T3', all))), absentShare: med(group('absent').map(r => frac(r, 'T3', all))) };
const marks = { R1: { pass: own.every(x => x.m >= .2 && x.g >= .9), observed: own }, R2: { pass: r2.share >= .9 && r2.ratio >= .5, observed: r2 }, R3: { pass: r3.item >= .15 && r3.greedy >= .9 && r3.others >= .8, observed: r3 }, R4: { pass: r4.share >= .9 && r4.ratio >= .7, observed: r4 }, R5: { pass: r5.disabledUnchanged && r5.shuffled < .75 && r5.informative >= r5.shuffled + .25, observed: r5 } };
assert.deepEqual(marks, summary.marks); assert.deepEqual(marks, sourceAudit.marks);

function checkMeasurements(receipts, conditions, stateHashFor, expectedRest) {
  assert.equal(receipts.length, conditions.length * 9);
  const rawByCondition = {};
  for (const [ci, condition] of conditions.entries()) {
    const batch = receipts.slice(ci * 9, ci * 9 + 9), rest = batch[0].raw;
    assert.equal(batch[0].item, null); assert.equal(batch[0].candidate, null);
    const raw = Array.from({ length: 4 }, () => []);
    for (const [k, row] of batch.entries()) {
      assert.equal(row.pass, ci * 9 + k + 1); assert.equal(row.condition ?? row.phase, condition); assert(Number.isFinite(row.raw));
      assert.equal(row.memoryHash, stateHashFor(condition));
      if (k > 0) { assert.equal(row.item, Math.floor((k - 1) / 2)); assert.equal(row.candidate, (k - 1) % 2); raw[row.item][row.candidate] = row.raw; }
    }
    rawByCondition[condition] = { rest, raw };
  }
  assert.equal(rawByCondition.naive.rest, expectedRest);
  return rawByCondition;
}
const hybridHashes = {}, hybridState = kind => {
  const s = structuredClone(primarySaved('Rev')), delay = primarySaved('Delay');
  for (let i = 0; i < categories.length; i++) if (categories[i] === kind) {
    s.gains[i] = delay.gains[i]; s.traces[i] = delay.traces[i];
    for (let k = 0; k < 4; k++) s.states[4 * i + k] = delay.states[4 * i + k];
  }
  validState(s, 4654, header.config); return s;
};
for (const kind of kinds) hybridHashes[`restore-${kind}`] = hash(hybridState(kind));
const stateHashFor = name => name === 'naive' ? header.localHash : hybridHashes[name] ?? hash(primarySaved(name));
const graph = checkMeasurements(lines(`${DIAG}/graph-observations.jsonl`), ['naive', 'Delay', 'Rev', ...kinds.map(k => `restore-${k}`)], stateHashFor, result.primary.originalRest);
const previous = checkMeasurements(lines(`${OFFSET}/observations.jsonl`), ['naive', 'Delay', 'Rev'], stateHashFor, offset.originalRest);
assert.equal(result.passes, 54); assert.equal(offset.passes, 27); assert.equal(result.teachingEvents, 0); assert.equal(result.learnerUpdates, 0);
const scores = [];
for (const [condition, observed] of Object.entries(graph)) {
  if (condition === 'naive') continue;
  const saved = result.primary.conditions[condition]; assert(saved.memoryUnchanged && saved.parametersUnchanged);
  assert.equal(saved.memoryHash, stateHashFor(condition)); assert.equal(saved.currentRest, observed.rest);
  for (let j = 0; j < 4; j++) {
    const good = condition !== 'Delay' && j === 0 ? 1 : 0, bad = 1 - good;
    const naive = graph.naive.raw[j].map(v => v - graph.naive.rest), raw = observed.raw[j];
    assert(naive.every(v => v > 0)); assert.deepEqual(saved.items[j].raw, raw); assert.deepEqual(saved.items[j].naive, naive);
    const margin = rest => ((raw[bad] - rest) / naive[bad] - (raw[good] - rest) / naive[good]) / 2;
    const originalMargin = margin(graph.naive.rest), currentRestMargin = margin(observed.rest);
    const component = .5 * (observed.rest - graph.naive.rest) * (1 / naive[bad] - 1 / naive[good]);
    near(saved.items[j].originalMargin, originalMargin); near(saved.items[j].currentRestMargin, currentRestMargin); near(saved.items[j].commonOffsetComponent, component);
    near(originalMargin - currentRestMargin, component);
    assert.equal(saved.items[j].originalCorrect, originalMargin > 0); assert.equal(saved.items[j].currentRestCorrect, currentRestMargin > 0);
    if (previous[condition]) {
      near(observed.rest, previous[condition].rest); raw.forEach((v, k) => near(v, previous[condition].raw[j][k]));
      const p = offset.phases[condition]; assert(p.parametersUnchanged); assert.equal(p.memoryHashBefore, p.memoryHashAfter); assert.equal(p.memoryHashBefore, stateHashFor(condition));
      near(originalMargin, p.items[j].originalMargin); near(currentRestMargin, p.items[j].currentRestMargin); near(originalMargin, snapshots.get(`4102/informative/${condition}`).tests[j].mNorm);
    }
    scores.push({ condition, item: j, originalMargin, currentRestMargin, originalCorrect: originalMargin > 0, currentRestCorrect: currentRestMargin > 0 });
  }
}
assert.deepEqual(Object.keys(result.primary.conditions), ['Delay', 'Rev', ...kinds.map(k => `restore-${k}`)]);

// Static ZIP member reading; this never instantiates or runs the neural graph.
function npzMembers(path, wanted) {
  const archive = readFileSync(path), end = archive.lastIndexOf(Buffer.from([80, 75, 5, 6]));
  assert(end >= 0); let pos = archive.readUInt32LE(end + 16); const out = {};
  for (let n = 0; n < archive.readUInt16LE(end + 10); n++) {
    assert.equal(archive.readUInt32LE(pos), 0x02014b50);
    const length = archive.readUInt16LE(pos + 28), name = archive.toString('utf8', pos + 46, pos + 46 + length).replace(/\.npy$/, '');
    const local = archive.readUInt32LE(pos + 42), method = archive.readUInt16LE(pos + 10), packedSize = archive.readUInt32LE(pos + 20);
    pos += 46 + length + archive.readUInt16LE(pos + 30) + archive.readUInt16LE(pos + 32);
    if (!wanted.includes(name)) continue;
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28), packed = archive.subarray(start, start + packedSize);
    const b = method === 0 ? packed : inflateRawSync(packed); assert.equal(b.toString('latin1', 0, 6), '\x93NUMPY');
    const headerStart = b[6] === 1 ? 10 : 12, headerLength = b[6] === 1 ? b.readUInt16LE(8) : b.readUInt32LE(8);
    out[name] = b.subarray(headerStart + headerLength);
  }
  for (const name of wanted) assert(out[name]); return out;
}
const arrays = npzMembers('.cache/full.npz', ['root_ids', 'csr_indptr', 'csr_indices', 'sign']);
const roots = Array.from({ length: arrays.root_ids.length / 8 }, (_, i) => arrays.root_ids.readBigInt64LE(8 * i).toString());
const indexByRoot = new Map(roots.map((r, i) => [r, i])), annotations = new Map();
const tsv = read('.cache/flywire-annotations-v2.1.0.tsv').toString().trim().split('\n'), fields = tsv.shift().trim().split('\t');
for (const line of tsv) {
  const values = line.trimEnd().split('\t'), root = values[fields.indexOf('root_id')], index = indexByRoot.get(root);
  if (index !== undefined) annotations.set(index, Object.fromEntries(['cell_class', 'cell_sub_class', 'cell_type', 'hemibrain_type', 'side'].map(k => [k, values[fields.indexOf(k)] ?? ''])));
}
const subtypeByGroup = [];
for (let gi = 0; gi < header.mapping.groups.length; gi++) {
  const bins = {};
  for (let i = 0; i < categories.length; i++) if (edgeGroup[i] === gi) {
    const annotation = annotations.get(cells[i]); assert(annotation && annotation.cell_class === 'Kenyon_Cell');
    const type = annotation.hemibrain_type || annotation.cell_type || '(untyped)';
    const row = bins[type] ??= Object.fromEntries(kinds.map(k => [k, 0])); row[categories[i]]++;
  }
  subtypeByGroup.push({ mbonType: header.mapping.groups[gi].mbonType, danType: header.mapping.groups[gi].danType, subtypes: bins });
}
const sharedCells = new Set(cells.filter((_, i) => categories[i] === 'shared'));
const contacts = { sharedKcCells: sharedCells.size, kcToShared: 0, sharedToKc: 0, sharedToShared: 0, aplToShared: 0, sharedToApl: 0, positive: 0, negative: 0 };
for (let post = 0; post < roots.length; post++) {
  const from = arrays.csr_indptr.readInt32LE(post * 4), to = arrays.csr_indptr.readInt32LE((post + 1) * 4);
  for (let e = from; e < to; e++) {
    const pre = arrays.csr_indices.readInt32LE(e * 4); if (!sharedCells.has(pre) && !sharedCells.has(post)) continue;
    const a = annotations.get(pre), b = annotations.get(post), preKc = a?.cell_class === 'Kenyon_Cell', postKc = b?.cell_class === 'Kenyon_Cell';
    const preApl = /APL/.test(`${a?.hemibrain_type} ${a?.cell_type}`), postApl = /APL/.test(`${b?.hemibrain_type} ${b?.cell_type}`);
    if (preKc && sharedCells.has(post)) contacts.kcToShared++;
    if (sharedCells.has(pre) && postKc) contacts.sharedToKc++;
    if (sharedCells.has(pre) && sharedCells.has(post)) contacts.sharedToShared++;
    if (preApl && sharedCells.has(post)) contacts.aplToShared++;
    if (sharedCells.has(pre) && postApl) contacts.sharedToApl++;
    if ((preKc && postKc) || preApl || postApl) contacts[arrays.sign.readInt8(e) > 0 ? 'positive' : 'negative']++;
  }
}
guard();
// Source inspection confines analyst masks to this diagnostic; no source learner imports it.
const diagnosticText = read('.codebase/scripts/neural-learning/inspect-eye-synaptic-conflict.mjs').toString();
assert(!/memory\.observe\(|\.backward\(|\.step\(/.test(diagnosticText));
const leakedReferences = [];
function inspectTree(path) {
  for (const ent of readdirSync(path, { withFileTypes: true })) {
    const p = `${path}/${ent.name}`;
    if (ent.isDirectory()) inspectTree(p);
    else if (p.endsWith('.mjs') && !p.endsWith('inspect-eye-synaptic-conflict.mjs')) {
      const text = readFileSync(p, 'utf8');
      if (/edgeCategories|hybridState|restore-shared|inspect-eye-synaptic-conflict/.test(text)) leakedReferences.push(p);
    }
  }
}
inspectTree('.codebase/src'); inspectTree('.codebase/scripts'); assert.deepEqual(leakedReferences, []);
pins[fileURLToPath(import.meta.url).replaceAll('\\', '/')] = sha(readFileSync(fileURLToPath(import.meta.url)));
const limitations = [
  'Raw neural forward responses are verified as recorded receipts, not regenerated by an independent graph implementation. Source tests store margins without all raw candidate/rest calibration values; their 576 values are cross-checked against all saved states and test receipts, not independently re-propagated.',
  'Parameter immutability is checked by diagnostic code before/after measurements, but parameter hashes are not published in per-pass receipts; memory hashes are published and independently verified.',
  'Numerically positive traces include exponentially decaying floating-point tails. Exact eligibility is not current KC activity or evidence of substantial plasticity; the audit retains the separate 1e-12 counts.',
  'The diagnostic publishes aggregate stage metrics and raw frame identity/DAN receipts, not per-frame category metrics; this auditor supplies independently recomputed per-frame category aggregates.',
  'An analyst-selected historical tuple restoration establishes a contribution in this fixed circuit/readout. It is not a biologically available allocation rule, a learned repair, exclusive causation, a test of all retrieval rules, retention in biological time, or reasoning transfer.'
];
const auditResult = { schema: 'independent-eye-diagnostic-audit-v1', status: 'passed-with-scope-limits', createdAt: new Date().toISOString(), independence: 'Separate same-provider audit role and standalone arithmetic implementation; not statistically independent error processes or biological verification.', command: `node --max-old-space-size=256 ${REPORT}/audit-diagnostic.mjs [FRESH_OUTPUT_JSON]`, checks: { sourceRecords: 24, savedStates: snapshots.size, sourceReceiptFiles: replays.length, replayedLocalFrames: replays.reduce((s, r) => s + r.frames, 0), diagnosticPasses: 54, earlierPasses: 27, diagnosticConditions: 5, recalculatedConditionItems: scores.length, sourceItemPhaseMarginsCrossChecked: 24 * 4 * 6, primaryReversalFrames: frameMetrics.length, allPinnedSourcesMatched: true, hybridWholeTupleHashesMatched: true, memoryHashesUnchangedWithinEachCondition: true, analystMaskReferencesInLearnerSources: leakedReferences }, counts, categoryByGroup, subtypeByGroup, staticContacts: contacts, marks, allOutcomes, scores, primaryMetrics: metrics, frameMetrics, sourceReplays: replays.map(({ valences, ...r }) => r), hybridHashes, limitations, sources: pins, elapsedSeconds: (performance.now() - started) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024 };
writeFileSync(OUT, JSON.stringify(auditResult, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: auditResult.status, checks: auditResult.checks, counts, categoryByGroup, staticContacts: contacts, out: resolve(OUT), elapsedSeconds: auditResult.elapsedSeconds }));
