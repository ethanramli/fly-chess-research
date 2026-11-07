// Analyse a pathway trace (twin pairs). Reads recorder output only; does not load the brain.
// Usage: node analyze-pathway-trace-v1.mjs --trace DIR [--summary PATH] [--out PATH]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  scaleVectors,
  sparsifyTop,
  activeFraction,
  twinSeparation,
  oracleKnn,
  leaveOneOut,
  inkRule,
} from '../../src/neural-learning/pathway-trace-analysis-v1.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const traceArg = opt('--trace');
if (!traceArg) throw new Error('Missing --trace DIR');
const DIR = resolve(traceArg);
const SUMMARY = resolve(
  opt('--summary') ?? 'runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/summary.json',
);
const OUT = resolve(opt('--out') ?? join(DIR, 'analysis.json'));

const GROUP_ORDER = ['photoreceptor', 'optic', 'vpn', 'vcn', 'central', 'kc', 'mbon'];

// Read a Float32 file as a view. Copies only if the buffer is not 4-byte aligned.
function readF32(path, expectedBytes) {
  const buf = readFileSync(path);
  if (buf.byteLength !== expectedBytes) {
    throw new Error(`${path}: ${buf.byteLength} bytes, expected ${expectedBytes}`);
  }
  if (buf.byteOffset % 4 === 0) return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

const boards = JSON.parse(readFileSync(join(DIR, 'boards.json'), 'utf8'));
const groups = JSON.parse(readFileSync(join(DIR, 'groups.json'), 'utf8'));
const summary = JSON.parse(readFileSync(SUMMARY, 'utf8'));

const B = boards.keys.length;
const n = boards.n;
const steps = boards.steps;
const tg = boards.traceGroups;
const T = tg.kc + tg.vpn + tg.mbon;
if (B !== 272) throw new Error(`Expected 272 boards, found ${B}`);

const keyIndex = new Map(boards.keys.map((k, i) => [k, i]));
const experienceIds = summary.split.experience;
const newIds = summary.split.newBoards;
if (experienceIds.length !== 96 || newIds.length !== 38) {
  throw new Error(`Split sizes ${experienceIds.length}/${newIds.length}, expected 96/38`);
}

// Map game ids to board indices, failing loudly on a missing key.
const boardIndex = (id, side) => {
  const i = keyIndex.get(`${id}:${side}`);
  if (i === undefined) throw new Error(`Missing board key ${id}:${side}`);
  return i;
};
const pairIdx = (ids) => ids.map((id) => ({ id, g: boardIndex(id, 'good'), b: boardIndex(id, 'bad') }));
const practiceIdx = pairIdx(experienceIds);
const newIdx = pairIdx(newIds);
const trainBoards = practiceIdx.flatMap((p) => [p.g, p.b]);

// Build pairs of vectors from a per-board vector list.
const toPairs = (idxs, vecs) => idxs.map((p) => ({ id: p.id, good: vecs[p.g], bad: vecs[p.b] }));
const trainVecs = (vecs) => trainBoards.map((i) => vecs[i]);

// Pull one group's final-step activities for every board.
function finalGroupVectors(finalF32, idx) {
  return Array.from({ length: B }, (_, b) => {
    const v = new Float64Array(idx.length);
    const base = b * n;
    for (let j = 0; j < idx.length; j++) v[j] = finalF32[base + idx[j]];
    return v;
  });
}

const fmt = (r) => `${r.correct}/${r.total}`;

// Load final-step activity once to read counts. Groups are extracted one at a time below.
const finalF32 = readF32(join(DIR, 'final.f32'), B * n * 4);
const stepsF32 = readF32(join(DIR, 'steps.f32'), B * (steps + 1) * T * 4);

const results = { trace: DIR, n, steps, T, groups: {}, kcSparse: {}, timing: {}, ink: {} };
const rows = [];

for (const G of GROUP_ORDER) {
  const idx = groups[G] ?? [];
  if (idx.length === 0) continue;
  if (G === 'kc' && idx.length !== tg.kc) throw new Error('groups.kc length differs from traceGroups.kc');
  if (G === 'mbon' && idx.length !== tg.mbon) throw new Error('groups.mbon length differs from traceGroups.mbon');
  if (G === 'vpn' && idx.length !== tg.vpn) throw new Error('groups.vpn length differs from traceGroups.vpn');

  let vecs = finalGroupVectors(finalF32, idx);
  const raw = {
    practice: toPairs(practiceIdx, vecs),
    new: toPairs(newIdx, vecs),
  };
  const g = {
    neurons: idx.length,
    activeFraction: activeFraction(vecs),
    twin: { practice: twinSeparation(raw.practice), new: twinSeparation(raw.new) },
    modes: {},
  };
  const train = trainVecs(vecs);

  for (const mode of ['none', 'rms', 'zscore']) {
    const scaled = scaleVectors(train, vecs, mode);
    const practice = toPairs(practiceIdx, scaled);
    const test = toPairs(newIdx, scaled);
    g.modes[mode] = {};
    for (const k of [1, 3]) {
      g.modes[mode][`k${k}`] = {
        oracle: oracleKnn(practice, test, k),
        leaveOneOut: leaveOneOut(practice, k),
      };
    }
  }
  results.groups[G] = g;
  rows.push([G, g.neurons, g.activeFraction, g.twin.practice.ratio, g.modes]);

  if (G === 'photoreceptor') {
    results.ink.photoreceptor = { practice: inkRule(raw.practice), new: inkRule(raw.new) };
  }
  vecs = null; // release this group before the next one
}

// KC sparsity variants: sparsify each raw KC vector, then score with 'none' and 'zscore' at k=3.
const kcIdx = groups.kc ?? [];
if (kcIdx.length > 0) {
  const kcRaw = finalGroupVectors(finalF32, kcIdx);
  for (const fraction of [0.05, 0.1]) {
    const sparse = kcRaw.map((v) => sparsifyTop(v, fraction));
    const train = trainVecs(sparse);
    const entry = { activeFraction: activeFraction(sparse) };
    for (const mode of ['none', 'zscore']) {
      const scaled = scaleVectors(train, sparse, mode);
      const practice = toPairs(practiceIdx, scaled);
      const test = toPairs(newIdx, scaled);
      entry[mode] = { oracle: oracleKnn(practice, test, 3), leaveOneOut: leaveOneOut(practice, 3) };
    }
    results.kcSparse[`fraction_${fraction}`] = entry;
  }
}

// Timing: twin separation over trace steps for KC and VPN, using new pairs only.
// Block layout per board per step: kc, then vpn, then mbon.
function stepTiming(offsetInBlock, count) {
  const out = [];
  for (let t = 0; t <= steps; t++) {
    const vecs = Array.from({ length: B }, (_, b) => {
      const start = (b * (steps + 1) + t) * T + offsetInBlock;
      return Float64Array.from(stepsF32.subarray(start, start + count));
    });
    const sep = twinSeparation(toPairs(newIdx, vecs));
    out.push({ t, within: sep.within, across: sep.across });
  }
  return out;
}
if (tg.kc > 0) results.timing.kc = stepTiming(0, tg.kc);
if (tg.vpn > 0) results.timing.vpn = stepTiming(tg.kc, tg.vpn);

writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n');

// Compact plain-text table.
const pad = (s, w) => String(s).padEnd(w);
console.log(
  [pad('group', 13), pad('neurons', 9), pad('active', 9), pad('ratio(prac)', 12), pad('none k3 O/LOO', 17), pad('rms k3 O/LOO', 17), 'zscore k3 O/LOO'].join(' '),
);
for (const [G, neurons, act, ratio, modes] of rows) {
  const cell = (m) => `${fmt(modes[m].k3.oracle)} / ${fmt(modes[m].k3.leaveOneOut)}`;
  console.log(
    [pad(G, 13), pad(neurons, 9), pad(act.toFixed(4), 9), pad(ratio.toFixed(4), 12), pad(cell('none'), 17), pad(cell('rms'), 17), cell('zscore')].join(' '),
  );
}
console.log(`Wrote ${OUT}`);
