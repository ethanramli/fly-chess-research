import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Chess } from 'chess.js';
import { ARMS, judgeRun, judgeSeed, readJob } from '../../src/neural-learning/fly-connections-judge-v1.mjs';

// Synthetic runs: hand-made rankings and receipts for one position (after 1.e4 d5). No neural model.
const SEED = 7301;
const TAPE = 'c'.repeat(64);
const MASK = 8;
const WRITTEN = [10, 11, 12, 13];
const PRIMARY = 'informative-local';
const LEARNING = new Set([PRIMARY, 'informative-matched', 'informative-global']);
const GATES = { minAcquired: 6, retention: 0.7, epsilon: 1e-6, success: 0.75, bootstrapSeed: 20261109, pressure: 0.01, pressureShare: 0.25 };
const PROBE_GROUPS = {
  'T0': ['A', 'B', 'R', 'testA', 'testB'],
  'A-end': ['A', 'R'],
  'R1-end': ['A', 'B', 'R'],
  'B-end': ['A', 'B', 'R', 'testA', 'testB'],
  'R2-end': ['A', 'B', 'R', 'testA', 'testB'],
};
const HISTORY = ['e2e4', 'd7d5'];
const CAPTURE = 'e4d5';
const R_TARGETS = ['e4d5', 'e4e5'];
const FEN = (() => { const c = new Chess(); c.move({ from: 'e2', to: 'e4' }); c.move({ from: 'd7', to: 'd5' }); return c.fen(); })();
const LEGAL = new Chess(FEN).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();
const sha = s => createHash('sha256').update(s).digest('hex');
const byId = (a, b) => (a.boardId < b.boardId ? -1 : a.boardId > b.boardId ? 1 : 0);
const jobDir = (root, arm) => join(root, 'jobs', `${SEED}-${arm}`);

function makeRecords() {
  const records = new Map();
  const add = (group, gameId, extra = {}) => {
    const boardId = `${gameId}:2`;
    records.set(boardId, { schema: 'fly-connections-board-v1', boardId, gameId, ply: 2, fen: FEN, history: HISTORY, group, ...extra });
  };
  const chess = () => ({ outcomes: Object.fromEntries(LEGAL.map(m => [m, m === CAPTURE])) });
  for (let i = 1; i <= 8; i++) add('A', `gA${i}`, chess());
  for (let i = 1; i <= 8; i++) add('B', `gB${i}`, chess());
  for (let i = 1; i <= 2; i++) add('R', `gR${i}`, { rTargets: R_TARGETS });
  for (let i = 1; i <= 2; i++) add('testA', `gTA${i}`, chess());
  for (let i = 1; i <= 2; i++) add('testB', `gTB${i}`, chess());
  return records;
}

// Margin plan: the favoured move scores `margin`, every other legal move 0. Margin > 0 means success.
function planOf(arm, label, record, knobs) {
  if (record.group === 'R') {
    const favored = record.rTargets[label === 'R2-end' && !knobs.flipR2 ? 1 : 0];
    return { favored, margin: label === 'T0' || label === 'A-end' ? -1 : 1 };
  }
  return { favored: CAPTURE, margin: chessMargin(arm, label, record, knobs) };
}

function chessMargin(arm, label, record, knobs) {
  const g = record.group;
  if (!LEARNING.has(arm)) {
    return knobs.flipComparator && arm === 'shuffled-local' && label === 'B-end' && (g === 'A' || g === 'B') ? 1 : -1;
  }
  if (g === 'A') {
    // flatA: primary's A boards already succeed at T0 (margin 0.2), so B-end success equals T0 while margins improve.
    if (label === 'T0') return knobs.flatA && arm === PRIMARY ? 0.2 : -1;
    return label === 'R2-end' && knobs.flipRatio && record.gameId === 'gA1' ? 0.38 : 1;
  }
  if (g === 'B') return label === 'R2-end' || (label === 'B-end' && !knobs.flipB) ? 1 : -1;
  return label === 'R2-end' ? 1 : -1;
}

function slotsOf(records) {
  const boardsOf = group => [...records.values()].filter(r => r.group === group).sort(byId);
  const slots = [], cursor = {};
  const train = (phase, group) => {
    for (const record of boardsOf(group)) {
      for (const [move, pulse] of [[CAPTURE, true], [CAPTURE, true], ['a2a3', false], ['b2b3', false]]) slots.push({ phase, record, move, pulse });
    }
  };
  const rounds = (phase, index) => {
    for (const record of boardsOf('R')) {
      for (let cycle = 0; cycle < 4; cycle++) {
        for (const move of record.rTargets) slots.push({ phase, record, move, pulse: move === record.rTargets[index] });
      }
    }
  };
  train('A', 'A'); cursor['A-end'] = slots.length;
  rounds('R1', 0); cursor['R1-end'] = slots.length;
  train('B', 'B'); cursor['B-end'] = slots.length;
  rounds('R2', 1); cursor['R2-end'] = slots.length;
  return { slots, cursor };
}

const overwrite = (edgeId, before, after, relative, pressureWrite) => ({
  edgeId, beforeGain: before, afterGain: after, beforeMagnitude: before, afterMagnitude: after, beforeBits: 0, afterBits: 0,
  gainChanged: true, effectiveChanged: true, relativeEffectiveChange: relative, pressureWrite,
});

async function writeRun(root, records, knobs = {}) {
  const { slots, cursor } = slotsOf(records);
  const firstA = slots.findIndex(s => s.phase === 'A');
  const firstB = slots.findIndex(s => s.phase === 'B');
  const boardsOf = group => [...records.values()].filter(r => r.group === group).sort(byId);
  for (const arm of ARMS) {
    const learns = arm !== 'off-local';
    const primary = arm === PRIMARY;
    const state = c => sha(`${arm}|${learns ? c : 0}`);
    const offsets = { 'T0': 0, ...cursor };
    const labels = Object.keys(offsets).filter(label => !(primary && knobs.noT0 && label === 'T0'));
    let badReuseLeft = arm === 'off-local' && knobs.badReuse ? 1 : 0;
    const rankedOf = plan => LEGAL.map(move => ({ move, score: move === plan.favored ? plan.margin : 0, mbon: [0, 0] }));
    const probeLines = label => {
      const lines = [];
      for (const group of PROBE_GROUPS[label]) {
        for (const record of boardsOf(group)) {
          const plan = planOf(arm, label, record, knobs);
          const t0 = planOf(arm, 'T0', record, knobs);
          // The job no longer writes ranking-reused lines; only the badReuse knob injects one (readJob must reject it).
          if (badReuseLeft > 0 && label !== 'T0' && plan.favored === t0.favored && plan.margin === t0.margin) {
            badReuseLeft--;
            lines.push({ type: 'ranking-reused', label, cursor: offsets[label], boardId: record.boardId, group, from: 'T0',
              fingerprint: 'f'.repeat(64) });
          } else {
            lines.push({ type: 'ranking', label, cursor: offsets[label], boardId: record.boardId, group,
              phase: group === 'R' ? 'R1' : 'chess', fingerprint: state(offsets[label]),
              ranking: { schema: 'fly-connections-ranking-v1', boardId: record.boardId, gameId: record.gameId, ranked: rankedOf(plan) } });
          }
        }
      }
      return lines;
    };
    const receiptOf = i => {
      const slot = slots[i];
      const depressed = slot.pulse !== Boolean(knobs.flipD);
      const factor = primary && depressed ? -0.2 : 0;
      let writes = [];
      if (primary && i === firstA) writes = WRITTEN.map(id => overwrite(id, 1, 1.2, 0.2, true));
      if (primary && i === firstB) {
        writes = WRITTEN.map(id => (knobs.flipPressure ? overwrite(id, 1.2, 1.2012, 0.0012, false) : overwrite(id, 1.2, 1.5, 0.3, true)));
      }
      return {
        schema: 'fly-connections-condition-receipt-v1', arm, sequence: i, eventId: sha(`${arm}|${i}`), phase: slot.phase,
        boardId: slot.record.boardId, gameId: slot.record.gameId, move: slot.move, criterion: 'test', proofSha: 'd'.repeat(64),
        status: 'taught', outcome: slot.pulse, pulse: slot.pulse, deliveredPulse: arm === 'absent-local' ? false : slot.pulse,
        teaching: [{ side: 'left', factor }, { side: 'right', factor }], update: { observed: learns }, writes,
        fingerprintBefore: state(i), fingerprintAfter: state(i + 1), passes: 1, scope: 'test',
      };
    };
    const lines = [];
    if (!(primary && knobs.noT0)) lines.push(...probeLines('T0'));
    slots.forEach((_, i) => {
      if (!(primary && knobs.dropEvent === i)) lines.push({ type: 'event', cursor: i, receipt: receiptOf(i) });
      for (const label of Object.keys(cursor)) if (cursor[label] === i + 1) lines.push(...probeLines(label));
    });
    if (primary && knobs.duplicateT0) lines.push(lines.find(l => l.type === 'ranking' && l.label === 'T0'));

    const dir = jobDir(root, arm);
    await mkdir(join(dir, 'snapshots'), { recursive: true });
    await writeFile(join(dir, 'records.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    await writeFile(join(dir, 'result.json'), JSON.stringify({
      schema: 'fly-connections-job-result-v1', seed: SEED, arm, tapeSha256: TAPE, status: 'complete', passes: slots.length,
      events: slots.length, wallSeconds: 1, cpuSeconds: 1, secondsPerPass: 0.01,
      peakRssMiB: knobs.rssArm === arm ? 2049 : 1500, minFreeMiB: 512,
      fingerprints: Object.fromEntries(labels.map(label => [label, state(offsets[label])])),
      describe: { schema: 'fly-connections-condition-v1', arm, aplMode: 'local', pulseRule: 'test', learns, maskEdges: MASK,
        baseEdges: MASK, scope: 'test', identities: { arm }, groups: [] },
    }));
    for (const label of labels) {
      await writeFile(join(dir, 'snapshots', `${label}.json`), JSON.stringify({ schema: 'fly-connections-condition-v1', version: 1,
        bound: { arm }, memory: { version: 1, identity: 'test', events: offsets[label], gains: Array(MASK).fill(1) } }));
    }
  }
}

async function withRun(knobs, fn) {
  const root = await mkdtemp(join(tmpdir(), 'judge-v1-'));
  try {
    const records = makeRecords();
    await writeRun(root, records, knobs);
    return await fn(root, records);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function verdictFor(knobs = {}, arms = ARMS) {
  return withRun(knobs, async (root, records) => {
    const jobs = {};
    for (const arm of arms) jobs[arm] = await readJob(jobDir(root, arm));
    return judgeSeed({ seed: SEED, jobs, records, gates: GATES, tapeSha256: TAPE });
  });
}

const failing = v => [
  ...['P1', 'P2', 'P3'].flatMap(part => v[part].checks.filter(c => c.pass === false).map(c => c.name.split(' ')[0])),
  ...(v.fair ? [] : ['fair']),
];

async function assertOnlyFails(knobs, expected) {
  const v = await verdictFor(knobs);
  assert.equal(v.pass, false);
  assert.deepEqual(failing(v), expected);
}

test('a complete, consistent seed passes every gate', async () => {
  const v = await verdictFor();
  assert.equal(v.pass, true);
  assert.equal(v.fair, true);
  for (const part of ['P1', 'P2', 'P3']) assert.equal(v[part].pass, true, part);
  assert.deepEqual(failing(v), []);
  assert.equal(v.P1.checks[1].pass, null); // deferred to audit, not a pass
  assert.equal(v.report.P2_5.loads.A.length, 1); // dry-size groups: one load, at the end
  assert.equal(v.P2.checks.find(c => c.name.startsWith('P2.2b')).pass, true); // A and B success rise from baseline
});

test('the four gate arms alone are judged the same (attribution arms cut, gates 4b); a missing gate arm throws', async () => {
  const v = await verdictFor({}, ARMS.slice(0, 4));
  assert.equal(v.pass, true);
  assert.deepEqual(failing(v), []);
  await assert.rejects(verdictFor({}, ARMS.filter(a => a !== 'shuffled-local')), /Missing arms: shuffled-local/);
});

test('retention ratio 0.69 fails only P2.1', () => assertOnlyFails({ flipRatio: true }, ['P2.1']));

// B never acquires, so B-end success equals R1-end success (both 0): P2.2b fails with P2.1.
test('B boards never acquired fail P2.1 and P2.2b', () => assertOnlyFails({ flipB: true }, ['P2.1', 'P2.2b']));

test('a comparator with game-clustered lower bound <= 0 fails only P2.2', () => assertOnlyFails({ flipComparator: true }, ['P2.2']));

test('A margins improve but success at B-end equals T0 fails only P2.2b', () => assertOnlyFails({ flatA: true }, ['P2.2b']));

test('no pressure fails only P2.3', () => assertOnlyFails({ flipPressure: true }, ['P2.3']));

test('an R target0 that is still the sole top at R2-end fails only P2.4', () => assertOnlyFails({ flipR2: true }, ['P2.4']));

test('pulse events not more depressing than no-pulse events fail only P1.3', () => assertOnlyFails({ flipD: true }, ['P1.3']));

test('RSS 2049 MiB fails only fair', () => assertOnlyFails({ rssArm: PRIMARY }, ['fair']));

test('a reused off ranking with a changed fingerprint throws', () => withRun({ badReuse: true }, async root => {
  await assert.rejects(readJob(jobDir(root, 'off-local')), /fingerprint that differs from T0/);
}));

test('an event sequence gap throws', () => withRun({ dropEvent: 5 }, async root => {
  await assert.rejects(readJob(jobDir(root, PRIMARY)), /breaks the sequence/);
}));

test('a duplicate ranking line throws', () => withRun({ duplicateT0: true }, async root => {
  await assert.rejects(readJob(jobDir(root, PRIMARY)), /duplicate ranking/);
}));

test('a job without T0 throws', () => withRun({ noT0: true }, async root => {
  await assert.rejects(readJob(jobDir(root, PRIMARY)), /missing T0/);
}));

test('a seed with a missing arm throws', () => withRun({}, async (root, records) => {
  const jobs = {};
  for (const arm of ARMS.filter(a => a !== 'off-local')) jobs[arm] = await readJob(jobDir(root, arm));
  assert.throws(() => judgeSeed({ seed: SEED, jobs, records, gates: GATES, tapeSha256: TAPE }), /Missing arms: off-local/);
}));

test('judgeRun reads the run directory and returns the verdict', () => withRun({}, async (root, records) => {
  const registration = { seeds: [SEED], arms: [...ARMS], limits: { rssMiB: 2048, freeMiB: 256 }, gates: GATES };
  const out = await judgeRun({ runDir: root, registration, records, tapes: new Map([[SEED, { sha256: TAPE }]]), baselines: { note: 'test' } });
  assert.equal(out.pass, true);
  assert.equal(out.verdict, 'passes');
  assert.equal(out.perSeed.length, 1);
  assert.deepEqual(out.baselines, { note: 'test' });
}));
