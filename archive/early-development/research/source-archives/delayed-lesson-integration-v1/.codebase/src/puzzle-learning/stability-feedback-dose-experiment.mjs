import assert from 'node:assert/strict';

// Fixed verified experience replay. Caller pins certificates and all identities.
// Memory plus pending receipt must be atomically saved before publication.
export async function runStabilityFeedbackDose({brain,experiences,schedule,state,save,publish,guard=()=>{},maxEvents=128}) {
  assert.deepEqual(schedule.conditions,['informative','absent','shuffled','disabled']);
  assert.equal(experiences.length,32);
  assert.deepEqual(schedule.doseEvents,[8,32]);
  assert.ok(Number.isSafeInteger(maxEvents)&&maxEvents>0&&maxEvents<=128);
  const persist=async()=>{guard();state.memory=brain.memory.snapshot();state.presentations=brain.presentations;await save(state);};
  brain.memory.restore(state.memory);brain.presentations=state.presentations;
  let completed=0;
  while(state.conditionIndex<schedule.conditions.length&&completed<maxEvents){
    const condition=schedule.conditions[state.conditionIndex];
    if(!state.active){brain.memory.restore(state.initial);state.active={condition,index:0,pending:null,eventRefs:[],doseRefs:[]};await persist();}
    const a=state.active;assert.equal(a.condition,condition);
    if(a.index<experiences.length){
      if(!a.pending){
        const source=experiences[a.index],e=source.experience;
        assert.equal(source.index,a.index);assert.ok(['success','failure'].includes(e.status));assert.equal(e.learningAllowed,true);
        let channel=schedule.informativeChannels[a.index];
        if(condition==='absent')channel=null;
        if(condition==='shuffled')channel=schedule.shuffledChannels[a.index];
        const before=brain.memory.snapshot();guard();
        const receipt=await brain.replay(e,{channel,plasticityEnabled:condition!=='disabled'});
        a.pending={condition,index:a.index,rowId:source.rowId,experience:e,channel,before,after:brain.memory.snapshot(),receipt};
        await persist();
      }
      a.eventRefs.push(await publish(`event-${condition}-${a.index}.json`,a.pending));
      a.pending=null;a.index++;state.totalEvents++;completed++;await persist();
    }
    if(schedule.doseEvents.includes(a.index)&&!a.doseRefs.some(x=>x.dose===a.index)){
      const ref=await publish(`dose-${condition}-${a.index}.json`,{condition,dose:a.index,memory:brain.memory.snapshot(),eventRefs:[...a.eventRefs]});
      a.doseRefs.push({dose:a.index,ref});await persist();
    }
    if(a.index===experiences.length){state.results.push({condition,eventRefs:a.eventRefs,doseRefs:a.doseRefs});state.conditionIndex++;state.active=null;await persist();}
  }
  return {complete:state.conditionIndex===schedule.conditions.length,completedEvents:completed,state};
}
