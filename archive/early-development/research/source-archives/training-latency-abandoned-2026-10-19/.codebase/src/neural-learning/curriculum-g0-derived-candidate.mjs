// Neutral G0 contingency domain. These are synthetic consequences, never chess truth.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {digest} from './mushroom-body.mjs';
import {shuffledFeedback} from './association-validation.mjs';
import {DerivedTemporalFeedbackSession as TemporalFeedbackSession} from '../puzzle-learning/derived-temporal-feedback-session-candidate.mjs';
import {temporalStimulusFrames,validateTemporalOptions} from '../puzzle-learning/temporal-feedback-plan.mjs';

const actions=['A','B'],phases=['acquisition','interference','reversal'];
const cue=(interference,i)=>[interference,...[2,1,0].map(bit=>(i>>bit)&1)];
function checkCue(value){
  assert(Array.isArray(value)&&value.length===4&&value.every(v=>v===0||v===1),'Invalid public neutral cue');
}
function checkPublic(value){
  assert.deepEqual(Object.keys(value).sort(),['action','cue'],'Only public cue/action may enter the encoder');
  checkCue(value.cue);assert(actions.includes(value.action),'Invalid neutral action');
}

export function createG0Table(){
  const rows=phases.flatMap(phase=>Array.from({length:phase==='interference'?4:8},(_,i)=>{
    const preferred=(i%2)^(phase==='reversal'?1:0);
    return actions.map((action,index)=>({phase,cue:cue(phase==='interference'?1:0,i),action,
      status:index===preferred?'success':'failure'}));
  }).flat());
  return {schema:'curriculum-g0-table-v1',rows};
}

export function certifyG0(table,phase,publicInput,{maxRows=40}={}){
  assert.deepEqual(table,createG0Table(),'Require frozen independently reproducible contingency table');
  checkPublic(publicInput);assert(phases.includes(phase),'Unknown contingency phase');
  assert(Number.isSafeInteger(maxRows)&&maxRows>=0&&maxRows<=40,'Invalid proof work bound');
  for(let i=0;i<Math.min(maxRows,table.rows.length);i++){
    const row=table.rows[i];
    if(row.phase===phase&&digest(row.cue)===digest(publicInput.cue)&&row.action===publicInput.action)
      return {schema:'curriculum-g0-proof-v1',tableHash:digest(table),...structuredClone(row)};
  }
  return null; // Exhausted or out-of-domain evidence is unknown, never an adverse label.
}

export function verifyG0(table,experience){
  assert.deepEqual(table,createG0Table());
  assert(experience&&phases.includes(experience.phase),'Unknown contingency phase');
  checkPublic(experience.publicInput);
  if(experience.proof===null){
    assert.equal(experience.status,'unknown');
    return {status:'unknown',learningAllowed:false,certificateSha256:null};
  }
  // Independent lookup, without trusting the generator's selected row or label.
  const matches=table.rows.filter(row=>row.phase===experience.phase
    &&row.action===experience.publicInput.action&&digest(row.cue)===digest(experience.publicInput.cue));
  assert.equal(matches.length,1,'Missing or ambiguous contingency');
  const proof={schema:'curriculum-g0-proof-v1',tableHash:digest(table),...structuredClone(matches[0])};
  assert.deepEqual(experience.proof,proof,'Forged or mismatched neutral proof');
  assert.equal(experience.status,proof.status,'Mismatched neutral consequence');
  return {status:proof.status,learningAllowed:true,certificateSha256:digest(proof)};
}

export function createG0Encoder(mapping,{seed,maxCells=8,totalCurrent=12}={}){
  assert(Number.isSafeInteger(seed)&&seed>=0,'Pinned input projection seed required');
  assert.equal(mapping?.schema,'gamma2-rate-timing-map-v1');
  const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b);
  assert(Number.isSafeInteger(maxCells)&&maxCells>=1&&maxCells<=8&&maxCells<=pool.length);
  assert(pool.every(i=>Number.isSafeInteger(i)&&i>=0));
  assert(Number.isFinite(totalCurrent)&&totalCurrent>0&&totalCurrent/maxCells<=1.5);
  const config={seed,maxCells,totalCurrent};
  const identity=digest({schema:'curriculum-g0-public-cue-v1',config,pool});
  const encode=publicInput=>{
    checkPublic(publicInput);
    // ponytail: rank the existing bounded pool once per public cue/action; no learned translator.
    const selected=pool.map(index=>({index,hash:createHash('sha256')
      .update(JSON.stringify([seed,publicInput.cue,publicInput.action,index])).digest('hex')}))
      .sort((a,b)=>a.hash.localeCompare(b.hash)||a.index-b.index).slice(0,maxCells).map(x=>x.index).sort((a,b)=>a-b);
    return {schema:'curriculum-g0-public-cue-v1',identity,publicInput:structuredClone(publicInput),
      stimulation:selected.map(index=>({index,current:totalCurrent/maxCells}))};
  };
  return Object.freeze({identity,config:Object.freeze(config),encode});
}

export function planG0Schedule(table,{shuffleSeed=20261011}={}){
  assert.deepEqual(table,createG0Table());assert(Number.isSafeInteger(shuffleSeed)&&shuffleSeed>=0);
  const counts={acquisition:32,interference:16,reversal:32};
  return phases.flatMap((phase,phaseIndex)=>{
    const rows=table.rows.filter(row=>row.phase===phase);
    const events=Array.from({length:counts[phase]},(_,i)=>{
      const row=rows[i%rows.length],publicInput={cue:row.cue,action:row.action};
      return {phase,publicInput:structuredClone(publicInput),status:row.status,proof:certifyG0(table,phase,publicInput)};
    });
    // Shuffle repeated labels within each action stratum. Exposure and class totals stay matched.
    const labels=events.map(e=>e.status);
    for(const action of actions){
      const indices=events.map((e,i)=>e.publicInput.action===action?i:-1).filter(i=>i>=0);
      const shuffled=shuffledFeedback(indices.map(i=>labels[i]),shuffleSeed+phaseIndex*2+actions.indexOf(action));
      indices.forEach((index,i)=>{labels[index]=shuffled[i];});
    }
    assert(labels.some((label,i)=>label!==events[i].status),'Shuffle did not break contingency');
    return events.map((experience,i)=>({experience,shuffledStatus:labels[i]}));
  });
}

export class G0FeedbackSession extends TemporalFeedbackSession{
  constructor(options){
    super(options);assert.deepEqual(options.table,createG0Table());
    this.table=structuredClone(options.table);
  }
  verify(experience,options={}){
    assert(['informative','absent','disabled','shuffled'].includes(options.condition??'informative'),'Invalid G0 control');
    validateTemporalOptions(this.timing,options);
    const checked=verifyG0(this.table,experience);
    if(!checked.learningAllowed)return {skipped:true,frames:[],learningAllowed:false,reason:'Unknown neutral consequence'};
    const cue=this.encoder.encode(experience.publicInput);
    const stimulus=temporalStimulusFrames(cue,this.mapping,this.timing,checked.status,options);
    const plan={schema:'curriculum-g0-temporal-plan-v1',tableHash:digest(this.table),
      publicInput:structuredClone(experience.publicInput),phase:experience.phase,
      certificateSha256:checked.certificateSha256,verifiedStatus:checked.status,
      condition:options.condition??'informative',cue,...stimulus,timing:structuredClone(this.timing),
      scope:'Synthetic association contingency; experimental pulse-order code, not chess or biological reward'};
    return {...plan,identity:digest(plan),skipped:false,learningAllowed:true};
  }
  bind(experience,assessment,memoryHash){
    const checked=verifyG0(this.table,experience);assert(checked.learningAllowed);
    assert.equal(assessment.memoryHash,memoryHash,'Stale neutral assessment');
    assert.deepEqual(assessment.cue,experience.publicInput.cue,'Mismatched assessed public context');
    assert.equal(assessment.encoderIdentity,this.encoder.identity,'Mismatched input projection');
    assert(Array.isArray(assessment.rows)&&assessment.rows.length===2,'Require both unaided neutral actions');
    assert.deepEqual(assessment.rows.map(r=>r.action).sort(),actions,'Duplicate or missing neutral action');
    for(const row of assessment.rows){
      assert(Number.isFinite(row.score),'Nonfinite neutral score');
      assert.equal(row.cueHash,digest(this.encoder.encode({cue:assessment.cue,action:row.action})),'Mismatched assessed cue');
    }
    const [a,b]=actions.map(action=>assessment.rows.find(r=>r.action===action));
    assert.equal(assessment.choice,a.score===b.score?null:a.score>b.score?'A':'B','Inconsistent neutral choice');
    return {schema:'curriculum-g0-assessment-binding-v1',coverage:'all-neutral-actions',
      tableHash:digest(this.table),certificateSha256:checked.certificateSha256,phase:experience.phase,
      publicInput:structuredClone(experience.publicInput),assessment:structuredClone(assessment),memoryHash};
  }
}
