// Separate event replay, not a call back into the producer loop or teacher table.
// Shares the pinned memory classes and fixture PRNG; this is an internal audit, not numerical replication.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { buildFixture, buildSchedule, mulberry32 } from './memory-assay-fixture.mjs';
import { createRule, DAN_REST } from './memory-assay-adapters.mjs';
import { checkCertificate, hashRecord } from './memory-assay-checker-v2.mjs';

const SALTS = { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 };
const ARMS = Object.keys(SALTS);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gainHash = rule => {
  const g = rule.gains();
  return digest({ P: [...g.P], R: [...g.R], snapshot: rule.name === 'SeparateTable' ? rule.snapshot() : null });
};
const assertSame = (actual, expected, label) => { if (!isDeepStrictEqual(actual, expected)) throw Error(`Replay mismatch: ${label}`); };

function good(item, phase) {
  if (item === 'A') return ['REV1', 'REV3'].includes(phase) ? 'A-' : 'A+';
  if (item === 'B' || item === 'C') return `${item}+`;
  throw Error('Unsupported recorded assay item');
}
function permute(xs, seed) {
  const out = [...xs], random = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// `readRecord` returns the next decoded line or null. Retains one trajectory's small summaries/yoked valences only.
export function auditRecordedEvents(readRecord, expected, { onTrajectory = () => {} } = {}) {
  const summaries = [];
  let checkedRecords = 0, checkedTrials = 0, unknownTrials = 0;
  for (const seed of expected.seeds) {
    let informativeValences = null;
    for (const arm of ARMS) {
      let seq = 0, previousRecord = 'genesis';
      const fixture = buildFixture({ seed, nKC: expected.nKC, s: expected.s, ...expected.cell });
      const schedule = buildSchedule({ seed });
      const config = { ruleName: expected.ruleName, seed, nKC: expected.nKC, s: expected.s, ...expected.cell,
        arm, temperature: expected.temperature, danDip: expected.danDip };
      const id = hashRecord({ config, fixtureId: fixture.id, scheduleHash: schedule.hash });
      const take = kind => {
        const row = readRecord();
        if (!row) throw Error(`Truncated evidence before ${kind}`);
        const { hash, ...body } = row;
        if (row.schema !== 'memory-assay-phase-event-v1' || row.trajectoryId !== id || row.seq !== seq++
          || row.prevRecordHash !== previousRecord || row.kind !== kind || hashRecord(body) !== hash) throw Error(`Invalid record chain/order: ${kind}`);
        previousRecord = hash; checkedRecords++;
        return row;
      };
      const rule = createRule(expected.ruleName, fixture), start = take('start');
      assertSame(start.config, config, 'trajectory configuration');
      assertSame(start.fixtureId, fixture.id, 'fixture identity');
      assertSame(start.scheduleHash, schedule.hash, 'schedule identity');
      assertSame(start.initialSnapshot, rule.snapshot(), 'initial state');
      assertSame(start.initialStateHash, rule.stateHash(), 'initial state hash');
      assertSame(start.initialGainsHash, gainHash(rule), 'initial gains hash');
      assertSame(start.frameContract, { score: [1, 4], chosen: [1, 1, 4], danRest: DAN_REST, activityScale: 1.5 }, 'frame contract');
      const initialStateHash = rule.stateHash(), initialGainsHash = gainHash(rule);
      const rng = mulberry32((seed ^ SALTS[arm]) >>> 0), gap = new Float64Array(fixture.nKC).fill(1.5 * fixture.bg);
      const frame = (kcH, danP, danR, dt) => { if (arm !== 'disabled') rule.frame({ kcH, danP, danR, dt }); };
      const realized = {}, pulses = {}, tests = {}, floorOcc = {}, inactiveDrift = {};
      const yoked = arm === 'shuffled' ? Object.fromEntries(schedule.phases.map((p, i) => [p.name, permute(informativeValences[p.name], (seed ^ 0x77 ^ i) >>> 0)])) : null;
      let certPrevious = 'genesis', delivered = 0, applied = 0, matches = 0, rejected = 0, previousGains = rule.gains();
      const aEdges = [...new Set([...fixture.images['A+'].focal, ...fixture.images['A-'].focal])];
      for (const phase of schedule.phases) {
        realized[phase.name] = [];
        const count = pulses[phase.name] = { reward: 0, punish: 0, none: 0 };
        const active = new Set();
        let cursor = 0;
        for (const trial of phase.trials) {
          const state = { phase: phase.name, global: trial.global, item: trial.item, situation: trial.situation ?? null, unknown: trial.unknown };
          const order = [`${trial.item}+`, `${trial.item}-`];
          if (fixture.flip) order.reverse();
          const scores = {};
          for (const image of order) {
            const h = fixture.images[image].h;
            for (let k = 0; k < h.length; k++) if (h[k] !== 0) active.add(k);
            frame(h, DAN_REST, DAN_REST, 1); scores[image] = rule.value(image, h); frame(gap, DAN_REST, DAN_REST, 4);
          }
          const p = 1 / (1 + Math.exp((scores[order[1]] - scores[order[0]]) / expected.temperature));
          const chosen = rng() < p ? order[0] : order[1];
          const choice = take('choice');
          for (const [key, value] of Object.entries({ trial: state, scores, chosen, preStateHash: rule.stateHash(), gainsHash: gainHash(rule) })) assertSame(choice[key], value, `choice ${key}`);
          const feedback = take('feedback');
          assertSame(feedback.trial, state, 'feedback trial'); assertSame(feedback.chosen, chosen, 'feedback choice');
          const cert = feedback.certificate;
          const check = checkCertificate(cert, { fixtureId: fixture.id, scheduleHash: schedule.hash, prevHash: certPrevious,
            unknown: trial.unknown, expectedTrial: state, scores, chosen });
          if (!check.ok) rejected++;
          assertSame(feedback.check, check, 'check result'); certPrevious = cert.hash;
          const truth = trial.unknown ? 'unknown' : chosen === good(trial.item, phase.name) ? 'good' : 'bad';
          assertSame(feedback.trueConsequence, truth, 'true consequence');
          let valence = null;
          if (check.ok && !trial.unknown && arm !== 'absent') valence = arm === 'shuffled' ? yoked[phase.name][cursor++] : truth === 'good' ? 'reward' : 'punish';
          assertSame(feedback.deliveredValence, valence, 'delivered valence'); count[valence ?? 'none']++;
          if (valence) { delivered++; if (truth === (valence === 'reward' ? 'good' : 'bad')) matches++; if (arm === 'informative') realized[phase.name].push(valence); }
          const h = fixture.images[chosen].h;
          assertSame(feedback.activityHash, hashRecord([...h]), 'chosen activity');
          frame(h, DAN_REST, DAN_REST, 1);
          assertSame(feedback.prePulseStateHash, rule.stateHash(), 'pre-pulse state');
          assertSame(feedback.prePulseGainsHash, gainHash(rule), 'pre-pulse gains');
          const rates = valence === 'reward' ? [expected.danDip, 1.5] : valence === 'punish' ? [1.5, expected.danDip] : [DAN_REST, DAN_REST];
          assertSame([feedback.danP, feedback.danR], rates, 'delivered DAN rates');
          frame(h, ...rates, 1);
          if (valence && arm !== 'disabled') { rule.noteEvent(chosen, valence); applied++; }
          assertSame(feedback.postPulseStateHash, rule.stateHash(), 'post-pulse state'); frame(gap, DAN_REST, DAN_REST, 4);
          assertSame(feedback.postStateHash, rule.stateHash(), 'post-gap state'); assertSame(feedback.postGainsHash, gainHash(rule), 'post gains');
          assertSame([feedback.deliveredPulseCount, feedback.appliedPulseCount], [delivered, applied], 'pulse accounting');
          if (trial.unknown && valence !== null) throw Error('Unknown trial delivered feedback');
          if (valence === null || arm === 'disabled') assertSame(feedback.postGainsHash, feedback.prePulseGainsHash, 'no applied event is gain-inert');
          checkedTrials++; unknownTrials += Number(trial.unknown);
        }
        const gains = rule.gains();
        let drift = null;
        if (fixture.bg === 0 && active.size < fixture.nKC) {
          drift = { P: 0, R: 0 };
          for (let k = 0; k < fixture.nKC; k++) if (!active.has(k)) for (const c of ['P', 'R']) drift[c] = Math.max(drift[c], Math.abs(gains[c][k] - previousGains[c][k]));
        }
        inactiveDrift[phase.name] = drift;
        const outcomes = {};
        for (const item of ['A', 'B', 'C']) {
          const goodId = good(item, phase.name), bad = goodId === `${item}+` ? `${item}-` : `${item}+`;
          const vGood = rule.value(goodId, fixture.images[goodId].h), vBad = rule.value(bad, fixture.images[bad].h), m = vGood - vBad;
          outcomes[item] = { good: goodId, bad, vGood, vBad, m, mNorm: m / (1.6 * (1 - fixture.w)), greedy: m > 0 };
        }
        tests[phase.test] = outcomes;
        const floor = Object.fromEntries(['P', 'R'].map(c => [c, aEdges.filter(k => gains[c][k] <= 0.21).length / aEdges.length]));
        floorOcc[phase.test] = floor;
        const row = take('test'); assertSame(row.snapshot, rule.snapshot(), 'phase snapshot');
        for (const [key, value] of Object.entries({ phase: phase.name, test: phase.test, outcomes, floorOcc: floor, inactiveDrift: drift,
          stateHash: rule.stateHash(), gainsHash: gainHash(rule) })) assertSame(row[key], value, `test ${key}`);
        previousGains = gains;
      }
      if (arm === 'informative') informativeValences = realized;
      const end = take('end'), summary = end.summary;
      const agreement = delivered ? matches / delivered : null;
      const expectedSummary = { rule: expected.ruleName, arm, seed, nKC: fixture.nKC, s: fixture.s, ...expected.cell,
        fixtureId: fixture.id, scheduleHash: schedule.hash, actual: fixture.actual, tests,
        R: tests.T1.A.m > 0 ? tests.T2.A.m / tests.T1.A.m : null, floorOcc, pulses, realized: arm === 'informative' ? realized : {}, agreement,
        degenerate: arm === 'shuffled' ? agreement >= 0.95 || new Set(Object.values(yoked).flat()).size < 2 : null,
        singleValencePhases: arm === 'shuffled' ? Object.values(yoked).filter(xs => new Set(xs).size === 1).length : null,
        initialStateHash, finalStateHash: rule.stateHash(), initialGainsHash, finalGainsHash: gainHash(rule),
        certsChecked: schedule.phases.reduce((n, p) => n + p.trials.length, 0), certsRejected: rejected, inactiveDrift, eventsDuringTests: 0 };
      assertSame(summary, expectedSummary, 'terminal summary'); assertSame(end.finalSnapshot, rule.snapshot(), 'terminal state');
      assertSame([end.deliveredPulseCount, end.appliedPulseCount], [delivered, applied], 'terminal pulse accounting');
      summaries.push(summary);
      onTrajectory();
    }
  }
  if (readRecord() !== null) throw Error('Extra trailing evidence');
  return { checkedRecords, checkedTrials, unknownTrials, trajectories: summaries.length, summaries,
    scope: 'Internal separate event replay; pinned memory classes/fixture/checker shared. Not independent numerical replication or biological validation.' };
}
