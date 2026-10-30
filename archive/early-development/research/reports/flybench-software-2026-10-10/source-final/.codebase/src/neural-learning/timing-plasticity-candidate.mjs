// Phenomenological event-pair hypothesis motivated by Handler 2019, not its
// biochemical model. Events must come from local activity, never outcome labels.
// Event extraction and physiological time calibration remain unimplemented.
import { stepBidirectional } from './bidirectional-plasticity-kernel.mjs';

export const TIMING_SCHEMA = 'local-event-timing-candidate-v1';

// elapsed is time since the preceding event; no event subdivision is implied.
// An event is a bounded phasic activation, NOT a sample of tonic firing rate.
// State and config together are required to resume; this pure function mutates neither.
export function stepTimingPlasticity(state, event, config) {
  const { gain, kcTrace, danTrace } = state;
  const { kcEvent, danEvent, elapsed } = event;
  const { tauKC, tauDAN, eta, minGain, maxGain } = config;
  if (![gain,kcTrace,danTrace,kcEvent,danEvent,elapsed,tauKC,tauDAN,eta,minGain,maxGain].every(Number.isFinite)
    || [kcTrace,danTrace,kcEvent,danEvent].some(x => x < 0 || x > 1)
    || elapsed < 0 || tauKC <= 0 || tauDAN <= 0 || eta <= 0
    || minGain <= 0 || minGain >= 1 || maxGain <= 1 || gain < minGain || gain > maxGain)
    throw Error('Invalid timing state, event or configuration');
  const previousKC = kcTrace * Math.exp(-elapsed / tauKC);
  const previousDAN = danTrace * Math.exp(-elapsed / tauDAN);
  const nextKC = previousKC + (1 - previousKC) * kcEvent;
  const nextDAN = previousDAN + (1 - previousDAN) * danEvent;
  // Current KC is included for coincidence-induced depression. Potentiation
  // uses only preceding DAN, preserving event order from initially empty traces.
  const depression = danEvent * nextKC;
  const potentiation = kcEvent * previousDAN;
  const update = stepBidirectional({ gain, eligibility: 1, depression, potentiation,
    dt: eta, minGain, maxGain });
  return { state: { gain: update.gain, kcTrace: nextKC, danTrace: nextDAN },
    depression, potentiation };
}
