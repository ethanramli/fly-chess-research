// Objective: mean absolute-position half-MSE + lambda * difference half-MSE.
// Multiply output derivatives by two because the trainer averages two positions.
export function pairedObjective(a, b, ya, yb, lambda = 1, weights = undefined) {
  if (!(lambda >= 0) || !Number.isFinite(lambda) || !a.length || [b, ya, yb].some(v => v.length !== a.length)) throw Error('Invalid pair');
  if (weights !== undefined && (weights.length !== a.length || !Array.from(weights).every(w => Number.isFinite(w) && w > 0))) throw Error('Invalid criterion weights');
  let absolute = 0, difference = 0;
  const da = [], db = [];
  for (let i = 0; i < a.length; i++) {
    if (![a[i], b[i], ya[i], yb[i]].every(Number.isFinite)) throw Error('Nonfinite pair');
    const ea = a[i] - ya[i], eb = b[i] - yb[i], ed = ea - eb;
    const w = weights?.[i] ?? 1;
    absolute += w * (ea * ea + eb * eb) / (4 * a.length);
    difference += w * ed * ed / (2 * a.length);
    da.push(w * (ea + 2 * lambda * ed) / a.length);
    db.push(w * (eb - 2 * lambda * ed) / a.length);
  }
  return { loss: absolute + lambda * difference, absolute, difference, da, db };
}

export class PairedTrainer {
  constructor(model) {
    this.model = model;
    this.savedH = model.h.map(a => new a.constructor(a.length));
    this.savedActivity = model.activity.map(a => new a.constructor(a.length));
  }
  train(xa, xb, ya, yb, lambda = 1, weights = undefined) {
    const m = this.model, pa = Array.from(m.forward(xa));
    for (let t = 0; t < m.h.length; t++) this.savedH[t].set(m.h[t]);
    for (let t = 0; t < m.activity.length; t++) this.savedActivity[t].set(m.activity[t]);
    const activeA = m.activeInput.slice();
    const pb = Array.from(m.forward(xb));
    const objective = pairedObjective(pa, pb, ya, yb, lambda, weights);
    m.backwardOutput(objective.db);
    for (let t = 0; t < m.h.length; t++) m.h[t].set(this.savedH[t]);
    for (let t = 0; t < m.activity.length; t++) m.activity[t].set(this.savedActivity[t]);
    m.x = xa; m.activeInput = activeA; m.prediction.set(pa);
    m.backwardOutput(objective.da);
    return objective;
  }
  allocatedBytes() { return this.model.allocatedBytes() + [...this.savedH, ...this.savedActivity].reduce((s, a) => s + a.byteLength, 0); }
}
