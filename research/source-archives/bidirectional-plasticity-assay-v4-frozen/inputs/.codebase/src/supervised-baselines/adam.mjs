// Standard Adam moments with projected positive connection magnitudes. This is
// an optimizer baseline, not a novel algorithm. No dense graph is constructed.
export function initializeAdam(model) {
  if (model.adam) return model.adam;
  const make = () => Object.fromEntries(Object.entries(model.params).map(([k, a]) => [k, new a.constructor(a.length)]));
  model.adam = { step: 0, first: make(), second: make() };
  return model.adam;
}
export function adamStep(model, { learningRate = 0.001, clip = 1 } = {}) {
  if (!(learningRate > 0) || !Number.isFinite(learningRate) || !(clip > 0) || !Number.isFinite(clip) || !model.count) throw Error('Invalid Adam update');
  const a = initializeAdam(model), beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;
  let norm2 = 0;
  for (const d of Object.values(model.grads)) for (const v of d) norm2 += (v / model.count) ** 2;
  if (!Number.isFinite(norm2)) throw Error('Nonfinite gradient');
  const scale = Math.min(1, clip / (Math.sqrt(norm2) || 1)) / model.count;
  const t = ++a.step, correction1 = 1 - beta1 ** t, correction2 = 1 - beta2 ** t;
  let changedEdges = 0, edgeChangeL1 = 0;
  for (const key of Object.keys(model.params)) {
    const p = model.params[key], d = model.grads[key], first = a.first[key], second = a.second[key];
    for (let i = 0; i < p.length; i++) {
      const g = d[i] * scale, before = p[i];
      first[i] = beta1 * first[i] + (1 - beta1) * g;
      second[i] = beta2 * second[i] + (1 - beta2) * g * g;
      const next = before - learningRate * (first[i] / correction1) / (Math.sqrt(second[i] / correction2) + epsilon);
      p[i] = key === 'magnitude' ? Math.max(1e-8, next) : next;
      if (key === 'magnitude') model.signedMagnitude[i] = model.graph.sign[i] * p[i];
      if (key === 'magnitude' && p[i] !== before) { changedEdges++; edgeChangeL1 += Math.abs(p[i] - before); }
    }
  }
  model.zeroGrad();
  return { gradientNorm: Math.sqrt(norm2), changedEdges, edgeChangeL1 };
}
