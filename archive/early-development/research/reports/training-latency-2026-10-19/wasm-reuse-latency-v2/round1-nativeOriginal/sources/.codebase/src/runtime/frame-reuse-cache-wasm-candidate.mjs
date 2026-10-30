// Disposable engineering state. Every skipped row retains the original complete
// activity/state history; equality is exact, with no numerical threshold.
export class FrameReuseCache {
  #frames = new Map();
  #base = null;
  #reference = null;
  #slot = null;
  #weightDirty = null;
  #bytes = 0;
  constructor(limitBytes = 256 * 2 ** 20, reservedBytes = 0) { this.limitBytes = limitBytes - reservedBytes; }
  get allocatedBytes() { return this.#bytes; }
  clear() {
    this.#frames.clear(); this.#base = null; this.#reference = null; this.#slot = null;
    this.#weightDirty = null; this.#bytes = 0;
  }
  begin(model, slot) {
    this.#reference = null; this.#slot = null;
    if (!Number.isSafeInteger(slot) || slot < 0 || slot >= 32
      || model.h.length !== model.steps + 1 || model.activity.length !== model.steps
      || [...model.h, ...model.activity, model.drive, model.alpha].some(a => a.length !== model.n)) return;
    const {graph: g, signedMagnitude: weights, n} = model;
    // The Wasm classifier compares original bits. Mixed history dtypes use the
    // unchanged full computation rather than comparing rounded scratch copies.
    if ([...model.h, ...model.activity].some(a => a.constructor !== weights.constructor)) {this.clear(); return;}
    const types = [...model.h, ...model.activity, model.drive, model.alpha].map(a => a.constructor);
    let changed = !this.#base || this.#base.row.length !== g.row.length || this.#base.col.length !== g.col.length
      || this.#base.weight.constructor !== weights.constructor || this.#base.steps !== model.steps
      || types.some((Type, i) => Type !== this.#base.types[i]);
    if (!changed) {
      changed = !model.sparseAccumulator.reuseTopologyMatches();
    }
    if (changed) {
      this.clear();
      const needed = g.row.byteLength + g.col.byteLength + weights.byteLength + n;
      if (needed > this.limitBytes) return;
      this.#base = {row: g.row.slice(), col: g.col.slice(), weight: weights.slice(), steps: model.steps, types};
      this.#weightDirty = new Uint8Array(n);
      model.sparseAccumulator.resetReuseReference(this.#base.row, this.#base.col, this.#base.weight);
      this.#bytes = needed;
    }
    this.#slot = slot;
    this.#reference = this.#frames.get(slot) ?? null;
    this.#weightDirty.fill(0);
    if (!changed) model.sparseAccumulator.populateReuseWeightDirty(this.#weightDirty);
    const ref = this.#reference;
    if (ref) for (let j = 0; j < n; j++) model.sparseAccumulator.reuseBaseDirty[j] = Number(
      !Object.is(model.saturation, ref.saturation) || this.#weightDirty[j] || ref.weightDirty[j]
      || !Object.is(model.drive[j], ref.drive[j]) || !Object.is(model.alpha[j], ref.alpha[j]));
  }
  mask(model, step) {
    if (!this.#reference) return null;
    return model.sparseAccumulator.classifyReuse(model.h[step], this.#reference.h[step]);
  }
  copyRow(step, row, next, activity) {
    next[row] = this.#reference.h[step + 1][row];
    activity[row] = this.#reference.activity[step][row];
  }
  commit(model) {
    if (this.#slot === null) return;
    let target = this.#reference;
    if (!target) {
      const bytes = [...model.h, ...model.activity, model.drive, model.alpha].reduce((s, a) => s + a.byteLength, 0)
        + this.#weightDirty.byteLength;
      if (this.#bytes + bytes > this.limitBytes) {this.#slot = null; return;}
      target = {h: model.h.map(a => a.slice()), activity: model.activity.map(a => a.slice()),
        drive: model.drive.slice(), alpha: model.alpha.slice(), weightDirty: this.#weightDirty.slice(),
        saturation: model.saturation};
      this.#frames.set(this.#slot, target); this.#bytes += bytes;
    } else {
      for (let t = 0; t < model.h.length; t++) target.h[t].set(model.h[t]);
      for (let t = 0; t < model.activity.length; t++) target.activity[t].set(model.activity[t]);
      target.drive.set(model.drive); target.alpha.set(model.alpha);
      target.weightDirty.set(this.#weightDirty); target.saturation = model.saturation;
    }
    this.#slot = null; this.#reference = null;
  }
}
