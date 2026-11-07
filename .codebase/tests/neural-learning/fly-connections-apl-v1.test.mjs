import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { validateGraph } from '../../src/runtime/graph.mjs';
import { installLocalApl } from '../../src/neural-learning/fly-connections-apl-v1.mjs';

// Synthetic 8-neuron network: KCs 0-3 (cohort), APLs 4 (right) and 5 (left), non-KC input 6, output 7.
const N = 8, KC = [0, 1, 2, 3], APL_R = 4, APL_L = 5, NON_KC = 6, OUT = 7;
// Unanchored: assert.throws tests String(error), which begins with "Error: ".
const REJECT = /(Invalid|Duplicate|Incomplete|Empty|APL contact)/;
const IDENTITY = 'ab'.repeat(32);
const CASES = [
  [[0.7, -0.4], [{ index: APL_R, current: 0.35 }]],
  [[-0.3, 0.9], [{ index: APL_L, current: -0.2 }, { index: APL_R, current: 0.1 }]],
  [[0, 0], []],
];
// Right tree: branch at node 1, zero-length branch (node 3), co-located contacts. Left tree: small branch.
const RIGHT = {
  rootId: 'apl-right-fixture', index: APL_R, parent: [-1, 0, 1, 1, 0, 4], lengthNm: [0, 3000, 2000, 0, 5000, 1500],
  inputs: [[2, 0], [5, 0], [3, 1], [2, 2], [2, 2], [4, 2], [0, 3]],
  outputs: [[1, 0], [4, 0], [5, 1], [0, 2], [3, 2], [3, 2], [2, 3]],
};
const LEFT = {
  rootId: 'apl-left-fixture', index: APL_L, parent: [-1, 0, 0, 2], lengthNm: [0, 1000, 4000, 500],
  inputs: [[1, 0], [2, 1], [3, 1], [0, 2], [3, 3]],
  outputs: [[2, 0], [1, 1], [3, 1], [3, 2], [0, 3]],
};

function graphFixture() {
  const edges = [];
  const add = (pre, post, sign) => edges.push({ pre, post, sign, initial: 1 + ((pre * 7 + post * 3) % 4) });
  for (const k of KC) for (const apl of [APL_R, APL_L]) { add(k, apl, 1); add(apl, k, -1); }
  for (const apl of [APL_R, APL_L]) { add(NON_KC, apl, 1); add(apl, OUT, -1); }
  edges.sort((a, b) => a.post - b.post || a.pre - b.pre);
  const row = new Int32Array(N + 1);
  for (const e of edges) row[e.post + 1]++;
  for (let j = 0; j < N; j++) row[j + 1] += row[j];
  return validateGraph({
    row, col: Int32Array.from(edges, e => e.pre), sign: Int8Array.from(edges, e => e.sign),
    initial: Float32Array.from(edges, e => e.initial), input: Int32Array.from([0, NON_KC]), output: Int32Array.from([1, APL_R, OUT]),
  });
}

function edgeOf(g, pre, post) {
  for (let k = g.row[post]; k < g.row[post + 1]; k++) if (g.col[k] === pre) return k;
  throw Error(`Missing edge ${pre}->${post}`);
}

function aplPackage(g, apl) {
  return {
    rootId: apl.rootId, index: apl.index, parent: apl.parent.slice(), lengthNm: apl.lengthNm.slice(),
    inputSite: apl.inputs.map(c => c[0]), inputKC: apl.inputs.map(c => c[1]),
    inputEdge: apl.inputs.map(([, kc]) => edgeOf(g, kc, apl.index)),
    outputSite: apl.outputs.map(c => c[0]), outputKC: apl.outputs.map(c => c[1]),
    outputEdge: apl.outputs.map(([, kc]) => edgeOf(g, apl.index, kc)),
  };
}

function fixture({ precision = 'float64', steps = 4, saturation = 3 } = {}) {
  const m = new SparseTrainer(graphFixture(), { steps, inputDim: 2, outputs: 2, seed: 11, precision, saturation });
  for (let j = 0; j < N; j++) m.params.leak[j] = -0.6 + 0.25 * j;
  // Tonic KC drive keeps receiving KCs above rectification at the steps where local and scalar APL currents differ.
  // The sensitivity test asserts this precondition, so a rectified fixture fails with a precise message.
  m.params.bias.set([1.5, 1.5, 1.5, 1.5, 0.25, 0.15, 0, -0.1]);
  return { m, pkg: { schema: 'fly-apl-sites-v1', identity: IDENTITY, kcIndices: KC.slice(), apls: [aplPackage(m.graph, RIGHT), aplPackage(m.graph, LEFT)] } };
}

function run(m, [x, stimulation], initialState = null) {
  m.forward(x, stimulation, initialState);
  return { h: m.h.map(layer => Array.from(layer)), prediction: Array.from(m.prediction) };
}

// Independent oracle: tree distance by ancestor enumeration, not the production kernel.
function pathDistance(parent, length, a, b) {
  const up = new Map();
  let d = 0;
  for (let u = a; u >= 0; u = parent[u]) { up.set(u, d); d += length[u]; }
  d = 0;
  let v = b;
  while (!up.has(v)) { d += length[v]; v = parent[v]; }
  return d + up.get(v);
}

// Naive reference after forward(): explicit per-contact states, pairwise kernel, no tree code.
function reference(m, pkg, mode, L) {
  const { row, col } = m.graph, n = row.length - 1;
  const sm = Float64Array.from(m.signedMagnitude), alpha = Float64Array.from(m.alpha), drive = Float64Array.from(m.drive);
  const s = m.saturation, act = z => (z > 0 ? s * Math.tanh(z / s) : 0);
  const cohort = new Set(pkg.kcIndices);
  const count = (list, e) => list.filter(x => x === e).length;
  const apls = pkg.apls.map(a => ({ ...a, states: a.outputEdge.map(() => 0) }));
  let h = Array.from(m.h[0]);
  const trajectory = [h];
  for (let t = 0; t < m.steps; t++) {
    const replace = new Map();
    for (const a of apls) {
      const mean = e => a.outputEdge.reduce((sum, x, c) => (x === e ? sum + a.states[c] : sum), 0) / count(a.outputEdge, e);
      const edges = [...new Set(a.outputEdge)];
      let num = 0, den = 0;
      for (const e of edges) { num += Math.abs(sm[e]) * mean(e); den += Math.abs(sm[e]); }
      const uniform = den > 0 ? num / den : 0;
      for (const e of edges) replace.set(e, mode === 'matched' ? uniform : mean(e));
    }
    const next = [];
    for (let j = 0; j < n; j++) {
      let z = drive[j];
      for (let k = row[j]; k < row[j + 1]; k++) z += sm[k] * (replace.has(k) ? replace.get(k) : h[col[k]]);
      next.push((1 - alpha[j]) * h[j] + alpha[j] * act(z));
    }
    for (const a of apls) {
      const A = a.index;
      let common = drive[A];
      for (let k = row[A]; k < row[A + 1]; k++) if (!cohort.has(col[k])) common += sm[k] * h[col[k]];
      a.states = a.outputSite.map((site, c) => {
        let field = 0;
        a.inputEdge.forEach((e, x) => {
          const K = mode === 'global' ? 1 : Math.exp(-pathDistance(a.parent, a.lengthNm, a.inputSite[x], site) / L);
          field += sm[e] / count(a.inputEdge, e) * h[a.inputKC[x]] * K;
        });
        return (1 - alpha[A]) * a.states[c] + alpha[A] * act(common + field);
      });
    }
    h = next;
    trajectory.push(h);
  }
  const outs = m.graph.output, no = outs.length;
  const prediction = Array.from({ length: m.outputs }, (_, o) => {
    let z = m.params.headBias[o];
    for (let i = 0; i < no; i++) z += m.params.head[o * no + i] * h[outs[i]];
    return z;
  });
  return { h: trajectory, prediction };
}

function assertNear(actual, expected, tolerance) {
  assert.equal(actual.h.length, expected.h.length);
  actual.h.forEach((layer, t) => layer.forEach((v, j) => assert.ok(Math.abs(v - expected.h[t][j]) <= tolerance, `h[${t}][${j}] ${v} vs ${expected.h[t][j]}`)));
  expected.prediction.forEach((v, o) => assert.ok(Math.abs(actual.prediction[o] - v) <= tolerance, `prediction[${o}] ${actual.prediction[o]} vs ${v}`));
}

const maxDiff = (a, b) => Math.max(...a.h.flatMap((layer, t) => layer.map((v, j) => Math.abs(v - b.h[t][j]))));
const clone = v => (Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
const typed = pkg => ({
  schema: pkg.schema, identity: pkg.identity, kcIndices: Int32Array.from(pkg.kcIndices),
  apls: pkg.apls.map(a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Array.isArray(v) ? (k === 'lengthNm' ? Float32Array : Int32Array).from(v) : v]))),
});
function dropRow(apl, side, kc) {
  const i = apl[`${side}KC`].indexOf(kc);
  for (const key of [`${side}Site`, `${side}KC`, `${side}Edge`]) apl[key].splice(i, 1);
}

test('local and matched trajectories match an independent path-enumeration reference', () => {
  for (const mode of ['local', 'matched']) for (const L of [2500, 50000]) {
    const { m, pkg } = fixture(), original = fixture().m;
    installLocalApl(m, pkg, { mode, lengthScaleNm: L });
    for (const c of CASES) {
      const actual = run(m, c);
      assertNear(actual, reference(m, pkg, mode, L), 1e-9);
      if (c === CASES[0]) {
        const base = run(original, c);
        // Precondition: every receiving KC is active at the steps where local APL currents first differ from the scalar.
        for (let t = 2; t < original.steps; t++) for (const j of KC) assert.ok(original.activity[t][j] > 0, `${mode} L=${L}: KC ${j} is rectified at step ${t}`);
        assert.ok(maxDiff(actual, base) > 1e-6, `${mode} L=${L} must differ from the scalar APL`);
      }
    }
  }
});

test('global mode reproduces the original scalar APL exactly in float64 and float32', () => {
  for (const precision of ['float64', 'float32']) {
    const original = fixture({ precision }).m, adapted = fixture({ precision });
    installLocalApl(adapted.m, adapted.pkg, { mode: 'global' });
    for (const c of CASES) assert.deepEqual(run(adapted.m, c), run(original, c), precision);
  }
});

test('local mode with near-infinite length matches global mode, so no contact is double counted', () => {
  const local = fixture(), global = fixture();
  installLocalApl(local.m, local.pkg, { mode: 'local', lengthScaleNm: 1e15 });
  installLocalApl(global.m, global.pkg, { mode: 'global' });
  for (const c of CASES) assertNear(run(local.m, c), run(global.m, c), 1e-9);
});

test('the first step has no APL current, so local states do not lead the simulator', () => {
  const original = fixture({ steps: 2 }), local = fixture({ steps: 2 });
  installLocalApl(local.m, local.pkg, { mode: 'local', lengthScaleNm: 2500 });
  const a = run(original.m, CASES[0]), b = run(local.m, CASES[0]);
  for (let j = 0; j < N; j++) assert.ok(Math.abs(b.h[1][j] - a.h[1][j]) <= 1e-12, `h[1][${j}]`);
});

test('matched mode conserves total outgoing APL current for the same presynaptic states', () => {
  const drive = Float64Array.from({ length: N }, (_, j) => 0.3 + 0.1 * j);
  const prevs = [
    Float64Array.from([0.4, 1.2, 0.7, 2.0, 0.9, 0.3, 0.5, 0]),
    Float64Array.from([1.1, 0.2, 0.6, 0.8, 0.5, 1.4, 0.2, 0]),
  ];
  const totals = {};
  for (const mode of ['local', 'matched']) {
    const { m, pkg } = fixture();
    installLocalApl(m, pkg, { mode, lengthScaleNm: 2500 });
    m.alpha.set(Float64Array.from({ length: N }, (_, j) => 0.3 + 0.05 * j));
    m.sparseAccumulator.prepare(m.signedMagnitude, drive);
    let result = null;
    for (const prev of prevs) result = Float64Array.from(m.sparseAccumulator.accumulate(prev));
    // KC rows receive only APL input in this fixture, so row minus drive is the APL current.
    totals[mode] = KC.reduce((sum, j) => sum + result[j] - drive[j], 0);
  }
  assert.ok(Math.abs(totals.local) > 1e-3);
  assert.ok(Math.abs(totals.local - totals.matched) < 1e-12);
});

test('the real SparseTrainer call path invokes the adapter once per forward and once per neural step', () => {
  const { m, pkg } = fixture({ steps: 3 });
  installLocalApl(m, pkg, { mode: 'local', lengthScaleNm: 2500 });
  const calls = { prepare: 0, accumulate: 0 };
  const prepare = m.sparseAccumulator.prepare, accumulate = m.sparseAccumulator.accumulate;
  m.sparseAccumulator.prepare = (...args) => { calls.prepare++; return prepare(...args); };
  m.sparseAccumulator.accumulate = previous => { calls.accumulate++; return accumulate(previous); };
  m.forward(CASES[0][0], CASES[0][1]);
  assert.deepEqual(calls, { prepare: 1, accumulate: 3 });
});

test('each candidate starts from reset transient state and results are order invariant', () => {
  const { m, pkg } = fixture();
  installLocalApl(m, pkg, { mode: 'matched', lengthScaleNm: 2500 });
  const first = run(m, CASES[0]);
  run(m, CASES[1]);
  run(m, CASES[2]);
  assert.deepEqual(run(m, CASES[0]), first);
  const fresh = fixture();
  installLocalApl(fresh.m, fresh.pkg, { mode: 'matched', lengthScaleNm: 2500 });
  assert.deepEqual(run(m, CASES[2]), run(fresh.m, CASES[2]));
});

test('a nonzero initial APL state is rejected rather than treated as zero', () => {
  const { m, pkg } = fixture();
  installLocalApl(m, pkg, { mode: 'local', lengthScaleNm: 2500 });
  const initial = new Array(N).fill(0);
  initial[APL_R] = 0.1;
  assert.throws(() => m.forward(CASES[0][0], CASES[0][1], initial), /Nonzero initial APL state/);
  assert.doesNotThrow(() => run(m, CASES[0]));
});

test('float32 precision stays finite and within storage rounding of the reference', () => {
  const { m, pkg } = fixture({ precision: 'float32' });
  installLocalApl(m, pkg, { mode: 'local', lengthScaleNm: 2500 });
  const actual = run(m, CASES[0]);
  assertNear(actual, reference(m, pkg, 'local', 2500), 1e-4);
});

test('identity binds mode, config and package identity, and is stable for equal packages', () => {
  const a = fixture(), b = fixture(), c = fixture(), d = fixture({ steps: 5 }), e = fixture();
  e.pkg.identity = 'cd'.repeat(32);
  const local = installLocalApl(a.m, a.pkg, { mode: 'local', lengthScaleNm: 2500 }).identity;
  const sameTyped = installLocalApl(b.m, typed(b.pkg), { mode: 'local', lengthScaleNm: 2500 }).identity;
  const matched = installLocalApl(c.m, c.pkg, { mode: 'matched', lengthScaleNm: 2500 }).identity;
  const otherConfig = installLocalApl(d.m, d.pkg, { mode: 'local', lengthScaleNm: 2500 }).identity;
  const otherPackage = installLocalApl(e.m, e.pkg, { mode: 'local', lengthScaleNm: 2500 }).identity;
  assert.match(local, /^[0-9a-f]{64}$/);
  assert.equal(local, sameTyped);
  assert.notEqual(local, matched);
  assert.notEqual(local, otherConfig);
  assert.notEqual(local, otherPackage);
});

test('malformed packages and graph signs are rejected and leave the trainer unpatched', () => {
  const malformed = [
    ['schema', p => { p.schema = 'fly-apl-sites-v0'; }],
    ['package identity missing', p => { delete p.identity; }],
    ['package identity malformed', p => { p.identity = 'XYZ'; }],
    ['duplicate KC index', p => { p.kcIndices = [0, 0, 1, 2, 3]; }],
    ['KC index out of range', p => { p.kcIndices = [0, 1, 2, 3, N]; }],
    ['KC used as APL', p => { p.apls[0].index = 0; }],
    ['duplicate APL index', p => { p.apls[1].index = APL_R; }],
    ['duplicate APL root', p => { p.apls[1].rootId = p.apls[0].rootId; }],
    ['empty root id', p => { p.apls[0].rootId = ''; }],
    ['root parent not -1', p => { p.apls[0].parent[0] = 0; }],
    ['forward parent reference', p => { p.apls[0].parent[2] = 2; }],
    ['fractional parent', p => { p.apls[0].parent[1] = 0.5; }],
    ['negative length', p => { p.apls[0].lengthNm[1] = -1; }],
    ['nonfinite length', p => { p.apls[0].lengthNm[1] = NaN; }],
    ['short length array', p => { p.apls[0].lengthNm.pop(); }],
    ['input KC mismatches edge', p => { p.apls[0].inputKC[0] = 1; }],
    ['input edge on another APL', (p, g) => { p.apls[0].inputEdge[0] = edgeOf(g, 0, APL_L); }],
    ['input site outside tree', p => { p.apls[0].inputSite[0] = 6; }],
    ['fractional input site', p => { p.apls[1].inputSite[0] = 1.5; }],
    ['input arrays differ in length', p => { p.apls[0].inputSite.pop(); }],
    ['output edge not from APL', (p, g) => { p.apls[0].outputEdge[0] = edgeOf(g, 0, APL_R); }],
    ['output KC mismatches edge', p => { p.apls[0].outputKC[0] = 1; }],
    ['output edge from another APL', (p, g) => { p.apls[1].outputEdge[0] = edgeOf(g, APL_R, 0); }],
    ['incomplete input coverage', p => dropRow(p.apls[0], 'input', 3)],
    ['incomplete output coverage', p => dropRow(p.apls[0], 'output', 3)],
    ['input edge sign wrong', (p, g) => { g.sign[edgeOf(g, 0, APL_R)] = -1; }],
    ['output edge sign wrong', (p, g) => { g.sign[edgeOf(g, APL_R, 0)] = 1; }],
    ['no APLs', p => { p.apls = []; }],
  ];
  for (const [label, mutate] of malformed) {
    const { m, pkg } = fixture();
    const p = clone(pkg);
    mutate(p, m.graph);
    assert.throws(() => installLocalApl(m, p, { mode: 'local', lengthScaleNm: 2500 }), REJECT, label);
    assert.equal(Object.hasOwn(m.sparseAccumulator, 'prepare'), false, label);
  }
});

test('invalid modes, length scales and double installation are rejected', () => {
  const { m, pkg } = fixture();
  assert.throws(() => installLocalApl(m, pkg, { mode: 'bogus' }), REJECT);
  for (const lengthScaleNm of [0, -1, Infinity, NaN]) assert.throws(() => installLocalApl(m, pkg, { lengthScaleNm }), REJECT);
  assert.equal(Object.hasOwn(m.sparseAccumulator, 'prepare'), false);
  installLocalApl(m, pkg);
  assert.throws(() => installLocalApl(m, pkg), REJECT);
});

test('installation and forward passes leave parameters, topology and signs unchanged', () => {
  const { m, pkg } = fixture();
  const snapshot = () => ({
    params: Object.fromEntries(Object.entries(m.params).map(([k, v]) => [k, Array.from(v)])),
    row: Array.from(m.graph.row), col: Array.from(m.graph.col), sign: Array.from(m.graph.sign),
    signed: Array.from(m.signedMagnitude),
  });
  const before = snapshot();
  installLocalApl(m, pkg, { mode: 'matched', lengthScaleNm: 2500 });
  for (const c of CASES) run(m, c);
  assert.deepEqual(snapshot(), before);
});
