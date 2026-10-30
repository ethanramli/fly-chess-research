// Engineering bounded-plasticity branch driven by local rate histories.
// Filter structure: Gkanias 2022 timing model. Gain law/eligibility: hypotheses.
// Exact under piecewise-constant normalized KC rate and nonnegative DAN rate.
import { stepDopamineComponents } from './dopamine-response-components.mjs';
import { stepBidirectional } from './bidirectional-plasticity-kernel.mjs';

export function stepRateTimingPlasticity(state, { kcRate, danRate, dt }, config) {
  const { gain, kcTrace, short, long } = state;
  const { tauKC, tauShort, tauLong, eta, minGain, maxGain } = config;
  if (![gain,kcTrace,kcRate,danRate,dt,tauKC,eta,minGain,maxGain].every(Number.isFinite)
    || kcTrace < 0 || kcTrace > 1 || kcRate < 0 || kcRate > 1 || danRate < 0 || dt < 0
    || tauKC <= 0 || eta <= 0 || minGain <= 0 || minGain >= 1 || maxGain <= 1
    || gain < minGain || gain > maxGain) throw Error('Invalid rate-timing input');
  const components = stepDopamineComponents({short,long},{rate:danRate,dt},config);
  const nextTrace = kcTrace + (kcRate-kcTrace)*-Math.expm1(-dt/tauKC);
  const A=long-danRate, B=short-danRate, C=kcTrace-kcRate;
  // delta(t)=A exp(-t/tauLong)-B exp(-t/tauShort) has at most one
  // interior zero. Split there so each interval has a fixed gain target.
  const cuts=[0];
  if(A!==0 && B!==0 && Math.sign(A)===Math.sign(B)){
    const crossing=(Math.log(Math.abs(A))-Math.log(Math.abs(B)))/(1/tauLong-1/tauShort);
    if(crossing>0 && crossing<dt)cuts.push(crossing);
  }
  cuts.push(dt);
  const integral=(tau,a,b)=>tau*Math.exp(-a/tau)*-Math.expm1(-(b-a)/tau);
  let nextGain=gain, depressionDose=0, potentiationDose=0;
  for(let i=1;i<cuts.length;i++){
    const a=cuts[i-1],b=cuts[i];
    // Integral of the nonnegative KC trace times the signed local factor.
    const dose=eta*(kcRate*(A*integral(tauLong,a,b)-B*integral(tauShort,a,b))
      +C*(A*integral(1/(1/tauKC+1/tauLong),a,b)-B*integral(1/(1/tauKC+1/tauShort),a,b)));
    if(!Number.isFinite(dose))throw Error('Nonfinite integrated rate-timing dose');
    if(dose===0)continue;
    if(dose>0)potentiationDose+=dose;else depressionDose-=dose;
    nextGain=stepBidirectional({gain:nextGain,eligibility:1,potentiation:dose>0?1:0,
      depression:dose<0?1:0,dt:Math.abs(dose),minGain,maxGain}).gain;
  }
  return {state:{gain:nextGain,kcTrace:nextTrace,...components.state},depressionDose,potentiationDose};
}
