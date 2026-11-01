// Joint long-term-memory assay v3 (spec: research/reports/memory-retention-continuation-2026-10-31/joint-ltm-v3-spec.md).
// Synthetic fixture with a chosen delay-noise model. Not graph data and not fly physiology.
import { createHash } from 'node:crypto';
import { mulberry32 } from './memory-assay-fixture.mjs';
import { createRule, DAN_REST } from './memory-assay-adapters.mjs';
import { buildCapacityFixture } from './capacity-delay-assay.mjs';

const TEMPERATURE = 0.1, STEP = 4, NORM = 1.6, TRIALS = 24, NEW_ITEMS = 2; // NORM: spec mNorm = (v(good) - v(bad)) / 1.6
const JITTER = 0.1, ACTIVE_FRACTION = 0.1; // delay noise: e=.1 on each DAN, 10% of KC cells active
const ARM_SALT = { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 }; // v1 salts
const DELAY_SALT = 0x6a09e667; // own generator, so delay draws never consume the choice stream
const REWARD_DAN = [0, 1.5], PUNISH_DAN = [1.5, 0]; // [danP, danR], as in v1 and v2
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const flip = id => `${id.slice(0, -1)}${id.endsWith('+') ? '-' : '+'}`;
const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i);
const median = xs => { const a = [...xs].sort((p, q) => p - q), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };
const fraction = xs => xs.filter(Boolean).length / xs.length;
const ratio = (num, den) => (den > 0 ? num / den : 0); // v1 convention: no positive reference margin counts as no retained margin
function shuffle(xs, rng) {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
}

// The fixture holds N+2 items: the last two are trained only in step 6. delay and laterDelay are in model units (spec defaults).
export function runJointArm({ ruleName, fixture, seed, arm, yoked = null, interruptRestore = false, delay = 6400, laterDelay = 1600 }) {
  if (!Object.hasOwn(ARM_SALT, arm)) throw Error(`Unknown arm ${arm}`);
  if (arm === 'shuffled' && !yoked) throw Error('Shuffled arm needs yoked valences');
  const N = fixture.items - NEW_ITEMS;
  if (N < 1) throw Error('Fixture must hold N+2 items');
  const { nKC: n, images } = fixture;
  let rule = createRule(ruleName, fixture);
  const choice = mulberry32((seed ^ ARM_SALT[arm]) >>> 0), delayRng = mulberry32((seed ^ DELAY_SALT) >>> 0);
  const learns = arm !== 'disabled';
  const zeros = new Float64Array(n);
  const frame = (kcH, danP, danR, dt) => { if (learns) rule.frame({ kcH, danP, danR, dt }); };
  const gainsHash = () => { const g = rule.gains(); return digest({ P: [...g.P], R: [...g.R] }); };
  const initialGainsHash = gainsHash();
  let reversed = false;
  const goodOf = j => (reversed && j === 0 ? 'X0-' : `X${j}+`);
  // Value reads only: no frames, no state change.
  const read = good => {
    const bad = flip(good), vGood = rule.value(good, images[good].h), vBad = rule.value(bad, images[bad].h), margin = vGood - vBad;
    return { vGood, vBad, mNorm: margin / NORM, greedy: margin > 0 };
  };
  const tests = {}, pulses = {}, realized = {};
  const probe = (name, count) => { tests[name] = Array.from({ length: count }, (_, j) => read(goodOf(j))); };
  let trialIndex = 0;
  const runBlock = (name, item, good) => {
    const counts = pulses[name] = { reward: 0, punish: 0, none: 0 }, delivered = realized[name] = [];
    let cursor = 0;
    for (let t = 0; t < TRIALS; t++) {
      const unknown = (trialIndex + 1) % 8 === 0; // every eighth trial overall, no pulse
      trialIndex++;
      const pair = [`X${item}+`, `X${item}-`], scores = {};
      for (const id of pair) {
        frame(images[id].h, DAN_REST, DAN_REST, 1);
        scores[id] = rule.value(id, images[id].h);
        frame(zeros, DAN_REST, DAN_REST, STEP);
      }
      const [first, second] = pair;
      const pFirst = 1 / (1 + Math.exp((scores[second] - scores[first]) / TEMPERATURE));
      const chosenId = choice() < pFirst ? first : second;
      let valence = null;
      if (!unknown && learns && arm !== 'absent') {
        if (arm === 'shuffled') {
          const list = yoked[name];
          if (!list || cursor >= list.length) throw Error(`Yoked valences exhausted in ${name}`);
          valence = list[cursor++];
        } else valence = chosenId === good ? 'reward' : 'punish';
      }
      if (valence) { counts[valence]++; delivered.push(valence); } else counts.none++;
      frame(images[chosenId].h, DAN_REST, DAN_REST, 1);
      const [danP, danR] = valence === 'reward' ? REWARD_DAN : valence === 'punish' ? PUNISH_DAN : [DAN_REST, DAN_REST];
      frame(images[chosenId].h, danP, danR, 1);
      if (valence) rule.noteEvent(chosenId, valence);
      frame(zeros, DAN_REST, DAN_REST, STEP);
    }
  };
  // One delay step: 10% of KC cells at h in [0.9, 1.5], and each DAN at DAN_REST * (1 + e) with e in [-JITTER, JITTER].
  const delayStep = () => {
    const kcH = new Float64Array(n), cells = new Set(), want = Math.round(ACTIVE_FRACTION * n);
    while (cells.size < want) cells.add(Math.floor(delayRng() * n));
    for (const k of cells) kcH[k] = 0.9 + 0.6 * delayRng();
    const eP = JITTER * (2 * delayRng() - 1), eR = JITTER * (2 * delayRng() - 1);
    frame(kcH, DAN_REST * (1 + eP), DAN_REST * (1 + eR), STEP);
  };
  const delayFor = units => { for (let u = 0; u < units; u += STEP) delayStep(); };

  // Step 1: train items in order, testing after each.
  for (let i = 0; i < N; i++) { runBlock(`B${i + 1}`, i, `X${i}+`); probe(`T${i + 1}`, i + 1); }
  const gainsBeforeDelayHash = gainsHash();
  // Step 2: delay, then test.
  delayFor(delay);
  probe('Delay', N);
  // Step 3: save to JSON and restore into a fresh rule.
  if (interruptRestore) {
    const saved = JSON.stringify(rule.snapshot());
    rule = createRule(ruleName, fixture);
    rule.restore(JSON.parse(saved));
  }
  // Step 4: reverse item 1, then test.
  reversed = true;
  runBlock('REV', 0, 'X0-');
  probe('Rev', N);
  // Step 5: delay, then test.
  delayFor(laterDelay);
  probe('Later', N);
  // Step 6: two new items, each trained then tested at its own test.
  for (let k = 0; k < NEW_ITEMS; k++) {
    const item = N + k;
    runBlock(`NEW${k + 1}`, item, `X${item}+`);
    probe(`T${item + 1}`, item + 1);
  }
  return { rule: ruleName, arm, seed, interruptRestore, nKC: n, s: fixture.s, items: N, fixtureId: fixture.id, delay, laterDelay,
    tests, pulses, realized, gainsBeforeDelayHash, initialGainsHash, finalStateHash: rule.stateHash(), finalGainsHash: gainsHash() };
}

// Seed runner. Frozen rule: restored informative run, uninterrupted informative copy (C10), absent, shuffled (yoked), disabled.
// Comparison rule: restored informative run only.
export function runJointSeed({ ruleName, nKC, s, items, seed, frozen }) {
  const fixture = buildCapacityFixture({ seed, nKC, s, items: items + NEW_ITEMS });
  const informative = runJointArm({ ruleName, fixture, seed, arm: 'informative', interruptRestore: true });
  if (!frozen) return [informative];
  const yoked = Object.fromEntries(Object.entries(informative.realized).map(([name, list], bi) => [name, shuffle([...list], mulberry32((seed ^ 0x77 ^ bi) >>> 0))]));
  return [informative,
    runJointArm({ ruleName, fixture, seed, arm: 'informative', interruptRestore: false }),
    runJointArm({ ruleName, fixture, seed, arm: 'absent' }),
    runJointArm({ ruleName, fixture, seed, arm: 'shuffled', yoked }),
    runJointArm({ ruleName, fixture, seed, arm: 'disabled' })];
}

// Marks C1-C10 from the spec table. Records of one rule and one size. Medians are across seeds; per-seed shares and ratio medians are taken over items.
// Oldest half of an odd N rounds down (N=3 gives item 0 only); the CLI uses N=8 and N=16, where this is exact.
export function evaluateJoint(records) {
  const inf = records.filter(r => r.arm === 'informative' && r.interruptRestore === true);
  if (!inf.length) throw Error('No restored informative records');
  if (new Set(records.map(r => `${r.rule}|${r.nKC}|${r.s}|${r.items}`)).size !== 1) throw Error('evaluateJoint takes records of one rule and one size');
  const N = inf[0].items, ALL = range(0, N), OLD = range(0, Math.floor(N / 2)), LAST = `T${N}`;
  const m = (r, t, j) => r.tests[t][j].mNorm, g = (r, t, j) => r.tests[t][j].greedy;
  const share = (r, t, js) => fraction(js.map(j => g(r, t, j)));
  const acrossSeeds = fn => median(inf.map(fn));
  // Own test of item j is T{j+1}: items 0..N-1 are C1, items N and N+1 are C9.
  const own = Array.from({ length: N + NEW_ITEMS }, (_, j) => ({ margin: median(inf.map(r => m(r, `T${j + 1}`, j))), greedy: fraction(inf.map(r => g(r, `T${j + 1}`, j))) }));
  const out = {};

  out.C1 = { pass: own.slice(0, N).every(x => x.margin >= 0.4 && x.greedy >= 0.9), observed: { minMedianMNorm: Math.min(...own.slice(0, N).map(x => x.margin)), minGreedyShare: Math.min(...own.slice(0, N).map(x => x.greedy)) } };

  const c2 = acrossSeeds(r => share(r, LAST, OLD));
  out.C2 = { pass: c2 >= 0.9, observed: c2 };

  const c3 = acrossSeeds(r => median(OLD.map(j => ratio(m(r, LAST, j), m(r, `T${j + 1}`, j)))));
  out.C3 = { pass: c3 >= 0.5, observed: c3 };

  const c4Share = acrossSeeds(r => share(r, 'Delay', ALL)), c4Ratio = acrossSeeds(r => median(ALL.map(j => ratio(m(r, 'Delay', j), m(r, LAST, j)))));
  out.C4 = { pass: c4Share >= 0.9 && c4Ratio >= 0.7, observed: { share: c4Share, ratio: c4Ratio } };

  const c5 = { medianMNorm: median(inf.map(r => m(r, 'Rev', 0))), greedyShare: fraction(inf.map(r => g(r, 'Rev', 0))) };
  out.C5 = { pass: c5.medianMNorm >= 0.4 && c5.greedyShare >= 0.9, observed: c5 };

  const c6 = acrossSeeds(r => median(range(1, N).map(j => ratio(m(r, 'Rev', j), m(r, 'Delay', j)))));
  out.C6 = { pass: c6 >= 0.9, observed: c6 };

  // C7 hash checks compare gainsBeforeDelayHash with initialGainsHash, and every control seed must pass.
  const of = a => records.filter(r => r.arm === a);
  const absent = of('absent'), disabled = of('disabled'), shuffled = of('shuffled');
  if (!absent.length || !disabled.length || !shuffled.length) out.C7 = { pass: null, observed: 'no control arms' };
  else {
    const unchanged = rs => rs.every(r => r.gainsBeforeDelayHash === r.initialGainsHash);
    const shuffledShare = median(shuffled.map(r => share(r, LAST, ALL)));
    const informativeShare = acrossSeeds(r => share(r, LAST, ALL));
    out.C7 = { pass: unchanged(absent) && unchanged(disabled) && shuffledShare < 0.75 && informativeShare >= shuffledShare + 0.25,
      observed: { absentUnchanged: unchanged(absent), disabledUnchanged: unchanged(disabled), shuffledShare, informativeShare } };
  }

  const c8 = { medianMNorm: median(inf.map(r => m(r, 'Later', 0))), greedyShare: fraction(inf.map(r => g(r, 'Later', 0))) };
  out.C8 = { pass: c8.medianMNorm >= 0.3 && c8.greedyShare >= 0.9, observed: c8 };

  const c9 = own.slice(N);
  out.C9 = { pass: c9.every(x => x.margin >= 0.4 && x.greedy >= 0.9), observed: c9 };

  const uninterrupted = records.filter(r => r.arm === 'informative' && r.interruptRestore === false);
  if (!uninterrupted.length) out.C10 = { pass: null, observed: 'no uninterrupted copy' };
  else {
    const key = r => JSON.stringify([r.tests, r.pulses, r.realized, r.gainsBeforeDelayHash, r.finalStateHash, r.finalGainsHash]);
    const bySeed = new Map(uninterrupted.map(r => [r.seed, r]));
    const exact = inf.filter(r => bySeed.has(r.seed) && key(bySeed.get(r.seed)) === key(r)).length;
    out.C10 = { pass: exact === inf.length, observed: { seeds: inf.length, exactMatches: exact } };
  }
  return out;
}
