// Capacity-delay assay (spec: research/reports/memory-retention-continuation-2026-10-31/capacity-delay-spec.md).
// Synthetic fixture with a chosen delay-noise model. Not graph data and not fly physiology.
import { createHash } from 'node:crypto';
import { mulberry32 } from './memory-assay-fixture.mjs';
import { createRule, DAN_REST } from './memory-assay-adapters.mjs';

const TEMPERATURE = 0.1, NORM = 1.6; // NORM: spec mNorm = (v(good) - v(bad)) / 1.6
const STEP = 4; // trial gap and delay step, both 4 units
const ARM_SALT = { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 };
const DELAY_SALT = 0x6a09e667; // own generator, so delay draws never consume the choice stream
const DELAY_LEVELS = [0, 400, 1600, 6400], DELAY_CELL_FRACTION = 0.1, DELAY_DAN_JITTER = 0.1;
const REWARD_DAN = [0, 1.5], PUNISH_DAN = [1.5, 0]; // [danP, danR], reciprocal with danDip 0 as in memory-assay-run
const EARLY_ITEMS = 8;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// SeparateTable keeps its learned state in a table, so the table joins the gains hash (as in memory-assay-run).
const gainsHash = (rule, g) => digest({ P: [...g.P], R: [...g.R], snapshot: rule.name === 'SeparateTable' ? rule.snapshot() : null });

function shuffle(xs, rng) {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
}

export function buildCapacityFixture({ seed, nKC = 200, s = 20, items = 16 }) {
  const rng = mulberry32(seed);
  const baseP = new Float64Array(nKC), baseR = new Float64Array(nKC);
  for (let i = 0; i < nKC; i++) { baseP[i] = 0.5 + rng(); baseR[i] = 0.5 + rng(); }
  const images = {};
  for (let i = 0; i < items; i++) {
    // Each item draws its own pool, so items are independent; the two images of one item take disjoint halves.
    const pool = shuffle(Array.from({ length: nKC }, (_, k) => k), rng);
    for (const [sign, part] of [['+', pool.slice(0, s)], ['-', pool.slice(s, 2 * s)]]) {
      const name = `X${i}${sign}`, focal = Int32Array.from(part).sort(), h = new Float64Array(nKC);
      for (const k of focal) h[k] = 0.9 + 0.6 * rng();
      images[name] = { id: name, focal, h };
    }
  }
  const plain = Object.fromEntries(Object.entries(images).map(([name, im]) => [name, { focal: [...im.focal], h: [...im.h] }]));
  const id = digest({ seed, nKC, s, items, baseP: [...baseP], baseR: [...baseR], images: plain });
  const overlap = (a, b) => { const S = new Set(images[a].focal); return images[b].focal.filter(k => S.has(k)).length / s; };
  const within = Math.max(...Array.from({ length: items }, (_, i) => overlap(`X${i}+`, `X${i}-`)));
  const cross = [];
  for (let i = 0; i < items; i++) for (let j = i + 1; j < items; j++) for (const a of ['+', '-']) for (const b of ['+', '-']) cross.push(overlap(`X${i}${a}`, `X${j}${b}`));
  return { id, seed, nKC, s, items, w: 0, bg: 0, baseP, baseR, images,
    actual: { withinPairOverlapMax: within, crossItemOverlapMean: cross.reduce((x, y) => x + y, 0) / cross.length, crossItemOverlapMax: Math.max(...cross) } };
}

export function runCapacityArm({ ruleName, fixture, seed, arm, yoked = null, temperature = TEMPERATURE, noise = true }) {
  if (!Object.hasOwn(ARM_SALT, arm)) throw Error(`Unknown arm ${arm}`);
  if (arm === 'shuffled' && !yoked) throw Error('Shuffled arm needs yoked valences');
  const { nKC: n, images, items } = fixture;
  const rule = createRule(ruleName, fixture);
  const choice = mulberry32((seed ^ ARM_SALT[arm]) >>> 0), delay = mulberry32((seed ^ DELAY_SALT) >>> 0);
  const informative = arm === 'informative', learns = arm !== 'disabled';
  const zeros = new Float64Array(n);
  const frame = (kcH, danP, danR, dt) => { if (learns) rule.frame({ kcH, danP, danR, dt }); };
  const initialStateHash = rule.stateHash(), initialGainsHash = gainsHash(rule, rule.gains());
  const tests = {}, pulses = {}, realized = {};
  // Value reads only: no frames, no state change.
  const probe = (name, count, goodOf) => {
    const at = {};
    for (let j = 0; j < count; j++) {
      const good = goodOf(j), bad = good === `X${j}+` ? `X${j}-` : `X${j}+`;
      const margin = rule.value(good, images[good].h) - rule.value(bad, images[bad].h);
      at[j] = { good, margin, mNorm: margin / NORM, greedy: margin > 0 };
    }
    tests[name] = at;
  };
  let trialIndex = 0;
  const runBlock = (name, item, good) => {
    const counts = pulses[name] = { reward: 0, punish: 0, none: 0 }, learnedList = realized[name] = [];
    let cursor = 0;
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
      let valence = null;
      if (!unknown && learns && arm !== 'absent') {
        if (arm === 'shuffled') {
          const yokeList = yoked[name];
          if (!yokeList || cursor >= yokeList.length) throw Error(`Yoked valences exhausted in ${name}`);
          valence = yokeList[cursor++];
        } else valence = chosenId === good ? 'reward' : 'punish';
      }
      if (valence) { counts[valence]++; if (informative) learnedList.push(valence); } else counts.none++;
      frame(images[chosenId].h, DAN_REST, DAN_REST, 1);
      const [danP, danR] = valence === 'reward' ? REWARD_DAN : valence === 'punish' ? PUNISH_DAN : [DAN_REST, DAN_REST];
      frame(images[chosenId].h, danP, danR, 1);
      if (valence) rule.noteEvent(chosenId, valence);
      frame(zeros, DAN_REST, DAN_REST, STEP);
    }
  };
  for (let i = 0; i < items; i++) {
    runBlock(`B${i + 1}`, i, `X${i}+`);
    probe(`T${i + 1}`, i + 1, j => `X${j}+`);
  }
  // Captured before the delay stage: absent and disabled never teach, and delay noise comes after this point.
  const gainsT16Hash = gainsHash(rule, rule.gains());
  // One delay step: 20 fresh KC cells at h in [0.9, 1.5], and each DAN at 0.75 * (1 + e) with e in [-0.1, 0.1].
  const delayStep = () => {
    const kcH = new Float64Array(n), cells = new Set();
    while (cells.size < Math.round(DELAY_CELL_FRACTION * n)) cells.add(Math.floor(delay() * n));
    for (const k of cells) kcH[k] = 0.9 + 0.6 * delay();
    const eP = DELAY_DAN_JITTER * (2 * delay() - 1), eR = DELAY_DAN_JITTER * (2 * delay() - 1);
    frame(kcH, DAN_REST * (1 + eP), DAN_REST * (1 + eR), STEP);
  };
  let delayed = 0;
  for (const level of DELAY_LEVELS) {
    for (; delayed < level; delayed += STEP) if (noise) delayStep();
    probe(`D${level}`, items, j => `X${j}+`);
  }
  runBlock('REV', 0, 'X0-');
  probe('Rev', items, j => (j === 0 ? 'X0-' : `X${j}+`));
  return { rule: ruleName, arm, seed, items, noise, fixtureId: fixture.id, actual: fixture.actual, tests, pulses,
    realized: informative ? realized : {}, initialStateHash, finalStateHash: rule.stateHash(),
    initialGainsHash, gainsT16Hash, finalGainsHash: gainsHash(rule, rule.gains()) };
}

export function runCapacitySeed({ ruleName, seed, withControls, items = 16 }) {
  const fixture = buildCapacityFixture({ seed, items });
  const informative = runCapacityArm({ ruleName, fixture, seed, arm: 'informative' });
  if (!withControls) return [informative];
  const yoked = Object.fromEntries(Object.entries(informative.realized).map(([name, list], bi) => [name, shuffle([...list], mulberry32((seed ^ 0x77 ^ bi) >>> 0))]));
  return [informative,
    runCapacityArm({ ruleName, fixture, seed, arm: 'absent' }),
    runCapacityArm({ ruleName, fixture, seed, arm: 'shuffled', yoked }),
    runCapacityArm({ ruleName, fixture, seed, arm: 'disabled' })];
}

const median = xs => { const a = [...xs].sort((p, q) => p - q), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };
const fraction = xs => xs.filter(Boolean).length / xs.length;
const ratio = (num, den) => (den > 0 ? num / den : 0); // no positive reference margin counts as no retained margin

// Records of one rule. Per-seed summaries over items use a median (margin ratios) or a share (greedy); the mark is the median across seeds.
export function evaluateCapacity(records) {
  if (new Set(records.map(r => r.rule)).size !== 1) throw Error('evaluateCapacity takes records of one rule');
  const inf = records.filter(r => r.arm === 'informative');
  if (!inf.length) throw Error('No informative records');
  const N = inf[0].items, ALL = Array.from({ length: N }, (_, j) => j), EARLY = ALL.slice(0, EARLY_ITEMS);
  const LAST = `T${N}`;
  const m = (r, t, j) => r.tests[t][j].mNorm, g = (r, t, j) => r.tests[t][j].greedy;
  const share = (r, t, js) => fraction(js.map(j => g(r, t, j)));
  const acrossSeeds = fn => median(inf.map(fn));
  const out = {};

  const c1 = ALL.map(j => ({ margin: median(inf.map(r => m(r, `T${j + 1}`, j))), greedy: fraction(inf.map(r => g(r, `T${j + 1}`, j))) }));
  out.C1 = { pass: c1.every(x => x.margin >= 0.4 && x.greedy >= 0.9), observed: { minMedianMNorm: Math.min(...c1.map(x => x.margin)), minGreedyShare: Math.min(...c1.map(x => x.greedy)) } };

  const c2 = acrossSeeds(r => share(r, LAST, EARLY));
  out.C2 = { pass: c2 >= 0.9, observed: c2 };

  const c3 = acrossSeeds(r => median(EARLY.map(j => ratio(m(r, LAST, j), m(r, `T${j + 1}`, j)))));
  out.C3 = { pass: c3 >= 0.5, observed: c3 };

  const c4Share = acrossSeeds(r => share(r, 'D6400', ALL)), c4Ratio = acrossSeeds(r => median(ALL.map(j => ratio(m(r, 'D6400', j), m(r, LAST, j)))));
  out.C4 = { pass: c4Share >= 0.9 && c4Ratio >= 0.7, observed: { share: c4Share, ratio: c4Ratio } };

  const c5Margin = median(inf.map(r => m(r, 'Rev', 0))), c5Greedy = fraction(inf.map(r => g(r, 'Rev', 0)));
  out.C5 = { pass: c5Margin >= 0.4 && c5Greedy >= 0.9, observed: { medianMNorm: c5Margin, greedyShare: c5Greedy } };

  const c6 = acrossSeeds(r => median(ALL.slice(1).map(j => ratio(m(r, 'Rev', j), m(r, 'D6400', j)))));
  out.C6 = { pass: c6 >= 0.9, observed: c6 };

  // C7 hash checks compare gainsT16Hash (before the delay) with the initial gains, and every seed must pass.
  const arms = a => records.filter(r => r.arm === a);
  const absent = arms('absent'), disabled = arms('disabled'), shuffled = arms('shuffled');
  if (!absent.length || !disabled.length || !shuffled.length) out.C7 = { pass: null, observed: 'no control arms' };
  else {
    const unchanged = rs => rs.every(r => r.gainsT16Hash === r.initialGainsHash);
    const shuffledShare = median(shuffled.map(r => share(r, LAST, ALL)));
    const informativeShare = acrossSeeds(r => share(r, LAST, ALL));
    out.C7 = { pass: unchanged(absent) && unchanged(disabled) && shuffledShare < 0.75 && informativeShare >= shuffledShare + 0.25,
      observed: { absentUnchanged: unchanged(absent), disabledUnchanged: unchanged(disabled), shuffledShare, informativeShare } };
  }
  return out;
}
