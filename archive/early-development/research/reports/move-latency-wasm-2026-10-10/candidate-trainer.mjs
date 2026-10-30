import { SparseAccumulator } from '../../../.codebase/src/runtime/sparse-accumulator.mjs';
// Exact reverse-mode derivatives of the documented leaky rate model.
// One position is unrolled at a time. Gradients accumulate before any update.
// The backward edge traversal also scatters into dh: no transposed graph.
export function random(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}
export class SparseTrainer {
  constructor(graph, { steps = 8, inputDim = 1280, outputs = 8, seed = 1,
    precision = 'float32', saturation = 10, recurrentScale = 0.9, normalization = 'row' } = {}) {
    for (const v of [steps, inputDim, outputs]) if (!Number.isSafeInteger(v) || v < 1) throw Error('Invalid dimension');
    if (!(saturation > 0) || !Number.isFinite(saturation) || !(recurrentScale > 0) || !Number.isFinite(recurrentScale)) throw Error('Invalid scale');
    if (!['float32', 'float64'].includes(precision)) throw Error('Invalid precision');
    if (!['row', 'global'].includes(normalization)) throw Error('Invalid normalization');
    this.config = { steps, inputDim, outputs, seed, precision, saturation, recurrentScale, normalization };
    this.graph = graph;
    this.n = graph.row.length - 1; this.steps = steps; this.inputDim = inputDim;
    this.outputs = outputs; this.saturation = saturation;
    const A = precision === 'float64' ? Float64Array : Float32Array;
    const alloc = size => new A(size);
    const n = this.n, ni = graph.input.length, no = graph.output.length;
    this.params = { magnitude: alloc(graph.col.length), bias: alloc(n), leak: alloc(n),
      input: alloc(ni * inputDim), inputBias: alloc(ni), head: alloc(no * outputs), headBias: alloc(outputs) };
    this.grads = Object.fromEntries(Object.entries(this.params).map(([k, v]) => [k, alloc(v.length)]));
    const rng = random(seed);
    for (const [key, scale] of [['input', 1 / Math.sqrt(inputDim)], ['head', 1 / Math.sqrt(no)]]) {
      for (let i = 0; i < this.params[key].length; i++) this.params[key][i] = (rng() * 2 - 1) * scale;
    }
    // Row-normalized anatomical initial magnitudes. This is an explicit new
    // initialization, not an upstream checkpoint or a biological weight claim.
    let globalSum = 0;
    if (normalization === 'global') for (const c of graph.initial) globalSum += Math.log1p(c);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = graph.row[j]; k < graph.row[j + 1]; k++) sum += Math.log1p(graph.initial[k]);
      const denominator = normalization === 'row' ? sum : globalSum / n;
      for (let k = graph.row[j]; k < graph.row[j + 1]; k++) this.params.magnitude[k] = recurrentScale * Math.log1p(graph.initial[k]) / denominator;
    }
    // Derived signed weights preserve the fixed connectome sign convention and
    // avoid a sign multiplication on every edge of every recurrent step.
    this.signedMagnitude = alloc(graph.col.length);
    this.refreshSignedMagnitude();
    this.params.bias.fill(0.01);
    this.h = Array.from({ length: steps + 1 }, () => alloc(n));
    this.activity = Array.from({ length: steps }, () => alloc(n));
    this.drive = alloc(n); this.alpha = alloc(n);
    this.sparseAccumulator = new SparseAccumulator(graph, A);
    this.dh = alloc(n); this.previousDh = alloc(n); this.driveGrad = alloc(n);
    this.prediction = alloc(outputs); this.count = 0;
  }
  zeroGrad() { for (const g of Object.values(this.grads)) g.fill(0); this.count = 0; }
  recordBoundaryAdjoints() {
    this.preAdjoint ??= this.activity.map(a => new a.constructor(a.length));
  }
  setMagnitude(edge, value) {
    if (!Number.isSafeInteger(edge) || edge < 0 || edge >= this.params.magnitude.length
      || !Number.isFinite(value) || value <= 0) throw Error('Invalid magnitude update');
    this.params.magnitude[edge] = value;
    this.signedMagnitude[edge] = this.graph.sign[edge] * value;
  }
  refreshSignedMagnitude(edges = null) {
    const magnitude = this.params.magnitude, signed = this.signedMagnitude, sign = this.graph.sign;
    if (edges === null) {
      for (let i = 0; i < magnitude.length; i++) signed[i] = sign[i] * magnitude[i];
    } else {
      for (const i of edges) {
        if (!Number.isSafeInteger(i) || i < 0 || i >= magnitude.length) throw Error('Invalid edge for signed-weight refresh');
        signed[i] = sign[i] * magnitude[i];
      }
    }
    return signed;
  }
  forward(x, stimulation = [], initialState = null) {
    if (x.length !== this.inputDim) throw Error('Input dimension mismatch');
    if (initialState !== null && (initialState.length !== this.n
      || !initialState.every(v => Number.isFinite(v) && v >= 0 && v <= this.saturation)))
      throw Error('Invalid initial neural state');
    const { graph: g, params: p, n, saturation: s } = this;
    const signedMagnitude = this.signedMagnitude;
    this.activeInput = [];
    for (let f = 0; f < x.length; f++) {
      if (!Number.isFinite(x[f])) throw Error('Nonfinite input');
      if (x[f] !== 0) this.activeInput.push(f);
    }
    this.x = x;
    if (initialState === null) this.h[0].fill(0);
    else this.h[0].set(initialState);
    this.drive.set(p.bias);
    // Experimental neural stimulation, not a parameter update or chess label.
    for (const { index, current } of stimulation) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= n || !Number.isFinite(current)) throw Error('Invalid neural stimulation');
      this.drive[index] += current;
    }
    for (let j = 0; j < n; j++) this.alpha[j] = 1 / (1 + Math.exp(-p.leak[j]));
    for (let i = 0; i < g.input.length; i++) {
      let value = p.inputBias[i];
      for (const f of this.activeInput) value += p.input[i * this.inputDim + f] * x[f];
      this.drive[g.input[i]] += value;
    }
    this.sparseAccumulator.prepare(signedMagnitude, this.drive);
    for (let t = 0; t < this.steps; t++) {
      const prev = this.h[t], next = this.h[t + 1], act = this.activity[t];
      const recurrentSum = this.sparseAccumulator.accumulate(prev);
      for (let j = 0; j < n; j++) {
        const z = recurrentSum[j];
        if (!Number.isFinite(z)) throw Error('Nonfinite recurrent input');
        act[j] = z > 0 ? s * Math.tanh(z / s) : 0;
        next[j] = (1 - this.alpha[j]) * prev[j] + this.alpha[j] * act[j];
      }
    }
    const last = this.h[this.steps];
    for (let o = 0; o < this.outputs; o++) {
      let z = p.headBias[o];
      for (let i = 0; i < g.output.length; i++) z += p.head[o * g.output.length + i] * last[g.output[i]];
      this.prediction[o] = z;
      if (!Number.isFinite(z)) throw Error('Nonfinite prediction');
    }
    return this.prediction;
  }
  loss(target) {
    if (target.length !== this.outputs || !target.every(Number.isFinite)) throw Error('Invalid target');
    let loss = 0;
    for (let o = 0; o < this.outputs; o++) loss += (this.prediction[o] - target[o]) ** 2 / (2 * this.outputs);
    return loss;
  }
  backward(target) {
    const loss = this.loss(target);
    const gradient = Array.from(this.prediction, (v, i) => (v - target[i]) / this.outputs);
    this.backwardOutput(gradient);
    return loss;
  }
  backwardOutput(gradient) {
    if (gradient.length !== this.outputs || !gradient.every(Number.isFinite)) throw Error('Invalid output derivative');
    const { graph: g, params: p, grads: d, n, saturation: s } = this;
    this.dh.fill(0); this.driveGrad.fill(0);
    const last = this.h[this.steps];
    for (let o = 0; o < this.outputs; o++) {
      const delta = gradient[o];
      d.headBias[o] += delta;
      for (let i = 0; i < g.output.length; i++) {
        const k = o * g.output.length + i, j = g.output[i];
        d.head[k] += delta * last[j];
        this.dh[j] += delta * p.head[k];
      }
    }
    for (let t = this.steps - 1; t >= 0; t--) {
      const prev = this.h[t], act = this.activity[t], dh = this.dh, dp = this.previousDh;
      dp.fill(0);
      if (this.preAdjoint) this.preAdjoint[t].fill(0);
      for (let j = 0; j < n; j++) {
        const adj = dh[j];
        // Exact zero only: never threshold a small gradient or prune an edge.
        if (adj === 0) continue;
        const a = this.alpha[j];
        dp[j] += adj * (1 - a);
        d.leak[j] += adj * (act[j] - prev[j]) * a * (1 - a);
        const dz = act[j] > 0 ? adj * a * (1 - (act[j] / s) ** 2) : 0;
        if (this.preAdjoint) this.preAdjoint[t][j] = dz;
        this.driveGrad[j] += dz;
        if (dz === 0) continue;
        for (let k = g.row[j]; k < g.row[j + 1]; k++) {
          const i = g.col[k], signed = dz * g.sign[k];
          d.magnitude[k] += signed * prev[i];
          dp[i] += signed * p.magnitude[k];
        }
      }
      this.dh = dp; this.previousDh = dh;
    }
    for (let j = 0; j < n; j++) d.bias[j] += this.driveGrad[j];
    for (let i = 0; i < g.input.length; i++) {
      const delta = this.driveGrad[g.input[i]];
      d.inputBias[i] += delta;
      for (const f of this.activeInput) d.input[i * this.inputDim + f] += delta * this.x[f];
    }
    this.count++;
  }
  step({ learningRate = 0.01, clip = 1, freezeCore = false } = {}) {
    if (!(learningRate > 0) || !Number.isFinite(learningRate) || !(clip > 0) || !Number.isFinite(clip) || !this.count) throw Error('Invalid update');
    const keys = Object.keys(this.params).filter(k => !freezeCore || !['magnitude', 'bias', 'leak'].includes(k));
    let norm2 = 0;
    for (const key of keys) for (const v of this.grads[key]) norm2 += (v / this.count) ** 2;
    if (!Number.isFinite(norm2)) throw Error('Nonfinite gradient');
    const scale = learningRate * Math.min(1, clip / (Math.sqrt(norm2) || 1)) / this.count;
    let changedEdges = 0, edgeChangeL1 = 0;
    for (const key of keys) {
      const p = this.params[key], d = this.grads[key];
      for (let i = 0; i < p.length; i++) {
        const before = p[i], next = before - scale * d[i];
        p[i] = key === 'magnitude' ? Math.max(1e-8, next) : next;
        if (key === 'magnitude') this.signedMagnitude[i] = this.graph.sign[i] * p[i];
        if (key === 'magnitude' && p[i] !== before) { changedEdges++; edgeChangeL1 += Math.abs(p[i] - before); }
      }
    }
    this.zeroGrad();
    return { gradientNorm: Math.sqrt(norm2), changedEdges, edgeChangeL1 };
  }
  allocatedBytes() {
    const arrays = [...Object.values(this.params), ...Object.values(this.grads), ...this.h, ...this.activity,
      this.drive, this.alpha, this.dh, this.previousDh, this.driveGrad, this.prediction, this.signedMagnitude,
      new Uint8Array(this.sparseAccumulator.memory.buffer), ...Object.values(this.graph), ...(this.preAdjoint ?? []),
      ...Object.values(this.adam?.first ?? {}), ...Object.values(this.adam?.second ?? {})];
    return [...new Set(arrays.map(a => a.buffer))].reduce((s, b) => s + b.byteLength, 0);
  }
}
