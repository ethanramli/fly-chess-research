// Candidate bidirectional plasticity branch: engineering hypothesis, not a published law.
// See documentation/design/neural-learning/bidirectional-plasticity-without-freezing.md.
// Pure numerical kernel: no graph, no teacher labels, no chess answers.
// The simulation must generate e/a/b locally; the teacher never supplies them.
import assert from 'node:assert/strict';

export const KERNEL_SCHEMA = 'bidirectional-plasticity-kernel-v1';

function finite(value, name) {
  assert.ok(Number.isFinite(value), `Nonfinite ${name}`);
  return value;
}

// Illustrative bounded branch: dg/dt = e * [b*(gmax-g) - a*(g-gmin)].
// Closed form for fixed drives over dt. gStar comes from local drives only,
// never from a chess target.
export function stepBidirectional({ gain, eligibility, potentiation, depression, dt, minGain = 0.2, maxGain = 1.8 }) {
  for (const [v, n] of [[gain, 'gain'], [eligibility, 'eligibility'], [potentiation, 'potentiation'],
    [depression, 'depression'], [dt, 'dt'], [minGain, 'minGain'], [maxGain, 'maxGain']]) finite(v, n);
  assert.ok(eligibility >= 0 && eligibility <= 1, 'Eligibility must be bounded in [0,1]');
  assert.ok(potentiation >= 0 && depression >= 0, 'Local drives must be nonnegative magnitudes');
  assert.ok(dt > 0, 'Require positive interval');
  assert.ok(minGain > 0 && minGain < 1 && maxGain > 1, 'Require bracketing bounds');
  assert.ok(gain >= minGain && gain <= maxGain, 'Gain starts out of bounds');
  const A = eligibility * depression, B = eligibility * potentiation;
  if (A + B === 0) return { gain, target: null, rate: 0, saturated: false };
  const target = (A * minGain + B * maxGain) / (A + B);
  const next = target + (gain - target) * Math.exp(-(A + B) * dt);
  const clamped = Math.max(minGain, Math.min(maxGain, next));
  return { gain: clamped, target, rate: A + B,
    saturated: clamped === minGain || clamped === maxGain };
}

// Eligibility decay scales both drives equally, so it changes speed (rate)
// without changing the equilibrium target. Delay helper only.
export function decayEligibility(eligibility, dt, tau) {
  finite(eligibility, 'eligibility'); finite(dt, 'dt'); finite(tau, 'tau');
  assert.ok(eligibility >= 0 && eligibility <= 1, 'Eligibility must be bounded in [0,1]');
  assert.ok(dt >= 0 && tau > 0, 'Require nonnegative delay and positive lifetime');
  return eligibility * Math.exp(-dt / tau);
}

// Fixed comparator: the current source-rule update, preserved unchanged so the
// assay can contrast it. One-sided from scratch; recovery at zero eligibility.
export function stepSourceRule({ gain, eligibility, danRate, dt, eta = 0.5, minGain = 0.2, maxGain = 1.8 }) {
  for (const [v, n] of [[gain, 'gain'], [eligibility, 'eligibility'], [danRate, 'danRate'],
    [dt, 'dt'], [eta, 'eta']]) finite(v, n);
  assert.ok(eligibility >= 0 && eligibility <= 1, 'Eligibility must be bounded in [0,1]');
  assert.ok(danRate >= 0, 'Source rule takes a rectified nonnegative rate');
  const equilibrium = 1 - eligibility;
  const next = equilibrium + (gain - equilibrium) * Math.exp(-eta * danRate * dt);
  return { gain: Math.max(minGain, Math.min(maxGain, next)), equilibrium };
}
