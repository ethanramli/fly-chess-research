// Capacity-delay assay v2 (spec: research/reports/memory-retention-continuation-2026-10-31/capacity-delay-v2-spec.md).
// Synthetic fixture with a chosen delay-noise model. Not graph data and not fly physiology.
import { createHash } from 'node:crypto';
import { mulberry32 } from './memory-assay-fixture.mjs';
import { createRule, DAN_REST } from './memory-assay-adapters.mjs';

export { buildCapacityFixture } from './capacity-delay-assay.mjs';

export const CHECKPOINTS = [4, 8, 16, 32];
const TEMPERATURE = 0.1, STEP = 4; // trial gap and delay step, both 4 units, as in v1
const ARM_SALT = { informative: 0x11, absent: 0x22, disabled: 0x44 }; // v1 salts; shuffled needs yoked valences, which v2 does not take
const DELAY_SALT = 0x6a09e667; // own generator, so delay draws never consume the choice stream
const REWARD_DAN = [0, 1.5], PUNISH_DAN = [1.5, 0]; // [danP, danR], as in v1
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const flip = id => `${id.slice(0, -1)}${id.endsWith('+') ? '-' : '+'}`;

// Checkpoints are tested only once items are trained, so checkpoints above items never fire.
// Part B reversal runs inside the loop right after T{reversalAt}; delay levels run after the last trained item.
export function runCapacityArmV2({ ruleName, fixture, seed, arm = 'informative', temperature = TEMPERATURE, checkpoints, reversalAt = null, jitter = 0.1, delayLevels = [], activeFraction = 0.1 }) {
  if (!Object.hasOwn(ARM_SALT, arm)) throw Error(`Unknown arm ${arm}`);
  const { nKC: n, images, items } = fixture;
  const rule = createRule(ruleName, fixture);
  const choice = mulberry32((seed ^ ARM_SALT[arm]) >>> 0), delay = mulberry32((seed ^ DELAY_SALT) >>> 0);
  const learns = arm !== 'disabled';
  const zeros = new Float64Array(n);
  const frame = (kcH, danP, danR, dt) => { if (learns) rule.frame({ kcH, danP, danR, dt }); };
  const gainsHash = () => { const g = rule.gains(); return digest({ P: [...g.P], R: [...g.R] }); };
  // Value reads only: no frames, no state change.
  const entry = good => {
    const bad = flip(good), vGood = rule.value(good, images[good].h), vBad = rule.value(bad, images[bad].h), margin = vGood - vBad;
    return { good, vGood, vBad, margin, greedy: margin > 0 };
  };
  const tests = {}, pulses = {}, acq = [];
  const probe = (name, count, goodOf) => { tests[name] = Array.from({ length: count }, (_, j) => entry(goodOf(j))); };
  let trialIndex = 0;
  const runBlock = (name, item, good) => {
    const counts = pulses[name] = { reward: 0, punish: 0, none: 0 };
    for (let t = 0; t < 24; t++) {
      const unknown = (trialIndex + 1) % 8 === 0; // every eighth trial overall, no pulse
      trialIndex++;
      const pair = [`X${item}+`, `X${item}-`], scores = {};
      for (const id of pair) {
        frame(images[id].h, DAN_REST, DAN_REST, 1);
        scores[id] = rule.value(id, images[id].h);
        frame(zeros, DAN_REST, DAN_REST, STEP);
      }
      const [first, second] = pair;
      const pFirst = 1 / (1 + Math.exp((scores[second] - scores[first]) / temperature));
      const chosenId = choice() < pFirst ? first : second;
      const valence = !unknown && learns && arm !== 'absent' ? (chosenId === good ? 'reward' : 'punish') : null;
      if (valence) counts[valence]++; else counts.none++;
      frame(images[chosenId].h, DAN_REST, DAN_REST, 1);
      const [danP, danR] = valence === 'reward' ? REWARD_DAN : valence === 'punish' ? PUNISH_DAN : [DAN_REST, DAN_REST];
      frame(images[chosenId].h, danP, danR, 1);
      if (valence) rule.noteEvent(chosenId, valence);
      frame(zeros, DAN_REST, DAN_REST, STEP);
    }
  };
  for (let i = 0; i < items; i++) {
    runBlock(`B${i + 1}`, i, `X${i}+`);
    acq.push(entry(`X${i}+`).margin); // own acquisition test, read-only
    if (checkpoints.includes(i + 1)) probe(`T${i + 1}`, i + 1, j => `X${j}+`);
    if (i + 1 === reversalAt) {
      runBlock('REV', 0, 'X0-');
      probe('Rev', i + 1, j => (j === 0 ? 'X0-' : `X${j}+`));
    }
  }
  // Captured before the delay stage, so jitter 0 can be checked against it.
  const gainsBeforeDelayHash = gainsHash();
  // One delay step: 10% of KC cells (activeFraction) at h in [0.9, 1.5], and each DAN at DAN_REST * (1 + e) with e in [-jitter, jitter].
  const delayStep = () => {
    const kcH = new Float64Array(n), cells = new Set();
    while (cells.size < Math.round(activeFraction * n)) cells.add(Math.floor(delay() * n));
    for (const k of cells) kcH[k] = 0.9 + 0.6 * delay();
    const eP = jitter * (2 * delay() - 1), eR = jitter * (2 * delay() - 1);
    frame(kcH, DAN_REST * (1 + eP), DAN_REST * (1 + eR), STEP);
  };
  let delayed = 0;
  for (const level of delayLevels) {
    for (; delayed < level; delayed += STEP) delayStep();
    probe(`D${level}`, items, j => `X${j}+`);
  }
  return { rule: ruleName, arm, seed, nKC: n, s: fixture.s, items, fixtureId: fixture.id, jitter, activeFraction, reversalAt, delayLevels,
    tests, pulses, acq, gainsBeforeDelayHash, finalGainsHash: gainsHash() };
}

const BIN_KEYS = ['vGood', 'vBad', 'margin', 'greedyShare', 'acqMargin'];
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = xs => { const a = [...xs].sort((p, q) => p - q), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };
const ratio = (num, den) => (den > 0 ? num / den : 0); // v1 convention: no positive reference margin counts as no retained margin
const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i);
const by = (xs, key) => xs.reduce((m, x) => { (m[key(x)] ??= []).push(x); return m; }, {});
const perRule = (rs, fn) => Object.fromEntries(Object.entries(by(rs, r => r.rule)).map(([rule, group]) => [rule, fn(group)]));
const sizeOf = r => `${r.nKC}x${r.s}`;
const greedyOf = e => (e.greedy ? 1 : 0);
// Item-age bins over the N items trained so far: newest quarter and oldest half.
const bins = N => ({ newestQuarter: range(N - N / 4, N), oldestHalf: range(0, N / 2) });
// Per seed: means over the items in one bin.
function binStats(r, test, js) {
  const es = js.map(j => r.tests[test][j]);
  return { vGood: mean(es.map(e => e.vGood)), vBad: mean(es.map(e => e.vBad)), margin: mean(es.map(e => e.margin)),
    greedyShare: mean(es.map(greedyOf)), acqMargin: mean(js.map(j => r.acq[j])) };
}
// Across seeds: medians.
const medianAcross = stats => Object.fromEntries(BIN_KEYS.map(k => [k, median(stats.map(s => s[k]))]));

function summarizeA(group) {
  return Object.fromEntries(Object.entries(by(group, sizeOf)).map(([size, runs]) => {
    const { nKC, s, items } = runs[0];
    const checkpoints = Object.fromEntries(CHECKPOINTS.filter(N => N <= items).map(N => {
      const test = `T${N}`, { newestQuarter, oldestHalf } = bins(N);
      return [test, { coverage: (N * s) / nKC,
        newestQuarter: medianAcross(runs.map(r => binStats(r, test, newestQuarter))),
        oldestHalf: medianAcross(runs.map(r => binStats(r, test, oldestHalf))) }];
    }));
    return [size, checkpoints];
  }));
}

function summarizeB(group) {
  return Object.fromEntries(Object.entries(by(group, sizeOf)).map(([size, runs]) => [size, {
    item1Margin: median(runs.map(r => r.tests.Rev[0].margin)),
    otherItemRatio: median(runs.map(r => {
      const before = r.tests[`T${r.reversalAt}`];
      return median(range(1, r.items).map(j => ratio(r.tests.Rev[j].margin, before[j].margin)));
    })),
  }]));
}

function summarizeC(group) {
  return Object.fromEntries(Object.entries(by(group, r => String(r.jitter))).map(([jitter, runs]) => {
    const ref = `T${runs[0].items}`;
    const meanMargin = test => median(runs.map(r => mean(r.tests[test].map(e => e.margin))));
    const greedyShare = test => median(runs.map(r => mean(r.tests[test].map(greedyOf))));
    const t8 = meanMargin(ref);
    const levels = Object.fromEntries(runs[0].delayLevels.map(l => [l, { meanMargin: meanMargin(`D${l}`), greedyShare: greedyShare(`D${l}`) }]));
    const halfLevel = runs[0].delayLevels.find(l => levels[l].meanMargin < t8 / 2) ?? 'not reached';
    return [jitter, { size: sizeOf(runs[0]), reference: { test: ref, meanMargin: t8, greedyShare: greedyShare(ref) }, levels, halfLevel }];
  }));
}

// Records carry a `part` label ('A', 'B' or 'C') set by the CLI. Medians are across seeds; per-seed item statistics are means (Part B ratio: median).
export function summarizeCapacityV2(records) {
  const part = p => records.filter(r => r.part === p);
  return { schema: 'capacity-delay-assay-summary-v2', partA: perRule(part('A'), summarizeA), partB: perRule(part('B'), summarizeB), partC: perRule(part('C'), summarizeC) };
}
