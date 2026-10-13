// First-order consistent local surrogate for a directed recurrent block.
// Only receiving rows inside the block are trainable. The surrounding activity
// is frozen at the anchor; adjoint forces account for outgoing influences.
// At the anchor its block gradient equals the full loss gradient. Away from the
// anchor it approximates outside feedback and needs true-loss verification.
export class CircuitTrainer {
  constructor(model, nodes) {
    const m = model, g = m.graph, A = m.params.bias.constructor;
    if (!nodes.length || new Set(nodes).size !== nodes.length || nodes.some(i => !Number.isInteger(i) || i < 0 || i >= m.n)) throw Error('Invalid block nodes');
    this.model = m; this.nodes = Int32Array.from(nodes); this.size = nodes.length;
    this.local = new Int32Array(m.n).fill(-1);
    nodes.forEach((j, i) => { this.local[j] = i; });
    const edges = [], ptr = [0], outgoing = [], outgoingReceiver = [], outgoingSender = [];
    for (const j of nodes) { for (let e = g.row[j]; e < g.row[j + 1]; e++) edges.push(e); ptr.push(edges.length); }
    for (let j = 0; j < m.n; j++) if (this.local[j] < 0) {
      for (let e = g.row[j]; e < g.row[j + 1]; e++) if (this.local[g.col[e]] >= 0) {
        outgoing.push(e); outgoingReceiver.push(j); outgoingSender.push(this.local[g.col[e]]);
      }
    }
    this.edges = Int32Array.from(edges); this.ptr = Int32Array.from(ptr);
    this.outgoing = Int32Array.from(outgoing); this.outReceiver = Int32Array.from(outgoingReceiver); this.outSender = Int32Array.from(outgoingSender);
    this.inputs = Int32Array.from(Array.from(g.input.keys()).filter(i => this.local[g.input[i]] >= 0));
    this.outputs = Int32Array.from(Array.from(g.output.keys()).filter(i => this.local[g.output[i]] >= 0));
    const alloc = n => new A(n);
    this.h = Array.from({ length: m.steps + 1 }, () => alloc(nodes.length));
    this.act = Array.from({ length: m.steps }, () => alloc(nodes.length));
    this.force = Array.from({ length: m.steps + 1 }, () => alloc(nodes.length));
    this.dh = alloc(nodes.length); this.dp = alloc(nodes.length); this.driveGrad = alloc(nodes.length);
    this.drive = alloc(nodes.length); this.alpha = alloc(nodes.length); this.prediction = alloc(m.outputs);
    this.grads = { magnitude: alloc(edges.length), bias: alloc(nodes.length), leak: alloc(nodes.length),
      input: alloc(this.inputs.length * m.inputDim), inputBias: alloc(this.inputs.length) };
    this.backup = Object.fromEntries(Object.entries(this.grads).map(([k, a]) => [k, alloc(a.length)]));
    this.anchored = false;
  }
  anchor(x, target, outputGradient = undefined) {
    const m = this.model;
    m.recordBoundaryAdjoints(); m.zeroGrad(); m.forward(x); this.anchorLoss = m.loss(target);
    if (outputGradient === undefined) m.backward(target); else m.backwardOutput(outputGradient);
    this.x = new m.params.bias.constructor(x); this.target = Array.from(target);
    this.basePrediction = Array.from(m.prediction);
    // Own the anchor tapes: true-loss probes are allowed to overwrite m.h.
    this.baseH ??= m.h.map(a => new a.constructor(a.length));
    for (let t = 0; t < m.h.length; t++) this.baseH[t].set(m.h[t]);
    for (const a of this.force) a.fill(0);
    for (let t = 1; t < m.steps; t++) {
      const force = this.force[t], outsideDz = m.preAdjoint[t];
      for (let k = 0; k < this.outgoing.length; k++) {
        const e = this.outgoing[k];
        force[this.outSender[k]] += m.graph.sign[e] * m.params.magnitude[e] * outsideDz[this.outReceiver[k]];
      }
    }
    this.copyParams(this.backup, false);
    this.anchored = true;
    return this.anchorLoss;
  }
  copyParams(storage, restore) {
    const m = this.model, p = m.params;
    for (let k = 0; k < this.edges.length; k++) {
      if (restore) m.setMagnitude(this.edges[k], storage.magnitude[k]); else storage.magnitude[k] = p.magnitude[this.edges[k]];
    }
    for (let k = 0; k < this.size; k++) for (const key of ['bias', 'leak']) {
      if (restore) p[key][this.nodes[k]] = storage[key][k]; else storage[key][k] = p[key][this.nodes[k]];
    }
    for (let k = 0; k < this.inputs.length; k++) {
      const i = this.inputs[k];
      if (restore) p.inputBias[i] = storage.inputBias[k]; else storage.inputBias[k] = p.inputBias[i];
      for (let f = 0; f < m.inputDim; f++) {
        if (restore) p.input[i * m.inputDim + f] = storage.input[k * m.inputDim + f];
        else storage.input[k * m.inputDim + f] = p.input[i * m.inputDim + f];
      }
    }
  }
  forward() {
    if (!this.anchored) throw Error('Missing anchor');
    const m = this.model, p = m.params, g = m.graph, s = m.saturation;
    this.h[0].fill(0);
    for (let k = 0; k < this.size; k++) { this.drive[k] = p.bias[this.nodes[k]]; this.alpha[k] = 1 / (1 + Math.exp(-p.leak[this.nodes[k]])); }
    for (const i of this.inputs) {
      let z = p.inputBias[i];
      for (let f = 0; f < m.inputDim; f++) if (this.x[f] !== 0) z += p.input[i * m.inputDim + f] * this.x[f];
      this.drive[this.local[g.input[i]]] += z;
    }
    for (let t = 0; t < m.steps; t++) {
      for (let j = 0; j < this.size; j++) {
        let z = this.drive[j];
        for (let k = this.ptr[j]; k < this.ptr[j + 1]; k++) {
          const e = this.edges[k], i = g.col[e], local = this.local[i];
          z += g.sign[e] * p.magnitude[e] * (local < 0 ? this.baseH[t][i] : this.h[t][local]);
        }
        if (!Number.isFinite(z)) throw Error('Nonfinite circuit input');
        const act = z > 0 ? s * Math.tanh(z / s) : 0;
        this.act[t][j] = act;
        this.h[t + 1][j] = (1 - this.alpha[j]) * this.h[t][j] + this.alpha[j] * this.act[t][j];
      }
    }
    let loss = 0, correction = 0;
    for (let o = 0; o < m.outputs; o++) {
      let z = this.basePrediction[o];
      for (const i of this.outputs) {
        const j = g.output[i];
        z += p.head[o * g.output.length + i] * (this.h[m.steps][this.local[j]] - this.baseH[m.steps][j]);
      }
      this.prediction[o] = z; loss += (z - this.target[o]) ** 2 / (2 * m.outputs);
    }
    for (let t = 1; t < m.steps; t++) for (let j = 0; j < this.size; j++) correction += this.force[t][j] * (this.h[t][j] - this.baseH[t][this.nodes[j]]);
    return { loss: loss + correction, readoutLoss: loss, correction };
  }
  backward(outputGradient = undefined) {
    if (!this.anchored) throw Error('Missing anchor');
    const m = this.model, p = m.params, g = m.graph, d = this.grads;
    if (outputGradient !== undefined && (outputGradient.length !== m.outputs || !Array.from(outputGradient).every(Number.isFinite))) throw Error('Invalid circuit output gradient');
    for (const a of Object.values(d)) a.fill(0);
    this.dh.fill(0); this.driveGrad.fill(0);
    for (let o = 0; o < m.outputs; o++) {
      const delta = outputGradient === undefined ? (this.prediction[o] - this.target[o]) / m.outputs : outputGradient[o];
      for (const i of this.outputs) this.dh[this.local[g.output[i]]] += delta * p.head[o * g.output.length + i];
    }
    for (let t = m.steps - 1; t >= 0; t--) {
      const dh = this.dh, dp = this.dp; dp.fill(0);
      for (let j = 0; j < this.size; j++) {
        const adj = dh[j] + this.force[t + 1][j], a = this.alpha[j], act = this.act[t][j];
        dp[j] += adj * (1 - a);
        d.leak[j] += adj * (act - this.h[t][j]) * a * (1 - a);
        const dz = act > 0 ? adj * a * (1 - (act / m.saturation) ** 2) : 0;
        this.driveGrad[j] += dz;
        for (let k = this.ptr[j]; k < this.ptr[j + 1]; k++) {
          const e = this.edges[k], i = g.col[e], local = this.local[i];
          d.magnitude[k] += dz * g.sign[e] * (local < 0 ? this.baseH[t][i] : this.h[t][local]);
          if (local >= 0) dp[local] += dz * g.sign[e] * p.magnitude[e];
        }
      }
      this.dh = dp; this.dp = dh;
    }
    d.bias.set(this.driveGrad);
    for (let k = 0; k < this.inputs.length; k++) {
      const delta = this.driveGrad[this.local[g.input[this.inputs[k]]]];
      d.inputBias[k] = delta;
      for (let f = 0; f < m.inputDim; f++) d.input[k * m.inputDim + f] = delta * this.x[f];
    }
  }
  step(learningRate = 0.01, clip = 1) {
    if (!this.anchored) throw Error('Missing anchor');
    if (!(learningRate > 0) || !Number.isFinite(learningRate) || !(clip > 0) || !Number.isFinite(clip)) throw Error('Invalid update');
    let norm2 = 0;
    for (const a of Object.values(this.grads)) for (const v of a) norm2 += v * v;
    if (!Number.isFinite(norm2)) throw Error('Nonfinite gradient');
    const scale = learningRate * Math.min(1, clip / (Math.sqrt(norm2) || 1)), p = this.model.params;
    for (let k = 0; k < this.edges.length; k++) {
      const edge = this.edges[k];
      p.magnitude[edge] = Math.max(1e-8, p.magnitude[edge] - scale * this.grads.magnitude[k]);
      this.model.signedMagnitude[edge] = this.model.graph.sign[edge] * p.magnitude[edge];
    }
    for (let k = 0; k < this.size; k++) for (const key of ['bias', 'leak']) p[key][this.nodes[k]] -= scale * this.grads[key][k];
    for (let k = 0; k < this.inputs.length; k++) {
      const i = this.inputs[k]; p.inputBias[i] -= scale * this.grads.inputBias[k];
      for (let f = 0; f < this.model.inputDim; f++) p.input[i * this.model.inputDim + f] -= scale * this.grads.input[k * this.model.inputDim + f];
    }
    return Math.sqrt(norm2);
  }
  verify({ rejectWorse = true } = {}) {
    if (!this.anchored) throw Error('Missing anchor');
    const m = this.model;
    let trueLoss, numericalError;
    try { m.forward(this.x); trueLoss = m.loss(this.target); }
    catch (error) { trueLoss = Infinity; numericalError = error.message; }
    const accepted = Number.isFinite(trueLoss) && trueLoss <= this.anchorLoss;
    if (!accepted && rejectWorse) this.copyParams(this.backup, true);
    this.anchored = false;
    return { accepted, anchorLoss: this.anchorLoss, trueLoss, rolledBack: !accepted && rejectWorse, numericalError };
  }
}
