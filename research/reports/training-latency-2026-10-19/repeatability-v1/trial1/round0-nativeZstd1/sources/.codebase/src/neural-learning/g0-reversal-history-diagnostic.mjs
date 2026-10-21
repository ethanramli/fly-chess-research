// Fixed diagnostic schedule; memory interventions are applied once at stage entry.
import {createG0Table,planG0Schedule} from './curriculum-g0.mjs';

export function planG0HistoryDiagnostic(){
  const table=createG0Table(),shuffleSeeds=[20261011,20261014,20261015];
  const conditions=[{id:'informative',kind:'informative'},{id:'absent',kind:'absent'},
    {id:'disabled',kind:'disabled'},...shuffleSeeds.map(seed=>({id:`shuffled-${seed}`,kind:'shuffled',seed}))];
  const schedules=new Map(shuffleSeeds.map(seed=>[seed,planG0Schedule(table,{shuffleSeed:seed})]));
  const stages=[];
  for(const [phase,branch] of [['acquisition','prefix'],['interference','prefix'],
    ['reversal','retained'],['reversal','reset']]){
    for(const condition of conditions){
      const slots=schedules.get(condition.seed??shuffleSeeds[0]).filter(s=>s.experience.phase===phase);
      stages.push({id:`${phase}:${branch}:${condition.id}`,phase,branch,condition:structuredClone(condition),
        memoryStart:branch==='reset'?'initial':branch==='retained'?'pre-reversal':'continuous',
        slots:slots.map(slot=>({experience:structuredClone(slot.experience),options:condition.kind==='shuffled'
          ?{condition:'shuffled',shuffledStatus:slot.shuffledStatus}:{condition:condition.kind}}))});
    }
  }
  return {schema:'g0-reversal-history-diagnostic-plan-v1',projectionSeed:20261011,shuffleSeeds,conditions,stages};
}
