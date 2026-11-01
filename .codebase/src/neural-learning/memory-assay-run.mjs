// Runs memory-assay trajectories per arm (assay spec section 4). The learner sees frames and pulses only.
import { createHash } from 'node:crypto';
import { buildFixture, buildSchedule, mulberry32 } from './memory-assay-fixture.mjs';
import { goodImage, buildCertificate } from './memory-assay-truth.mjs';
import { checkCertificate } from './memory-assay-checker.mjs';
import { createRule, DAN_REST } from './memory-assay-adapters.mjs';

export const TEMPERATURE = 0.1;
const ARM_SALT = { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 };
const FLOOR_GAIN = 0.21; // gMin + 0.01 (acceptance plan section 4)
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// SeparateTable keeps its learned state in a table, not in gains, so its table joins the gains hash.
const gainsHash = (rule, g) => digest({ P: [...g.P], R: [...g.R], snapshot: rule.name === 'SeparateTable' ? rule.snapshot() : null });

function shuffle(xs, rng) {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
}

function runArm({ ruleName, fixture, schedule, arm, yoked = null, temperature = TEMPERATURE, danDip = 0, captureGains = false }) {
  if (!Object.hasOwn(ARM_SALT, arm)) throw Error(`Unknown arm ${arm}`);
  if (arm === 'shuffled' && !yoked) throw Error('Shuffled arm needs yoked valences');
  const { nKC: n, s, w, bg, images } = fixture;
  const rule = createRule(ruleName, fixture);
  const rng = mulberry32((fixture.seed ^ ARM_SALT[arm]) >>> 0);
  const informative = arm === 'informative', learns = arm !== 'disabled';
  const bgVector = new Float64Array(n).fill(1.5 * bg);
  const aEdges = [...new Set([...images['A+'].focal, ...images['A-'].focal])];
  const floorOf = g => ({ P: aEdges.filter(i => g.P[i] <= FLOOR_GAIN).length / aEdges.length, R: aEdges.filter(i => g.R[i] <= FLOOR_GAIN).length / aEdges.length });
  const initialStateHash = rule.stateHash();
  let gStart = rule.gains();
  const initialGainsHash = gainsHash(rule, gStart);
  // Every frame passes here, so the inactive-KC marks see the frames the rule sees.
  let marks = null;
  const present = (kcH, danP, danR, dt) => {
    if (marks) for (let i = 0; i < n; i++) if (kcH[i] !== 0) marks[i] = 1;
    if (learns) rule.frame({ kcH, danP, danR, dt });
  };
  const realized = Object.fromEntries(schedule.phases.map(p => [p.name, []]));
  const pulses = {}, tests = {}, floorOcc = {}, inactiveDrift = {}, capturedGains = {}, cursor = {};
  let prevHash = 'genesis', certsChecked = 0, certsRejected = 0, pulseCount = 0, matches = 0;
  for (const phase of schedule.phases) {
    marks = bg === 0 ? new Uint8Array(n) : null;
    const counts = pulses[phase.name] = { reward: 0, punish: 0, none: 0 };
    cursor[phase.name] = 0;
    for (const trial of phase.trials) {
      const { item, unknown, situation = null } = trial;
      const order = [`${item}+`, `${item}-`];
      if (fixture.flip) order.reverse();
      const scores = {};
      for (const id of order) {
        present(images[id].h, DAN_REST, DAN_REST, 1);
        scores[id] = rule.value(id, images[id].h);
        present(bgVector, DAN_REST, DAN_REST, 4);
      }
      const [first, second] = order;
      const pFirst = 1 / (1 + Math.exp((scores[second] - scores[first]) / temperature));
      const chosenId = rng() < pFirst ? first : second;
      const cert = buildCertificate({ fixtureId: fixture.id, scheduleHash: schedule.hash, phase: phase.name, global: trial.global, item, situation, prevHash, chosen: chosenId, scores, unknown });
      const check = checkCertificate(cert, { fixtureId: fixture.id, scheduleHash: schedule.hash, prevHash, unknown });
      prevHash = cert.hash; certsChecked++;
      let valence = null;
      if (!check.ok) certsRejected++;
      else if (!unknown && arm === 'shuffled') {
        const list = yoked[phase.name];
        if (cursor[phase.name] >= list.length) throw Error(`Yoked valences exhausted in ${phase.name}`);
        valence = list[cursor[phase.name]++];
      } else if (!unknown && arm !== 'absent') valence = cert.consequence === 'good' ? 'reward' : 'punish';
      counts[valence ?? 'none']++;
      if (valence) {
        pulseCount++;
        if (cert.consequence === (valence === 'reward' ? 'good' : 'bad')) matches++;
        if (informative) realized[phase.name].push(valence);
      }
      const chosen = images[chosenId].h;
      present(chosen, DAN_REST, DAN_REST, 1);
      const [danP, danR] = valence === 'reward' ? [danDip, 1.5] : valence === 'punish' ? [1.5, danDip] : [DAN_REST, DAN_REST]; // reciprocal: Cohn et al., Cell 2015
      present(chosen, danP, danR, 1);
      if (valence && learns) rule.noteEvent(chosenId, valence);
      present(bgVector, DAN_REST, DAN_REST, 4);
    }
    const gEnd = rule.gains();
    if (marks && marks.includes(0)) {
      let P = 0, R = 0;
      for (let i = 0; i < n; i++) if (marks[i] === 0) { P = Math.max(P, Math.abs(gEnd.P[i] - gStart.P[i])); R = Math.max(R, Math.abs(gEnd.R[i] - gStart.R[i])); }
      inactiveDrift[phase.name] = { P, R };
    } else inactiveDrift[phase.name] = null;
    if (phase.test) {
      const test = {};
      for (const item of ['A', 'B', 'C']) {
        const good = goodImage(item, phase.name), bad = good === `${item}+` ? `${item}-` : `${item}+`;
        const vGood = rule.value(good, images[good].h), vBad = rule.value(bad, images[bad].h), m = vGood - vBad;
        test[item] = { good, bad, vGood, vBad, m, mNorm: m / (1.6 * (1 - w)), greedy: m > 0 };
      }
      tests[phase.test] = test;
      floorOcc[phase.test] = floorOf(gEnd);
      if (captureGains) capturedGains[phase.test] = { P: [...gEnd.P], R: [...gEnd.R] };
    }
    gStart = gEnd;
  }
  const finalStateHash = rule.stateHash(), finalGainsHash = gainsHash(rule, gStart);
  const R = tests.T1?.A.m > 0 ? tests.T2.A.m / tests.T1.A.m : null;
  const agreement = pulseCount ? matches / pulseCount : null;
  // A phase with one valence is not degeneracy: the arm still gets it on its own choices, so contingency stays broken.
  const degenerate = arm === 'shuffled' ? agreement >= 0.95 || new Set(Object.values(yoked).flat()).size < 2 : null;
  const singleValencePhases = arm === 'shuffled' ? Object.values(yoked).filter(list => new Set(list).size === 1).length : null;
  const record = { rule: ruleName, arm, seed: fixture.seed, nKC: n, s, q: fixture.q, relation: fixture.relation, w, bg,
    fixtureId: fixture.id, scheduleHash: schedule.hash, actual: fixture.actual, tests, R, floorOcc, pulses,
    realized: informative ? realized : {}, agreement, degenerate, singleValencePhases, initialStateHash, finalStateHash, initialGainsHash, finalGainsHash,
    certsChecked, certsRejected, inactiveDrift, eventsDuringTests: 0 };
  if (captureGains) record.capturedGains = capturedGains;
  return { rule, record };
}

export function runTrajectory(args) {
  return runArm(args).record;
}

// Identical inputs in both situations: exactly one of E1 and E2 is right unless the two values tie, and then both are wrong.
export function runConflict({ ruleName, fixture, schedule, temperature = TEMPERATURE }) {
  const { rule } = runArm({ ruleName, fixture, schedule, arm: 'informative', temperature });
  const greedy = situation => { const good = goodImage('E', 'CONFLICT', situation), bad = good === 'E+' ? 'E-' : 'E+'; return rule.value(good, fixture.images[good].h) > rule.value(bad, fixture.images[bad].h); };
  const finalGreedyCorrect = { E1: greedy('E1'), E2: greedy('E2') };
  return { rule: ruleName, seed: fixture.seed, finalGreedyCorrect, accuracy: (Number(finalGreedyCorrect.E1) + Number(finalGreedyCorrect.E2)) / 2 };
}

export function runCellSeed({ ruleName, cell, seed, nKC = 200, s = 20, temperature = TEMPERATURE, danDip = 0, captureGains = false }) {
  const fixture = buildFixture({ seed, nKC, s, ...cell });
  const schedule = buildSchedule({ seed });
  const common = { ruleName, fixture, schedule, temperature, danDip };
  const informative = runArm({ ...common, arm: 'informative', captureGains }).record;
  const yoked = Object.fromEntries(schedule.phases.map((p, pi) => [p.name, shuffle([...informative.realized[p.name]], mulberry32((seed ^ 0x77 ^ pi) >>> 0))]));
  return [
    informative,
    runArm({ ...common, arm: 'absent' }).record,
    runArm({ ...common, arm: 'shuffled', yoked }).record,
    runArm({ ...common, arm: 'disabled' }).record,
  ];
}
