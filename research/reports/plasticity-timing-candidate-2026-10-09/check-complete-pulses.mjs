// Scalar equation characterization. No graph, chess inputs or learner fitting.
import {writeFileSync} from 'node:fs';
import {stepRateTimingPlasticity as step} from '../../../.codebase/src/neural-learning/rate-timing-plasticity-candidate.mjs';
const config={tauKC:0.4,tauShort:0.6,tauLong:1,eta:0.5,minGain:0.2,maxGain:1.8};
const rows=[];
for(const initialGain of [0.2,0.7,1,1.3,1.8])for(const onset of [-6,-1.2,-0.6,0,0.5,6]){
  const cuts=[...new Set([Math.min(0,onset),0,0.5,onset,onset+0.6,Math.max(0.5,onset+0.6)+30])].sort((a,b)=>a-b);
  let state={gain:initialGain,kcTrace:0,short:0,long:0},depressionDose=0,potentiationDose=0;
  for(let i=1;i<cuts.length;i++){
    const a=cuts[i-1],b=cuts[i],mid=(a+b)/2;
    const result=step(state,{kcRate:mid>=0&&mid<0.5?1:0,
      danRate:mid>=onset&&mid<onset+0.6?1:0,dt:b-a},config);
    state=result.state;depressionDose+=result.depressionDose;potentiationDose+=result.potentiationDose;
  }
  // Repeated identical pulses separated by vanishing traces have affine gain
  // maps; the fixed point is derived from the two boundary cases below.
  rows.push({initialGain,onset,finalGain:state.gain,change:state.gain-initialGain,depressionDose,potentiationDose,
    residualTrace:Math.max(state.kcTrace,state.short,state.long)});
}
const fixedPoints=[-6,-1.2,-0.6,0,0.5,6].map(onset=>{
  const lo=rows.find(r=>r.onset===onset&&r.initialGain===0.2),hi=rows.find(r=>r.onset===onset&&r.initialGain===1.8);
  const slope=(hi.finalGain-lo.finalGain)/1.6,intercept=lo.finalGain-slope*0.2;
  return {onset,slope,intercept,fixedPoint:slope===1?null:intercept/(1-slope)};
});
const report={scope:'Complete scalar pulse and quiet-tail arithmetic with previously used numerical parameters. Times are model units, not biological seconds; no fitted parameters or neural run.',config,rows,fixedPoints};
writeFileSync(new URL('./complete-pulses.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({fromBaseline:rows.filter(r=>r.initialGain===1),fixedPoints},null,2));
