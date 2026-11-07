// Local APL recurrence for one SparseTrainer instance. Forward-only adapter.
// Gradient, backward() and optimizer training are unsupported on an adapted instance: backward()
// still differentiates the scalar APL, so its gradients do not match this forward. The approved
// experiment intentionally uses dopamine-only gain updates on existing synapses instead of gradient
// steps; those are not implemented here. trainer.mjs and sparse-accumulator.mjs are unchanged;
// installLocalApl replaces this instance's prepare/accumulate only. Each registered APL-to-KC edge
// takes the mean per-contact state (local), one matched uniform value (matched), or the single
// scalar state (global, K=1, same arithmetic as SparseTrainer). Non-KC APL outputs keep the scalar
// state. Transient state resets at every prepare (every forward). apls[].index is the APL's neuron
// index in model.graph; rootId is declared data only.
import { createHash } from 'node:crypto';

const SCHEMA = 'fly-apl-sites-v1';
const MODES = new Set(['local', 'matched', 'global']);
const HEX64 = /^[0-9a-f]{64}$/;
const installed = new WeakSet();

function ints(values, name, min, max) {
  if (!values || !Number.isInteger(values.length)) throw Error(`Invalid ${name}`);
  const out = new Int32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isInteger(v) || v < min || v > max) throw Error(`Invalid ${name} at ${i}`);
    out[i] = v;
  }
  return out;
}

function lengths(values, name, count) {
  if (!values || values.length !== count) throw Error(`Invalid ${name}`);
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const v = values[i];
    if (!Number.isFinite(v) || v < 0) throw Error(`Invalid ${name} at ${i}`);
    out[i] = v;
  }
  return out;
}

// Two-pass exp(-tree distance / L) filter from research/reports/apl-locality-feasibility-2026-11-01/
// tree-kernel-prototype.mjs, run in place on buffers allocated once per install (same operations, same order).
function treeField(a) {
  const { parent, attenuation: att, count, nodeInput, subtree, field } = a;
  subtree.set(nodeInput);
  for (let i = count - 1; i > 0; i--) subtree[parent[i]] += att[i] * subtree[i];
  field.set(subtree);
  for (let i = 1; i < count; i++) field[i] += att[i] * (field[parent[i]] - att[i] * subtree[i]);
}

// The accumulator already added weight * scalar on each APL-to-KC edge. Add weight * (value - scalar)
// so each edge carries exactly weight * value.
function replaceCurrents(a, result, previous, weight, mode) {
  const { groupEdge, groupKC, groupMult, groupSum, outputGroup, state } = a;
  groupSum.fill(0);
  for (let c = 0; c < state.length; c++) groupSum[outputGroup[c]] += state[c];
  let uniform = 0;
  if (mode === 'matched') {
    let numerator = 0, denominator = 0;
    for (let q = 0; q < groupEdge.length; q++) {
      const magnitude = Math.abs(weight[groupEdge[q]]);
      numerator += magnitude * groupSum[q] / groupMult[q];
      denominator += magnitude;
    }
    uniform = denominator > 0 ? numerator / denominator : 0;
  }
  for (let q = 0; q < groupEdge.length; q++) {
    // Global contacts all hold the one scalar state, so take it unaveraged: (k * s) / k can round in float64.
    let value = groupSum[q] / groupMult[q];
    if (mode === 'matched') value = uniform;
    else if (mode === 'global') value = state[0];
    result[groupKC[q]] += weight[groupEdge[q]] * (value - previous[a.index]);
  }
}

// a(t+1) from h(t) for local and matched: u = drive + non-KC inputs + contact-filtered KC input.
// Same leaky rectified-tanh rounding as SparseTrainer: activation and next state stored in model precision.
function advance(a, previous, weight, col, saturation) {
  const { inputSite, inputKC, inputEdge, inputMult, outputSite, nonKC, nodeInput, field, state, act, alpha } = a;
  let common = a.drive;
  for (const k of nonKC) common += weight[k] * previous[col[k]];
  nodeInput.fill(0);
  for (let c = 0; c < inputEdge.length; c++) nodeInput[inputSite[c]] += weight[inputEdge[c]] / inputMult[c] * previous[inputKC[c]];
  treeField(a);
  for (let c = 0; c < state.length; c++) {
    const u = common + field[outputSite[c]];
    if (!Number.isFinite(u)) throw Error('Nonfinite local APL input');
    act[c] = u > 0 ? saturation * Math.tanh(u / saturation) : 0;
    state[c] = (1 - alpha) * state[c] + alpha * act[c];
  }
}

// Global (K=1): u is the accumulator's own pre-activation sum at the APL row (drive, non-KC and KC
// inputs, in SparseTrainer's order). Nothing is regrouped, so the states follow the scalar APL exactly.
function advanceGlobal(a, sum, saturation) {
  if (!Number.isFinite(sum)) throw Error('Nonfinite local APL input');
  const { state, act, alpha } = a;
  for (let c = 0; c < state.length; c++) {
    act[c] = sum > 0 ? saturation * Math.tanh(sum / saturation) : 0;
    state[c] = (1 - alpha) * state[c] + alpha * act[c];
  }
}

export function installLocalApl(model, packageData, { mode = 'local', lengthScaleNm = 50000 } = {}) {
  if (!MODES.has(mode)) throw Error('Invalid APL mode');
  if (!(lengthScaleNm > 0) || !Number.isFinite(lengthScaleNm)) throw Error('Invalid APL length scale');
  if (!model?.graph || !model.config || !model.sparseAccumulator || !model.h || installed.has(model)) throw Error('Invalid or already adapted model');
  if (packageData?.schema !== SCHEMA || typeof packageData.identity !== 'string' || !HEX64.test(packageData.identity)
    || !Array.isArray(packageData.apls) || !packageData.apls.length) throw Error('Invalid APL package');
  const { row, col, sign } = model.graph;
  const n = row.length - 1, E = col.length;
  if (n < 1 || row[0] !== 0 || row[n] !== E || sign.length !== E) throw Error('Invalid graph shape');
  const kc = ints(packageData.kcIndices, 'KC index', 0, n - 1);
  if (!kc.length) throw Error('Empty KC cohort');
  const isKC = new Uint8Array(n);
  for (const j of kc) {
    if (isKC[j]) throw Error('Duplicate KC index');
    isKC[j] = 1;
  }
  const Type = model.h[0].constructor;
  const slotOf = new Int32Array(n).fill(-1), rootIds = new Set(), covered = new Set();
  const apls = packageData.apls.map((entry, slot) => {
    if (typeof entry?.rootId !== 'string' || !entry.rootId || rootIds.has(entry.rootId)) throw Error('Invalid or duplicate APL root');
    rootIds.add(entry.rootId);
    const A = entry.index;
    if (!Number.isInteger(A) || A < 0 || A >= n || isKC[A] || slotOf[A] !== -1) throw Error('Invalid or duplicate APL index');
    slotOf[A] = slot;
    const count = entry.parent?.length;
    if (!Number.isInteger(count) || count < 1) throw Error('Invalid APL tree');
    const parent = ints(entry.parent, 'APL parent', -1, count - 1);
    const lengthNm = lengths(entry.lengthNm, 'APL length', count);
    if (parent[0] !== -1 || lengthNm[0] !== 0) throw Error('Invalid APL root node');
    for (let i = 1; i < count; i++) if (parent[i] < 0 || parent[i] >= i) throw Error('Invalid APL tree order');
    const inputSite = ints(entry.inputSite, 'APL input site', 0, count - 1);
    const inputKC = ints(entry.inputKC, 'APL input KC', 0, n - 1);
    const inputEdge = ints(entry.inputEdge, 'APL input edge', 0, E - 1);
    const outputSite = ints(entry.outputSite, 'APL output site', 0, count - 1);
    const outputKC = ints(entry.outputKC, 'APL output KC', 0, n - 1);
    const outputEdge = ints(entry.outputEdge, 'APL output edge', 0, E - 1);
    if (inputKC.length !== inputSite.length || inputEdge.length !== inputSite.length
      || outputKC.length !== outputSite.length || outputEdge.length !== outputSite.length) throw Error('APL contact arrays differ');
    // Input: KC -> APL edges. Each graph edge's contacts split its magnitude evenly.
    const inputCount = new Map();
    for (let c = 0; c < inputEdge.length; c++) {
      const e = inputEdge[c], j = inputKC[c];
      if (!isKC[j] || col[e] !== j || e < row[A] || e >= row[A + 1] || !(sign[e] > 0)) throw Error(`Invalid APL input contact ${c}`);
      inputCount.set(e, (inputCount.get(e) ?? 0) + 1);
    }
    for (let k = row[A]; k < row[A + 1]; k++) if (isKC[col[k]] && !inputCount.has(k)) throw Error('Incomplete APL input coverage');
    // Output: APL -> KC edges. Contacts on one edge are averaged; groups share one edge index.
    const groupOf = new Map(), groupEdge = [], groupKC = [], groupMult = [];
    const outputGroup = new Int32Array(outputEdge.length);
    for (let c = 0; c < outputEdge.length; c++) {
      const e = outputEdge[c], j = outputKC[c];
      if (!isKC[j] || e < row[j] || e >= row[j + 1] || col[e] !== A || !(sign[e] < 0)) throw Error(`Invalid APL output contact ${c}`);
      covered.add(e);
      if (!groupOf.has(e)) {
        groupOf.set(e, groupEdge.length);
        groupEdge.push(e); groupKC.push(j); groupMult.push(0);
      }
      const q = groupOf.get(e);
      outputGroup[c] = q; groupMult[q]++;
    }
    const nonKC = [];
    for (let k = row[A]; k < row[A + 1]; k++) if (!isKC[col[k]]) nonKC.push(k);
    return {
      rootId: entry.rootId, index: A, count, parent, lengthNm,
      attenuation: Float64Array.from(lengthNm, x => Math.exp(-x / lengthScaleNm)),
      inputSite, inputKC, inputEdge, inputMult: Float64Array.from(inputEdge, e => inputCount.get(e)),
      outputSite, outputKC, outputEdge, outputGroup,
      groupEdge: Int32Array.from(groupEdge), groupKC: Int32Array.from(groupKC), groupMult: Float64Array.from(groupMult),
      groupSum: new Float64Array(groupEdge.length), nonKC: Int32Array.from(nonKC),
      state: new Type(outputEdge.length), act: new Type(outputEdge.length),
      nodeInput: new Float64Array(count), subtree: new Float64Array(count), field: new Float64Array(count),
      drive: 0, alpha: 0,
    };
  });
  // Every retained KC -> APL and APL -> KC edge of the cohort must have contacts.
  for (const j of kc) for (let k = row[j]; k < row[j + 1]; k++) if (slotOf[col[k]] !== -1 && !covered.has(k)) throw Error('Incomplete APL output coverage');

  const hash = createHash('sha256');
  const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  // Binds the trainer config and the package's declared identity (sha256 of package.json and sites.npz) as well as the arrays.
  hash.update(JSON.stringify({ schema: SCHEMA, mode, lengthScaleNm, precision: Type.name, n, E, config: model.config, identity: packageData.identity, apls: apls.map(a => [a.rootId, a.index, a.count]) }));
  hash.update(bytes(kc));
  for (const a of apls) for (const v of [a.parent, a.lengthNm, a.inputSite, a.inputKC, a.inputEdge, a.outputSite, a.outputKC, a.outputEdge]) hash.update(bytes(v));

  const reset = () => { for (const a of apls) { a.state.fill(0); a.act.fill(0); } };
  const acc = model.sparseAccumulator;
  const prepareBase = acc.prepare, accumulateBase = acc.accumulate;
  let ready = false;
  installed.add(model);
  acc.prepare = (weight, drive) => {
    // A nonzero APL start state has no local counterpart; reject instead of treating it as zero.
    for (const a of apls) if (model.h[0][a.index] !== 0) throw Error('Nonzero initial APL state is not supported by local APL');
    prepareBase.call(acc, weight, drive);
    for (const a of apls) { a.drive = drive[a.index]; a.alpha = model.alpha[a.index]; }
    reset();
    ready = true;
  };
  acc.accumulate = previous => {
    if (!ready) throw Error('APL accumulate before prepare');
    // Currents use a(t) first; then a(t+1) is computed from h(t). The returned array is the accumulator's reused buffer.
    // Only KC rows are replaced, so result[APL] stays the scalar pre-activation sum.
    const result = accumulateBase.call(acc, previous);
    for (const a of apls) {
      replaceCurrents(a, result, previous, acc.weight, mode);
      if (mode === 'global') advanceGlobal(a, result[a.index], model.saturation);
      else advance(a, previous, acc.weight, col, model.saturation);
    }
    return result;
  };
  return { identity: hash.digest('hex'), mode, reset };
}
