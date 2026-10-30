import { CircuitTrainer } from '../runtime/circuit.mjs';
import { pairedObjective } from './paired.mjs';

// Two position-specific caches share one active parameter block. Neither cache
// is reused for another board. Outside forces include the pair-loss derivative.
export class PairedCircuitTrainer {
  constructor(model, nodes) {
    this.model = model;
    this.a = new CircuitTrainer(model, nodes);
    this.b = new CircuitTrainer(model, nodes);
    this.anchored = false;
  }
  anchor(xa, xb, ya, yb, lambda = 1) {
    this.anchored = false;
    this.objective = undefined;
    const m = this.model;
    const a = Array.from(m.forward(xa)), b = Array.from(m.forward(xb));
    const objective = pairedObjective(a, b, ya, yb, lambda);
    this.lambda = lambda;
    // pairedObjective derivatives are doubled for PairedTrainer's count=2
    // averaging. Local updates use an already averaged objective gradient.
    this.a.anchor(xa, ya, objective.da.map(v => v / 2));
    this.b.anchor(xb, yb, objective.db.map(v => v / 2));
    m.zeroGrad();
    this.anchorLoss = objective.loss;
    this.anchored = true;
    return objective;
  }
  forward() {
    if (!this.anchored) throw Error('Missing pair anchor');
    const a = this.a.forward(), b = this.b.forward();
    this.objective = pairedObjective(this.a.prediction, this.b.prediction, this.a.target, this.b.target, this.lambda);
    return { loss: this.objective.loss + a.correction + b.correction,
      readoutLoss: this.objective.loss, correction: a.correction + b.correction };
  }
  backward() {
    if (!this.anchored || !this.objective) throw Error('Pair forward required');
    this.a.backward(this.objective.da.map(v => v / 2));
    this.b.backward(this.objective.db.map(v => v / 2));
    for (const key of Object.keys(this.a.grads)) {
      const da = this.a.grads[key], db = this.b.grads[key];
      for (let k = 0; k < da.length; k++) da[k] += db[k];
    }
  }
  step(learningRate = 0.01, clip = 1) {
    if (!this.anchored) throw Error('Missing pair anchor');
    const norm = this.a.step(learningRate, clip);
    this.objective = undefined;
    return norm;
  }
  verify() {
    if (!this.anchored) throw Error('Missing pair anchor');
    const m = this.model;
    let trueLoss, numericalError;
    try {
      const a = Array.from(m.forward(this.a.x)), b = m.forward(this.b.x);
      trueLoss = pairedObjective(a, b, this.a.target, this.b.target, this.lambda).loss;
    } catch (error) { trueLoss = Infinity; numericalError = error.message; }
    const accepted = Number.isFinite(trueLoss) && trueLoss <= this.anchorLoss;
    if (!accepted) this.a.copyParams(this.a.backup, true);
    this.anchored = this.a.anchored = this.b.anchored = false;
    this.objective = undefined;
    m.zeroGrad();
    return { accepted, anchorLoss: this.anchorLoss, trueLoss, rolledBack: !accepted, numericalError };
  }
}
