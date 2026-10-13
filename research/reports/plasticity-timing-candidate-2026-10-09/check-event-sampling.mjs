import { writeFileSync } from 'node:fs';
import { stepTimingPlasticity } from '../../../.codebase/src/neural-learning/timing-plasticity-candidate.mjs';
const config={tauKC:1,tauDAN:1,eta:0.5,minGain:0.2,maxGain:1.8};
const rows=[];
for(const initialGain of [0.3,1])for(const samples of [1,10,100]) {
  let state={gain:initialGain,kcTrace:0,danTrace:0};
  for(let i=0;i<samples;i++)state=stepTimingPlasticity(state,
    {kcEvent:1,danEvent:1,elapsed:1/samples},config).state;
  rows.push({initialGain,samples,finalGain:state.gain});
}
const report={scope:'Deliberate invalid use: same constant one-unit KC/DAN rate block treated as sample-count events. Counterexample to a naive rate adapter, not a graph run or biological prediction.',config,rows};
writeFileSync(new URL('./event-sampling.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows));
