// Independent arithmetic/local-state replay. Does not import the learner or replay full-graph neural activity.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const sha = x => createHash('sha256').update(x).digest('hex');
const med = xs => { assert(xs.length && xs.every(Number.isFinite)); const a = [...xs].sort((x, y) => x - y), i = a.length >> 1; return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2; };
const div = (x, y) => y > 0 ? x / y : 0;
const rngFor = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function marksFromRecords(rows, count) {
  const groups = Object.fromEntries(['informative', 'absent', 'shuffled', 'disabled'].map(a => [a, rows.filter(r => r.arm === a)]));
  const I = groups.informative, all = Array.from({ length: count }, (_, i) => i), old = all.slice(0, count / 2), last = `T${count - 1}`;
  const margin = (r, t, j) => { const x = r.tests[t][j]; assert(Number.isFinite(x.mNorm) && x.greedy === (x.mNorm > 0)); return x.mNorm; };
  const fraction = (r, t, js) => js.filter(j => margin(r, t, j) > 0).length / js.length;
  const ratio = (r, t, previous, js) => med(js.map(j => div(margin(r, t, j), margin(r, previous(j), j))));
  for (const g of Object.values(groups)) assert.equal(g.length, I.length);
  assert.equal(new Set(rows.map(r => `${r.seed}/${r.arm}`)).size, rows.length);
  const own = all.map(j => ({ m: med(I.map(r => margin(r, `T${j}`, j))), g: I.filter(r => margin(r, `T${j}`, j) > 0).length / I.length }));
  const r2 = { share: med(I.map(r => fraction(r, last, old))), ratio: med(I.map(r => ratio(r, last, j => `T${j}`, old))) };
  const r3 = { item: med(I.map(r => margin(r, 'Rev', 0))), greedy: I.filter(r => margin(r, 'Rev', 0) > 0).length / I.length, others: med(I.map(r => ratio(r, 'Rev', () => 'Delay', all.slice(1)))) };
  const r4 = { share: med(I.map(r => fraction(r, 'Delay', all))), ratio: med(I.map(r => ratio(r, 'Delay', () => last, all))) };
  const r5 = { disabledUnchanged: groups.disabled.every(r => r.gainsBefore === r.initialGains), absentUnchanged: groups.absent.every(r => r.gainsBefore === r.initialGains), shuffled: med(groups.shuffled.map(r => fraction(r, last, all))), informative: med(I.map(r => fraction(r, last, all))), absentShare: med(groups.absent.map(r => fraction(r, last, all))) };
  return {
    R1: { pass: own.every(x => x.m >= .2 && x.g >= .9), observed: own },
    R2: { pass: r2.share >= .9 && r2.ratio >= .5, observed: r2 },
    R3: { pass: r3.item >= .15 && r3.greedy >= .9 && r3.others >= .8, observed: r3 },
    R4: { pass: r4.share >= .9 && r4.ratio >= .7, observed: r4 },
    R5: { pass: r5.disabledUnchanged && r5.shuffled < .75 && r5.informative >= r5.shuffled + .25, observed: r5 },
  };
}

const stateHash = s => { const h = createHash('sha256'); for (const key of ['gains', 'traces', 'states']) { const x = Float64Array.from(s[key]); h.update(Buffer.from(x.buffer)); } return h.update(JSON.stringify([s.time, s.pulses])).digest('hex'); };

export function replayFrame(s, config, mapping, frame) {
  assert.equal(stateHash(s), frame.before, 'Before-state mismatch');
  assert(frame.dt > 0 && Number.isFinite(frame.dt));
  const k = new Map(frame.ks); assert.equal(k.size, frame.ks.length);
  const allowed = new Set(mapping.groups.flatMap(g => g.kc));
  for (const [i, v] of k) assert(allowed.has(i) && v > config.theta && v <= 1);
  assert.equal(frame.ds.length, mapping.groups.length);
  let index = 0, pulsed = false;
  for (let g = 0; g < mapping.groups.length; g++) {
    const { excess, deficit } = frame.ds[g], drive = excess + deficit;
    assert([excess, deficit].every(x => x >= 0 && Number.isFinite(x))); pulsed ||= drive > 0;
    for (const cell of mapping.groups[g].kc) {
      const activity = k.get(cell) ?? 0, target = Math.min(1, Math.max(0, (activity - config.theta) / (1 - config.theta)));
      const trace = target + (s.traces[index] - target) * Math.exp(-frame.dt / config.tauE);
      s.traces[index] = trace;
      if (drive !== 0 && trace !== 0) {
        const base = trace * config.eta * drive * frame.dt, p = -Math.expm1(-base), x = -Math.expm1(-base * (drive / .25) ** 2);
        const pd = p * excess / drive, pu = p * deficit / drive, xd = x * excess / drive, xu = x * deficit / drive;
        const offset = index * 4, [a, b, c, d] = s.states.slice(offset, offset + 4);
        const next = [(1 - p) * a + xd * b, (1 - xd) * b + pu * (a + c), (1 - p) * c + xu * d, (1 - xu) * d + pd * (c + a)];
        const total = next.reduce((a, b) => a + b, 0);
        assert(Math.abs(total - 1) <= 1e-12 && next.every(v => Number.isFinite(v) && v >= 0));
        for (let j = 0; j < 4; j++) s.states[offset + j] = next[j] / total;
        s.gains[index] = config.minGain + (config.maxGain - config.minGain) * (s.states[offset] + s.states[offset + 1]);
      }
      index++;
    }
  }
  s.time += frame.dt; if (pulsed) s.pulses++;
  assert.equal(stateHash(s), frame.after, 'After-state mismatch');
}

export async function auditFrames(file, run, summaryRecord) {
  let start, state, rng, frames = 0, trials = 0, ended = false, restored = false;
  const tests = {}, valences = {}, drive = {};
  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    const r = JSON.parse(line); assert(!ended, 'Data after end');
    if (r.kind === 'start') {
      assert(!start); start = r; state = structuredClone(r.initial); assert.equal(stateHash(state), r.localHash);
      assert(state.gains.every(v => v === 1) && state.traces.every(v => v === 0));
      rng = rngFor((r.seed ^ { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 }[r.arm]) >>> 0);
      assert.equal(r.identity, state.identity);
    } else {
      assert(start, 'Missing start');
      if (r.kind === 'frame') {
        assert.notEqual(start.arm, 'disabled'); assert.equal(r.frame, frames++); replayFrame(state, start.config, start.mapping, r);
        const stage = r.context.phase === 'Delay' ? 'delay' : r.context.step === 'feedback' ? 'feedback' : 'presentation';
        for (const x of r.ds) { const d = x.excess + x.deficit, v = drive[stage] ??= { count: 0, sum: 0, max: 0 }; v.count++; v.sum += d; v.max = Math.max(v.max, d); }
      } else if (r.kind === 'trial') {
        trials++; assert.equal(r.context.trial, trials); assert.equal(r.unknown, trials % 8 === 0);
        assert.equal(r.good, r.context.phase === 'REV' ? 1 : 0);
        const j = r.context.item, item = start.items[j], cert = r.certificate;
        assert(item && r.scores.length === 2 && r.scores.every(Number.isFinite));
        assert.equal(r.choice, rng() < 1 / (1 + Math.exp((r.scores[1] - r.scores[0]) / .1)) ? 0 : 1);
        assert.equal(cert.criterion, 'assigned-action-association-v1'); assert.equal(cert.fen, item.fen); assert.deepEqual(cert.moves, item.moves);
        assert.equal(cert.chosenMove, item.moves[r.choice]); assert.equal(cert.goodMove, item.moves[r.good]); assert.equal(cert.known, !r.unknown);
        if (r.unknown || ['absent', 'disabled'].includes(start.arm)) assert.equal(r.valence, null);
        else if (start.arm === 'informative') assert.equal(r.valence, r.choice === r.good ? 'reward' : 'punish');
        else assert(['reward', 'punish'].includes(r.valence));
        const scale = r.valence ? Math.max(0, Math.min(1, (1.2 - (r.valence === 'reward' ? 1 : -1) * r.now) / 2.4)) : 0;
        assert.equal(r.scale, scale); assert.equal(r.level, .75 + (r.valence === 'reward' ? .75 : r.valence === 'punish' ? -.75 : 0) * scale);
        if (r.valence) (valences[r.context.phase] ??= []).push(r.valence);
      } else if (r.kind === 'test') {
        assert.equal(r.localHash, stateHash(state)); tests[r.name] = r.results;
        const suffix = file.slice(file.lastIndexOf('frames-') + 7, -6);
        const saved = JSON.parse(readFileSync(`${run}/snapshot-${suffix}-${r.name}.json`));
        assert.equal(stateHash(saved.snapshot), stateHash(state)); assert.deepEqual(saved.tests, r.results);
      } else if (r.kind === 'fresh-restore') { assert.equal(r.before, stateHash(state)); assert.equal(r.after, r.before); restored = true; }
      else if (r.kind === 'end') { assert.equal(r.frames, frames); assert.equal(r.finalState, stateHash(state)); ended = true; }
      else assert.fail('Unknown receipt kind');
    }
  }
  assert(ended); assert.equal(trials, 24 * (start.items.length + 1));
  assert.deepEqual(tests, summaryRecord.tests); assert.equal(stateHash(state), summaryRecord.finalLocalState);
  assert.equal(frames, summaryRecord.frames);
  for (const v of Object.values(drive)) { v.mean = v.sum / v.count; delete v.sum; }
  return { seed: start.seed, arm: start.arm, frames, trials, restored, valences, drive, finalState: stateHash(state) };
}

async function main() {
  const { values: a } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' }, 'require-joint': { type: 'boolean' } } });
  assert(a.run && a.out && !existsSync(a.out), 'Require --run DIR --out FRESH_JSON');
  const summary = JSON.parse(readFileSync(`${a.run}/summary.json`)), rows = readFileSync(`${a.run}/records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, summary.seeds.length * 4);
  assert.deepEqual([...new Set(rows.map(r => r.seed))], summary.seeds);
  const marks = marksFromRecords(rows, summary.items); assert.deepEqual(marks, summary.marks);
  const files = readdirSync(a.run).filter(n => n.startsWith('frames-') && n.endsWith('.jsonl'));
  const replay = [];
  if (files.length) {
    const m = JSON.parse(readFileSync(`${a.run}/manifest.json`)); assert.equal(m.status, 'complete');
    for (const [p, expected] of Object.entries(m.pins)) assert.equal(sha(readFileSync(p)), expected, `Source/input changed: ${p}`);
    assert.equal(sha(readFileSync(`${a.run}/summary.json`)), m.summary);
    assert.equal(files.length, rows.length + 1);
    for (const file of files) {
      const [, seed, arm] = file.match(/^frames-(\d+)-(informative|absent|shuffled|disabled)(?:-restored)?\.jsonl$/);
      const rec = rows.find(r => r.seed === Number(seed) && r.arm === arm); assert(rec);
      replay.push(await auditFrames(`${a.run}/${file}`, a.run, rec));
    }
    for (const seed of summary.seeds) {
      const inf = rows.find(r => r.seed === seed && r.arm === 'informative'), shuffled = replay.find(r => r.seed === seed && r.arm === 'shuffled');
      for (const [phase, list] of Object.entries(inf.realized)) {
        const expected = [...list], rng = rngFor((seed ^ 0x77 ^ Number(phase === 'REV' ? summary.items : phase.slice(1))) >>> 0);
        for (let i = expected.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [expected[i], expected[j]] = [expected[j], expected[i]]; }
        assert.deepEqual(shuffled.valences[phase], expected, 'Matched shuffled sequence differs');
      }
    }
    assert.equal(replay.filter(r => r.restored).length, 1);
  }
  const inf = rows.filter(r => r.arm === 'informative'), last = `T${summary.items - 1}`;
  const perSeed = inf.map(r => ({ seed: r.seed, delayRatios: r.tests.Delay.map((x, j) => div(x.mNorm, r.tests[last][j].mNorm)), delayCorrect: r.tests.Delay.filter(x => x.greedy).length, postReversalCorrect: r.tests.Rev.filter(x => x.greedy).length }));
  const result = { status: 'audit-passed', scope: files.length ? 'independent local-frame replay, saved-state and synthetic-feedback checks; full graph activity not independently replayed' : 'summary arithmetic only; v1 has no local receipts', jointPass: Object.values(marks).every(x => x.pass), marks, perSeed, replay, sources: { records: sha(readFileSync(`${a.run}/records.jsonl`)), summary: sha(readFileSync(`${a.run}/summary.json`)) } };
  writeFileSync(a.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, jointPass: result.jointPass, arms: rows.length, localFrames: replay.reduce((s, r) => s + r.frames, 0), marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v.pass])) }));
  if (a['require-joint']) assert(result.jointPass, 'Joint memory gate failed');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.stack); process.exitCode = 1; });
