// Diagnostic only: an upper bound on the existing fixed linear readout, never a learner or fitted weights.
// For b.x >= 0 and lambda >= 0, a.x <= (a + lambda*b).x <= support_box(a + lambda*b).
// The support is piecewise linear; its minimum lies at zero or a coefficient's sign change.
export function constrainedBoxBound(a, b, lo, hi) {
  const n = a.length;
  if (!n || [b, lo, hi].some(x => x.length !== n)
    || [...a, ...b, ...lo, ...hi].some(x => !Number.isFinite(x))
    || lo.some((v, i) => v > hi[i])) throw Error('Invalid bounded linear problem');
  const support = c => c.reduce((sum, v, i) => sum + v * (v >= 0 ? hi[i] : lo[i]), 0);
  const maxConstraint = support(b);
  if (maxConstraint < 0) return { feasible: false, maxConstraint, upper: null, lambda: null };
  let upper = support(a), lambda = 0;
  for (let i = 0; i < n; i++) {
    if (b[i] === 0) continue;
    const t = -a[i] / b[i];
    if (!(t >= 0 && Number.isFinite(t))) continue;
    const value = support(a.map((v, j) => v + t * b[j]));
    if (value < upper) { upper = value; lambda = t; }
  }
  // Generous roundoff allowance for floating-point summation; a loose upper bound stays valid.
  const scale = a.reduce((sum, v, i) => sum + (Math.abs(v) + lambda * Math.abs(b[i]))
    * Math.max(Math.abs(lo[i]), Math.abs(hi[i])), 1);
  return { feasible: true, maxConstraint, upper: upper + 1e-12 * scale, lambda };
}

export function reversalReadoutBound(fixture) {
  const { nKC: n, s, w, images, baseP, baseR } = fixture;
  // The adapter stores base efficacies and written magnitudes as Float32. Expand their entire range.
  const P = Float32Array.from(baseP), R = Float32Array.from(baseR);
  const roundSlack = 2 ** -22;
  const lo = Array.from({ length: n }, (_, i) => 0.2 * P[i] - R[i] - roundSlack);
  const hi = Array.from({ length: n }, (_, i) => P[i] - 0.2 * R[i] + roundSlack);
  const difference = (good, bad) => Array.from({ length: n }, (_, i) =>
    (images[good].h[i] - images[bad].h[i]) / (1.5 * s));
  const a = difference('A-', 'A+'); // A reversed at T3; B retains its original consequences.
  const b = difference('B+', 'B-');
  const bound = constrainedBoxBound(a, b, lo, hi);
  return { fixtureId: fixture.id, seed: fixture.seed, q: fixture.q, relation: fixture.relation,
    w, bg: fixture.bg, ...bound, upperMNorm: bound.upper === null ? null : bound.upper / (1.6 * (1 - w)),
    requiredMNorm: 0.4, constraint: 'B margin >= 0 (weaker than the actual strict positive gate)',
    scope: 'Static bounded linear readout only. All independent edge differences allowed; no update rule, exposure, or biology assumed.' };
}

// G6 is a seed-share gate while G4 is a median gate. Allow every permitted B failure optimistically.
export function aggregateReversalBounds(rows, requiredShare = 0.9) {
  if (!rows.length || !(requiredShare > 0 && requiredShare <= 1)) throw Error('Invalid bound aggregation');
  const values = rows.map(r => r.feasible ? r.upperMNorm : -Infinity).sort((a, b) => a - b);
  if (values.some(v => Number.isNaN(v) || v === undefined)) throw Error('Missing bound');
  const allowedFailures = Math.floor(rows.length * (1 - requiredShare) + 1e-9);
  values.fill(Infinity, 0, allowedFailures);
  values.sort((a, b) => a - b);
  const m = values.length >> 1;
  const optimisticMedian = values.length % 2 ? values[m] : (values[m - 1] + values[m]) / 2;
  return { nSeeds: rows.length, allowedFailures, optimisticMedian, requiredMedian: 0.4,
    incompatible: optimisticMedian < 0.4 - 1e-9 };
}
