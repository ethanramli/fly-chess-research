// Disposable engineering state. Every skipped row retains the original complete
// activity/state history; equality is exact, with no numerical threshold.
export class FrameReuseCache {
  #frames = new Map();
  #base = null;
  #reference = null;
  #slot = null;
  #weightDirty = null;
  #changed = null;
  #mask = null;
  #bytes = 0;
  constructor(limitBytes = 256 * 2 ** 20) { this.limitBytes = limitBytes; }
  get allocatedBytes() { return this.#bytes; }
  clear() {
    this.#frames.clear(); this.#base = null; this.#reference = null; this.#slot = null;
    this.#weightDirty = null; this.#changed = null; this.#mask = null; this.#bytes = 0;
  }
  begin(model, slot) {
    this.#reference = null; this.#slot = null;
    if (!Number.isSafeInteger(slot) || slot < 0 || slot >= 32
      || model.h.length !== model.steps + 1 || model.activity.length !== model.steps
      || [...model.h, ...model.activity, model.drive, model.alpha].some(a => a.length !== model.n)) return;
    const {graph: g, signedMagnitude: weights, n} = model;
    const types = [...model.h, ...model.activity, model.drive, model.alpha].map(a => a.constructor);
    let changed = !this.#base || this.#base.row.length !== g.row.length || this.#base.col.length !== g.col.length
      || this.#base.weight.constructor !== weights.constructor || this.#base.steps !== model.steps
      || types.some((Type, i) => Type !== this.#base.types[i]);
    if (!changed) {
      for (let i = 0; i < g.row.length && !changed; i++) changed = g.row[i] !== this.#base.row[i];
      for (let i = 0; i < g.col.length && !changed; i++) changed = g.col[i] !== this.#base.col[i];
    }
    if (changed) {
      this.clear();
      const needed = g.row.byteLength + g.col.byteLength + weights.byteLength + 3 * n;
      if (needed > this.limitBytes) return;
      this.#base = {row: g.row.slice(), col: g.col.slice(), weight: weights.slice(), steps: model.steps, types};
      this.#weightDirty = new Uint8Array(n); this.#changed = new Uint8Array(n); this.#mask = new Uint8Array(n);
      this.#bytes = needed;
    }
    this.#slot = slot;
    this.#reference = this.#frames.get(slot) ?? null;
    this.#weightDirty.fill(0);
    // One shared canonical weight vector bounds cache storage. A row whose
    // weights differ from that vector in either trajectory is always recomputed.
    for (let j = 0; j < n; j++) {
      for (let k = g.row[j]; k < g.row[j + 1]; k++) {
        if (!Object.is(weights[k], this.#base.weight[k])) {this.#weightDirty[j] = 1; break;}
      }
    }
  }
  mask(model, step) {
    const ref = this.#reference;
    if (!ref) return null;
    const {graph: g, n} = model, previous = model.h[step], old = ref.h[step];
    for (let i = 0; i < n; i++) this.#changed[i] = Number(!Object.is(previous[i], old[i]));
    const saturationChanged = !Object.is(model.saturation, ref.saturation);
    for (let j = 0; j < n; j++) {
      let dirty = Boolean(saturationChanged || this.#weightDirty[j] || ref.weightDirty[j] || this.#changed[j]
        || !Object.is(model.drive[j], ref.drive[j]) || !Object.is(model.alpha[j], ref.alpha[j]));
      for (let k = g.row[j]; !dirty && k < g.row[j + 1]; k++) dirty = Boolean(this.#changed[g.col[k]]);
      this.#mask[j] = Number(dirty);
    }
    return this.#mask;
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
