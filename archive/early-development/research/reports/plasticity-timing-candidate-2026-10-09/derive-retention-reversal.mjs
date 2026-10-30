// Closed-form consequences of stored scalar pulse maps, not learner training.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const pulses=JSON.parse(readFileSync(new URL('./complete-pulses.json',import.meta.url)));
const {minGain,maxGain,eta,tauKC}=pulses.config;
const down=pulses.fixedPoints.find(p=>p.onset===0),up=pulses.fixedPoints.find(p=>p.onset===-1.2);
function crossing(map,start,threshold,direction){
  const target=map.intercept/(1-map.slope);
  assert(map.slope>0&&map.slope<1);
  const n=Math.floor(Math.log((threshold-target)/(start-target))/Math.log(map.slope))+1;
  const value=k=>target+(start-target)*map.slope**k;
  assert(n>0&&direction*(value(n)-threshold)>0&&direction*(value(n-1)-threshold)<=0);
  return {from:start,threshold,pulses:n,lastBefore:value(n-1),firstAfter:value(n),
    assumption:'Identical isolated pulse map with negligible intervening traces; scalar gain crossing, not behavioral reversal.'};
}
const bounds=[0,0.8,2,4].map(quietGap=>({quietGap,
  atUnitDANBound:(maxGain-minGain)*eta*tauKC*Math.exp(-quietGap/tauKC),
  atModelRateBound:(maxGain-minGain)*eta*tauKC*(10/1.5)*Math.exp(-quietGap/tauKC)}));
const report={scope:'Analytic bounds only; no graph, neural input fitting or prospective training.',
  reversal:{up:crossing(up,minGain,1,1),down:crossing(down,maxGain,1,-1)},
  inactiveCueBound:{formula:'abs(gFuture-gNow) <= (gmax-gmin)*eta*R*eNow*tauKC',
    assumptions:['KC input remains exactly zero for the entire future interval','DAN rate and both response states stay in [0,R]',
      'Only the declared local gain equation acts; initial KC trace is eNow',
      'Quiet-gap examples assume KC remains zero and eBeforeGap <= 1; no CPU rest-to-model-time conversion'],bounds},
  limitation:'Shared KC activity invalidates the inactive-cue premise. Static cue separation and existing all-legal overlap do not establish behavioral retention.'};
writeFileSync(new URL('./retention-reversal-bounds.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
