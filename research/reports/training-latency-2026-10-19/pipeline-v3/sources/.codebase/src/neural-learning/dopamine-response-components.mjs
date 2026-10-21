// Rate-compatible approximation of the two response components in Gkanias
// 2022, authors' handler.py at 1610c800. These are abstract local states,
// not measured receptor concentrations or two anatomical DAN populations.
// Continuous exponential relaxation replaces the source's discrete filters.
export function stepDopamineComponents(state, { rate, dt }, { tauShort, tauLong }) {
  if (![state.short,state.long,rate,dt,tauShort,tauLong].every(Number.isFinite)
    || Math.min(state.short,state.long,rate,dt) < 0 || tauShort <= 0 || tauLong <= tauShort)
    throw Error('Invalid dopamine component state or interval');
  // Exact for a piecewise-constant rate: subdividing an interval preserves state.
  const short = state.short + (rate-state.short) * -Math.expm1(-dt/tauShort);
  const long = state.long + (rate-state.long) * -Math.expm1(-dt/tauLong);
  return { state: { short, long }, factor: long-short };
}
