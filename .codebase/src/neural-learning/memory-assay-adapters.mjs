// Places each rule on the memory-assay fixture circuit (assay spec section 3).
// SeparateTable is a test instrument, not a candidate: its frame is a no-op.
import { createHash } from 'node:crypto';
import { ReversalMemory } from './reversal-memory.mjs';
import { AlphaLobeMemory } from './alpha-lobe-memory.mjs';

export const DAN_REST = 0.75;
const ACTIVITY_SCALE = 1.5;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i);

// model.n is the total neuron count (n + 7): the pinned classes check DAN indices and rest length against it.
export function makeCircuit(fixture) {
  const { nKC: n, baseP, baseR } = fixture, N = n + 7, E = 2 * n + 1;
  const magnitude = new Float32Array(E), col = new Int32Array(E), sign = new Int8Array(E).fill(1);
  for (let i = 0; i < n; i++) { magnitude[i] = baseP[i]; magnitude[n + i] = baseR[i]; col[i] = i; col[n + i] = i; }
  magnitude[2 * n] = 1; col[2 * n] = n + 4;
  const rest = new Float32Array(N); rest[n] = rest[n + 1] = DAN_REST;
  const model = {
    n: N, steps: 1, h: [new Float64Array(N), new Float64Array(N)],
    graph: { col, sign }, params: { magnitude }, config: { fixture: 'memory-assay' },
    setMagnitude(e, v) {
      if (!Number.isSafeInteger(e) || e < 0 || e >= E || !Number.isFinite(v) || v <= 0) throw Error('Invalid magnitude write');
      magnitude[e] = v;
    },
  };
  const mapReversal = { groups: [
    { edges: range(0, n), kc: range(0, n), dan: [{ index: n }] },
    { edges: range(n, 2 * n), kc: range(0, n), dan: [{ index: n + 1 }] },
  ] };
  const mapAlpha = { groups: [
    { mbonType: 'dummy', danType: 'dummy', edges: [2 * n], kc: [n + 4], dan: [{ index: n + 5 }] },
    { mbonType: 'MBON14', danType: 'PPL106', edges: range(0, n), kc: range(0, n), dan: [{ index: n }] },
    { mbonType: 'MBON07', danType: 'PAM11', edges: range(n, 2 * n), kc: range(0, n), dan: [{ index: n + 1 }] },
  ] };
  return { model, rest, mapReversal, mapAlpha, edgesP: i => i, edgesR: i => n + i, n };
}

function oldRule(name, fixture, Memory, mapKey, gainsKey) {
  const c = makeCircuit(fixture), { model, rest, n } = c, mag = model.params.magnitude;
  const memory = new Memory(model, c[mapKey]);
  return {
    name,
    frame({ kcH, danP, danR }) {
      if (kcH.length !== n) throw Error('Invalid activity vector');
      const h = model.h[model.steps];
      h.fill(0); h.set(kcH); h[n] = danP; h[n + 1] = danR;
      memory.observe(rest, 1);
    },
    value: (_imageId, kcH) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += kcH[i] / ACTIVITY_SCALE * (mag[i] - mag[n + i]);
      return sum / fixture.s;
    },
    noteEvent() {},
    gains: () => { const g = memory[gainsKey]; return { P: g.slice(0, n), R: g.slice(n, 2 * n) }; },
    stateHash: () => digest({ snapshot: memory.snapshot(), magnitude: [...mag] }),
    snapshot: () => memory.snapshot(),
    restore: s => memory.restore(s),
  };
}

// Test instrument, not a candidate: values move only through noteEvent.
function separateTable(fixture) {
  const table = new Map(), n = fixture.nKC;
  return {
    name: 'SeparateTable',
    frame() {},
    value: imageId => table.get(imageId) ?? 0,
    noteEvent(imageId, valence) {
      if (valence !== 'reward' && valence !== 'punish') throw Error('Invalid valence');
      const r = valence === 'reward' ? 0.8 : -0.8, v = table.get(imageId) ?? 0;
      table.set(imageId, v + 0.25 * (r - v));
    },
    gains: () => ({ P: new Float64Array(n).fill(1), R: new Float64Array(n).fill(1) }),
    stateHash: () => digest([...table].sort(([a], [b]) => (a < b ? -1 : 1))),
    snapshot: () => ({ version: 1, table: [...table] }),
    restore(s) { table.clear(); for (const [k, v] of s.table) table.set(k, v); },
  };
}

export const RULES = {
  ReversalMemory: fixture => oldRule('ReversalMemory', fixture, ReversalMemory, 'mapReversal', 'gains'),
  AlphaLobeMemory: fixture => oldRule('AlphaLobeMemory', fixture, AlphaLobeMemory, 'mapAlpha', 'alphaGains'),
  SeparateTable: separateTable,
};

export function createRule(name, fixture) {
  if (!Object.hasOwn(RULES, name)) throw Error(`Unknown rule ${name}`);
  return RULES[name](fixture);
}

export function registerRule(name, factory) {
  if (Object.hasOwn(RULES, name) || typeof factory !== 'function') throw Error('Invalid or duplicate rule name');
  RULES[name] = factory;
}
