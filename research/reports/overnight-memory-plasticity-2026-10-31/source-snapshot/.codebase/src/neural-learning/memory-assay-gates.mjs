// Gates and validity checks for the memory assay (acceptance plan sections 5 and 6).
import { buildFixture, gridCells, isGatedCell } from './memory-assay-fixture.mjs';
import { DAN_REST } from './memory-assay-adapters.mjs';

const ARMS = ['informative', 'absent', 'shuffled', 'disabled'];
const TESTS = ['T1', 'T2', 'T3', 'T4', 'T5'];
const GATES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const V3_GATES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const VALIDITY_RULES = ['ReversalMemory', 'AlphaLobeMemory', 'SeparateTable'];
const KEEP = 1 - 0.5 * (1.5 - DAN_REST) / 1.5; // eta * d = 0.25 per pulse, so 0.75 of the gap survives (V1 derivation)

// Plain subtraction gives NaN for -Infinity (a null R), so compare instead.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function median(xs) {
  if (!xs.length) throw Error('Median of no values');
  const a = [...xs].sort(cmp), m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
const share = xs => xs.filter(Boolean).length / xs.length;
const cellKey = c => `q=${c.q} ${c.relation} w=${c.w} bg=${c.bg}`;
const aFocal = f => [...new Set([...f.images['A+'].focal, ...f.images['A-'].focal])];

function groupCells(records) {
  const groups = new Map();
  for (const r of records) {
    const k = cellKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return groups;
}

// Checks one rule and one cell, and that every seed has all four arms; returns each arm aligned by seed.
function pairRecords(records) {
  if (!records.length) throw Error('No records');
  const { rule } = records[0], key = cellKey(records[0]);
  const byArm = Object.fromEntries(ARMS.map(a => [a, new Map()]));
  for (const r of records) {
    if (r.rule !== rule || cellKey(r) !== key || !byArm[r.arm]) throw Error('evaluateCell needs one rule, one cell and known arms');
    if (byArm[r.arm].has(r.seed)) throw Error(`Duplicate ${r.arm} record for seed ${r.seed}`);
    byArm[r.arm].set(r.seed, r);
  }
  const seeds = [...byArm.informative.keys()].sort((a, b) => a - b);
  for (const arm of ARMS) if (byArm[arm].size !== seeds.length || seeds.some(s => !byArm[arm].has(s))) throw Error(`Every seed needs one ${arm} record`);
  const arms = Object.fromEntries(ARMS.map(a => [a, seeds.map(s => byArm[a].get(s))]));
  const { q, relation, w, bg } = records[0];
  return { rule, cell: { q, relation, w, bg }, seeds, arms };
}

export function evaluateCell(records) {
  const { rule, cell, seeds, arms: { informative: inf, absent, shuffled, disabled } } = pairRecords(records);
  const mNorm = (list, T, item) => median(list.map(r => r.tests[T][item].mNorm));
  const greedyShare = (list, T, item) => share(list.map(r => r.tests[T][item].greedy));
  const acq = (T, item) => ({ mNorm: mNorm(inf, T, item), greedyShare: greedyShare(inf, T, item) });
  const meets = x => x.mNorm >= 0.40 && x.greedyShare >= 0.9;
  const G1A = acq('T1', 'A'), G2B = acq('T2', 'B'), G2C = acq('T2', 'C'), G3A = acq('T2', 'A'), G6B = acq('T3', 'B');
  const G4 = { T3: acq('T3', 'A'), T4: acq('T4', 'A'), T5: acq('T5', 'A') };
  const RMedian = median(inf.map(r => r.R ?? -Infinity));
  const pairs = {};
  for (const [name, ctrl] of [['absent', absent], ['disabled', disabled]]) {
    for (const [item, T] of [['A', 'T1'], ['B', 'T2']]) {
      const diff = inf.map((r, i) => r.tests[T][item].mNorm - ctrl[i].tests[T][item].mNorm);
      pairs[`${name}_${item}_${T}`] = { medianDiff: median(diff), share: share(diff.map(d => d >= 0.20)) };
    }
  }
  const gainsUnchanged = [...absent, ...disabled].every(r => r.initialGainsHash === r.finalGainsHash);
  const gates = {
    G1: { pass: meets(G1A), A_T1: G1A },
    G2: { pass: meets(G2B) && meets(G2C), B_T2: G2B, C_T2: G2C },
    G3: { pass: RMedian >= 0.70 && G3A.greedyShare >= 0.9, RMedian, A_T2: G3A },
    G4: { pass: Object.values(G4).every(meets), ...G4 },
    G5: { pass: gainsUnchanged && Object.values(pairs).every(p => p.share >= 0.9), gainsUnchanged, pairs },
    G6: { pass: G6B.greedyShare >= 0.9, B_T3: G6B },
  };
  return {
    rule, cell, gated: isGatedCell(cell), seeds, nSeeds: seeds.length,
    degenerateRate: share(shuffled.map(r => r.degenerate === true)),
    // Pooled in summarizeGrid as G5s; shuffled margins are too noisy to gate per cell (addendum v1.2).
    shuffledPool: { informative: [...inf.map(r => r.tests.T1.A.greedy), ...inf.map(r => r.tests.T2.B.greedy)], shuffled: [...shuffled.map(r => r.tests.T1.A.greedy), ...shuffled.map(r => r.tests.T2.B.greedy)],
      shuffledMNormA_T1: median(shuffled.map(r => r.tests.T1.A.mNorm)), shuffledMNormB_T2: median(shuffled.map(r => r.tests.T2.B.mNorm)) },
    RMedian,
    mNormMedian: Object.fromEntries(['A', 'B', 'C'].map(item => [item, Object.fromEntries(TESTS.map(T => [T, mNorm(inf, T, item)]))])),
    floorOccMedian: Object.fromEntries(TESTS.map(T => [T, { P: median(inf.map(r => r.floorOcc[T].P)), R: median(inf.map(r => r.floorOcc[T].R)) }])),
    gates,
    allPass: GATES.every(g => gates[g].pass),
  };
}

export function summarizeGrid(cells) {
  if (!cells.length) throw Error('Empty grid');
  const rule = cells[0].rule;
  if (cells.some(c => c.rule !== rule)) throw Error('One rule per grid');
  const gated = cells.filter(c => c.gated);
  const failingGated = gated.filter(c => !c.allPass).map(c => ({ cell: c.cell, failed: GATES.filter(g => !c.gates[g].pass) }));
  const informativeShare = share(gated.flatMap(c => c.shuffledPool.informative)), shuffledShare = share(gated.flatMap(c => c.shuffledPool.shuffled));
  const G5s = { pass: shuffledShare >= 0.35 && shuffledShare <= 0.65 && informativeShare - shuffledShare >= 0.25, informativeShare, shuffledShare };
  return { rule, G5s, cellsEvaluated: cells.length, gatedCells: gated.length, gatedCellsPassingAll: gated.length - failingGated.length,
    gatedPerGate: Object.fromEntries(GATES.map(g => [g, gated.filter(c => c.gates[g].pass).length])), failingGated, cells };
}

export function evaluateGrid(records) {
  return summarizeGrid([...groupCells(records).values()].map(evaluateCell));
}

// V1.1: A's edges that no later pattern drives follow g = 1 + (g0 - 1) * KEEP^N through ACQ_BC.
function recoveryError(runs) {
  let worst = 0, checked = 0;
  for (const r of runs) {
    if (!r.capturedGains) throw Error('V1.1 needs captured gains');
    const f = buildFixture({ seed: r.seed, nKC: r.nKC, s: r.s, q: r.q, relation: r.relation, w: r.w, bg: r.bg });
    if (f.id !== r.fixtureId) throw Error('Fixture identity mismatch');
    const driven = new Set(['B+', 'B-', 'C+', 'C-'].flatMap(id => f.images[id].focal));
    const edges = aFocal(f).filter(i => !driven.has(i));
    const N = { P: r.realized.ACQ_BC.filter(v => v === 'punish').length, R: r.realized.ACQ_BC.filter(v => v === 'reward').length };
    for (const c of ['P', 'R']) for (const i of edges) {
      const predicted = 1 + (r.capturedGains.T1[c][i] - 1) * KEEP ** N[c];
      worst = Math.max(worst, Math.abs(r.capturedGains.T2[c][i] - predicted));
      checked++;
    }
  }
  return { worst, checked };
}

// V2.1: the largest rise of any gain between the start (all 1) and any test; must not be positive.
function maxGainRise(runs) {
  let worst = -Infinity;
  for (const r of runs) {
    let prev = { P: Array(r.nKC).fill(1), R: Array(r.nKC).fill(1) };
    for (const T of TESTS) {
      const cur = r.capturedGains?.[T];
      if (!cur) throw Error('V2.1 needs captured gains');
      for (const c of ['P', 'R']) cur[c].forEach((g, i) => { worst = Math.max(worst, g - prev[c][i]); });
      prev = cur;
    }
  }
  return worst;
}

export function validityCheck({ reversal, alpha, control, conflict }) {
  const checks = {};
  const check = (name, pass, observed, required) => { checks[name] = { pass: Boolean(pass), observed, required }; };
  const inCell = r => r.q === 0 && r.w === 0 && r.bg === 0;
  for (const [recs, rule] of [[reversal, 'ReversalMemory'], [alpha, 'AlphaLobeMemory']]) {
    if (!recs.length || recs.some(r => r.rule !== rule || !inCell(r))) throw Error(`${rule} validity records must be that rule in the q=0,w=0,bg=0 cell`);
  }
  if (!control.length || control.some(r => r.rule !== 'SeparateTable')) throw Error('Control must be SeparateTable records');
  const revEval = evaluateCell(reversal), alphaEval = evaluateCell(alpha);
  const groups = groupCells(control), controlEvals = [...groups.values()].map(evaluateCell);

  const v1 = recoveryError(reversal.filter(r => r.arm === 'informative'));
  check('V1.1 ReversalMemory inactive recovery follows 0.75^N', v1.checked > 0 && v1.worst <= 1e-9, v1.worst, '<= 1e-9');
  check('V1.2 ReversalMemory loses A (median R < 0.35)', revEval.RMedian < 0.35, revEval.RMedian, '< 0.35');

  const rise = maxGainRise(alpha.filter(r => r.arm === 'informative'));
  check('V2.1 AlphaLobeMemory: no gain rises', alpha.some(r => r.arm === 'informative') && rise <= 0, rise, '<= 0');
  check('V2.2 AlphaLobeMemory: G3 passes at this cell', alphaEval.gates.G3.pass, alphaEval.gates.G3, 'G3 passes');
  const floor = { mNormA_T5: alphaEval.mNormMedian.A.T5, floorP_T5: alphaEval.floorOccMedian.T5.P, floorR_T5: alphaEval.floorOccMedian.T5.R };
  check('V2.3 AlphaLobeMemory: A floors by T5', floor.mNormA_T5 < 0.10 && floor.floorP_T5 >= 0.9 && floor.floorR_T5 >= 0.9, floor, 'mNormA_T5 < 0.10 and both floorOcc >= 0.9');

  const failing = controlEvals.filter(c => V3_GATES.some(g => !c.gates[g].pass)).map(c => ({ cell: c.cell, failed: V3_GATES.filter(g => !c.gates[g].pass) }));
  const covered = controlEvals.length === gridCells().length && gridCells().every(c => groups.has(cellKey(c)));
  check('V3 SeparateTable passes G1-G6 in all 108 cells', covered && failing.length === 0, { cells: controlEvals.length, failing }, '108 cells, no failing gate');
  const controlGrid = summarizeGrid(controlEvals);
  check('V3 SeparateTable passes pooled G5s', controlGrid.G5s.pass, controlGrid.G5s, 'shuffled share in [0.35,0.65], informative minus shuffled >= 0.25');

  const oldRuns = [...reversal, ...alpha].filter(r => r.arm === 'absent' || r.arm === 'disabled');
  const gainsChanged = oldRuns.filter(r => r.initialGainsHash !== r.finalGainsHash).length;
  check('V4 absent and disabled leave old-rule gains unchanged', oldRuns.length > 0 && gainsChanged === 0, gainsChanged, '0 changed runs');
  for (const rule of VALIDITY_RULES) {
    const accs = conflict.filter(c => c.rule === rule).map(c => c.accuracy);
    const mean = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null;
    check(`V4 conflict control: ${rule}`, mean !== null && Math.abs(mean - 0.5) <= 0.25, mean, 'within 0.25 of 0.5');
  }

  const overlapError = Math.max(...control.map(r => Math.max(Math.abs(r.actual.qFocal - r.q), Math.abs(r.actual.wFocal.A - r.w), Math.abs(r.actual.wFocal.B - r.w), Math.abs(r.actual.wFocal.C - r.w)) * r.s));
  check('V5 overlaps match pinned levels within 1/s (SeparateTable, all cells)', overlapError <= 1, overlapError, '<= 1 (units of 1/s)');
  for (const [recs, rule] of [[reversal, 'ReversalMemory'], [alpha, 'AlphaLobeMemory']]) {
    const rate = share(recs.filter(r => r.arm === 'shuffled').map(r => r.degenerate === false));
    check(`V5 shuffled non-degenerate in validity cell: ${rule}`, rate >= 0.9, rate, '>= 0.9');
  }

  return { valid: Object.values(checks).every(c => c.pass), largestCapturedGainError: v1.worst, checks,
    evaluations: { ReversalMemory: revEval, AlphaLobeMemory: alphaEval, SeparateTable: controlGrid } };
}
