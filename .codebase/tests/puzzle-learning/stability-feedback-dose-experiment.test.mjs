import test from 'node:test';
import assert from 'node:assert/strict';
import { runStabilityFeedbackDose } from '../../src/puzzle-learning/stability-feedback-dose-experiment.mjs';
function fixture(){
 let value=10,calls=0;const records=new Map();
 const experiences=Array.from({length:32},(_,index)=>({index,rowId:`row-${Math.floor(index/2)%2}`,experience:{move:`move-${index%4}`,status:index%2?'success':'failure',learningAllowed:true}}));
 const labels=experiences.map(x=>x.experience.status==='success'?'PAM02':'PPL103');
 const brain={presentations:0,memory:{snapshot:()=>({value}),restore:s=>{value=s.value;}},replay:async(e,{channel,plasticityEnabled})=>{calls++;brain.presentations++;if(channel&&plasticityEnabled)value+=channel==='PAM02'?2:-1;return {channel,plasticityEnabled};}};
 const schedule={conditions:['informative','absent','shuffled','disabled'],doseEvents:[8,32],informativeChannels:labels,shuffledChannels:[...labels].reverse()};
 return {brain,experiences,schedule,state:{initial:{value:10},memory:{value:10},presentations:0,conditionIndex:0,totalEvents:0,active:null,results:[]},calls:()=>calls,records,
 publish:async(name,data)=>{if(records.has(name))assert.deepEqual(records.get(name),data);else records.set(name,structuredClone(data));return {path:name};}};
}
test('pending receipt resumes without duplicate update and controls share exact experiences/start',async()=>{
 const f=fixture();let saved,interrupted=false;
 const save=async s=>{saved=structuredClone(s);if(!interrupted&&s.active?.pending){interrupted=true;throw Error('interrupt');}};
 await assert.rejects(runStabilityFeedbackDose({...f,save}),/interrupt/);assert.equal(f.calls(),1);
 const result=await runStabilityFeedbackDose({...f,state:saved,save});
 assert.ok(result.complete);assert.equal(f.calls(),128);assert.equal(result.state.totalEvents,128);
 for(const c of f.schedule.conditions){
  const events=Array.from({length:32},(_,i)=>f.records.get(`event-${c}-${i}.json`));
  assert.equal(events[0].before.value,10);
  assert.deepEqual(events.map(e=>e.experience),f.experiences.map(e=>e.experience));
  assert.ok(f.records.has(`dose-${c}-8.json`));assert.ok(f.records.has(`dose-${c}-32.json`));
 }
 assert.equal(f.records.get('dose-absent-32.json').memory.value,10);
 assert.equal(f.records.get('dose-disabled-32.json').memory.value,10);
});
test('unknown experience is rejected before any teaching or memory update',async()=>{
 const f=fixture();f.experiences[0].experience.status='unknown';
 await assert.rejects(runStabilityFeedbackDose({...f,save:async()=>{}}));assert.equal(f.calls(),0);assert.deepEqual(f.brain.memory.snapshot(),{value:10});
});
test('event budget preserves dose publication and resumes the remaining schedule',async()=>{
 const f=fixture();let saved;
 const save=async s=>{saved=structuredClone(s);};
 const first=await runStabilityFeedbackDose({...f,save,maxEvents:8});
 assert.equal(first.complete,false);assert.equal(first.completedEvents,8);assert.ok(f.records.has('dose-informative-8.json'));
 const last=await runStabilityFeedbackDose({...f,state:saved,save});assert.ok(last.complete);assert.equal(f.calls(),128);
});
