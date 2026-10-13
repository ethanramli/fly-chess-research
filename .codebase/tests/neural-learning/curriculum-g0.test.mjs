import test from 'node:test';
import assert from 'node:assert/strict';
import {createG0Table,certifyG0,verifyG0,createG0Encoder,planG0Schedule,G0FeedbackSession} from '../../src/neural-learning/curriculum-g0.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';

// Inert recurrence arrays only. No connectome, graph training or biological validation.
function fixture(){
  const model={n:4,steps:2,saturation:10,config:{fixture:true},calls:0,fail:false,
    graph:{col:Int32Array.from([0,1]),sign:Int8Array.from([1,1])},
    params:{magnitude:Float32Array.from([0.5,0.4])},h:Array.from({length:3},()=>new Float32Array(4)),
    setMagnitude(e,v){this.params.magnitude[e]=v;},
    forward(input,stimulation,state){
      this.calls++;this.h[0].set(state);
      for(let t=1;t<=2;t++){
        this.h[t].set(this.h[t-1].map(v=>v*0.5));
        for(const c of stimulation)this.h[t][c.index]+=c.current;
      }
      if(this.fail)this.h[2][2]=NaN;
    }};
  const mapping={schema:'gamma2-rate-timing-map-v1',groups:[{mbonType:'MBON12',danType:'PPL103',
    kc:[0,1],kcTypes:['KCg-m','KCg-m'],edges:[0,1],dan:[{index:2}]}]};
  const memory=new RateTimingMemory(model,mapping,new Float32Array(4),{
    referenceMode:'fixed-unstimulated-model',tauKC:0.4,tauShort:0.6,tauLong:1,
    stepDuration:0.1,eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1});
  const table=createG0Table(),encoder=createG0Encoder(mapping,{seed:20261011,maxCells:1,totalCurrent:1.5});
  const session=new G0FeedbackSession({model,memory,mapping,table,encoder,
    timing:{cueFrame:2,leadFrames:2,tailFrames:5,current:1.5},identity:'a'.repeat(64)});
  const experience=planG0Schedule(table)[0].experience;
  const assessment={cue:experience.publicInput.cue,encoderIdentity:encoder.identity,memoryHash:digest(memory.snapshot()),
    rows:['A','B'].map(action=>({action,score:0,cueHash:digest(encoder.encode({cue:experience.publicInput.cue,action}))})),choice:null};
  return {model,memory,session,experience,assessment,encoder,table};
}

test('G0 independently rechecks contingencies; changed labels, phases, cues and exhausted proofs cannot teach',()=>{
  const a=fixture();assert.equal(verifyG0(a.table,a.experience).status,'success');
  const reversed=structuredClone(a.experience);reversed.phase='reversal';
  reversed.proof=certifyG0(a.table,reversed.phase,reversed.publicInput);reversed.status=reversed.proof.status;
  assert.equal(verifyG0(a.table,reversed).status,'failure');
  assert.deepEqual(a.encoder.encode(reversed.publicInput),a.encoder.encode(a.experience.publicInput));
  for(const change of [e=>{e.proof.status='failure';},e=>{e.phase='reversal';},
    e=>{e.publicInput.cue[3]=1;},e=>{e.status='failure';},e=>{e.proof.tableHash='b'.repeat(64);}]){
    const e=structuredClone(a.experience);change(e);assert.throws(()=>a.session.start(e,a.assessment));
    assert.equal(a.model.calls,0);assert.equal(a.session.pending,null);
  }
  const unknown={...a.experience,status:'unknown',proof:certifyG0(a.table,'acquisition',a.experience.publicInput,{maxRows:0})};
  const before=a.session.snapshot();assert.equal(a.session.start(unknown,a.assessment).skipped,true);
  assert.deepEqual(a.session.snapshot(),before);assert.equal(a.model.calls,0);
  assert.throws(()=>a.encoder.encode({...a.experience.publicInput,status:'success'}),/Only public/);
  assert.throws(()=>a.encoder.encode({...a.experience.publicInput,phase:'reversal'}),/Only public/);
});

test('G0 schedule matches 32/16/32 exposures and waveform classes per phase/action in every control',()=>{
  const a=fixture(),schedule=planG0Schedule(a.table);
  assert.equal(schedule.length,80);
  for(const [phase,count] of [['acquisition',32],['interference',16],['reversal',32]]){
    const phaseSlots=schedule.filter(s=>s.experience.phase===phase);assert.equal(phaseSlots.length,count);
    for(const action of ['A','B']){
      const slots=phaseSlots.filter(s=>s.experience.publicInput.action===action);
      assert.equal(slots.filter(s=>s.experience.status==='success').length,slots.filter(s=>s.shuffledStatus==='success').length);
      assert.equal(slots.filter(s=>s.experience.status==='failure').length,slots.filter(s=>s.shuffledStatus==='failure').length);
    }
    assert(phaseSlots.some(s=>s.experience.status!==s.shuffledStatus));
  }
  for(const slot of schedule){
    const plans=Object.fromEntries(['informative','absent','disabled','shuffled'].map(condition=>[condition,
      a.session.verify(slot.experience,condition==='shuffled'?{condition,shuffledStatus:slot.shuffledStatus}:{condition})]));
    assert.deepEqual(plans.informative.frames,plans.disabled.frames);
    for(const p of Object.values(plans)){
      assert.equal(p.frames.length,8);assert.equal(p.frames.filter(f=>f.hasCue).length,1);
      assert.deepEqual(p.frames.find(f=>f.hasCue).stimulation.filter(c=>c.index!==2),plans.informative.cue.stimulation);
      assert.equal(p.frames.filter(f=>f.hasPulse).length,p.condition==='absent'?0:1);
    }
    assert.equal(plans.disabled.plasticityEnabled,false);assert.equal(plans.absent.plasticityEnabled,true);
  }
});

test('G0 rejects stale, incomplete and forged unaided rankings before neural delivery',()=>{
  const a=fixture(),initial=a.session.snapshot();
  for(const change of [s=>{s.memoryHash='b'.repeat(64);},s=>{s.rows.pop();},s=>{s.rows[1].action='A';},
    s=>{s.cue[0]=1;},s=>{s.encoderIdentity='b'.repeat(64);},s=>{s.choice='A';},s=>{s.rows[0].cueHash='b'.repeat(64);}]){
    const s=structuredClone(a.assessment);change(s);assert.throws(()=>a.session.start(a.experience,s));
    assert.deepEqual(a.session.snapshot(),initial);assert.equal(a.model.calls,0);
  }
});

test('G0 published pending frames resume exactly once, reject forged recovery and roll back failed frames',()=>{
  const a=fixture(),b=fixture();a.session.start(a.experience,a.assessment);
  for(let i=0;i<3;i++)a.session.step();
  // Serialized publication boundary includes physiological state and the next frame cursor.
  const published=JSON.parse(JSON.stringify(a.session.snapshot()));b.session.restore(published);
  for(const change of [s=>{s.pending.cursor++;},s=>{s.pending.binding.assessment.rows[0].cueHash='b'.repeat(64);},
    s=>{s.pending.experience.proof.status='failure';},s=>{s.episode.state[0]=NaN;}]){
    const s=structuredClone(published);change(s);assert.throws(()=>b.session.restore(s));
    assert.deepEqual(b.session.snapshot(),published);assert.equal(b.model.calls,0);
  }
  a.model.fail=true;assert.throws(()=>a.session.step(),/Nonfinite/);assert.deepEqual(a.session.snapshot(),published);
  a.model.fail=false;
  for(let i=3;i<8;i++)assert.deepEqual(a.session.step(),b.session.step());
  assert.equal(b.model.calls,5);assert.deepEqual(a.session.finish(),b.session.finish());
  assert.deepEqual(a.memory.snapshot(),b.memory.snapshot());assert.throws(()=>b.session.step(),/No pending/);
  const final=a.memory.snapshot();a.memory.restore(fixture().memory.snapshot());a.memory.restore(final);
  assert.deepEqual(a.memory.snapshot(),final);
});

test('G0 disabled freezes every persistent component and absent removes external teaching only',()=>{
  const a=fixture(),initial=a.memory.snapshot();a.session.start(a.experience,a.assessment,{condition:'disabled'});
  for(let i=0;i<8;i++)a.session.step();a.session.finish();assert.deepEqual(a.memory.snapshot(),initial);
  const b=fixture();b.session.start(b.experience,b.assessment,{condition:'absent'});
  for(let i=0;i<8;i++)b.session.step();b.session.finish();assert.equal(b.memory.events,8);
  assert(b.memory.kcTrace.some(v=>v>0),'Absent must not silently disable activity-driven traces');
});
