// Verified consequence -> declared experimental stimulus timing, never gains.
import { Chess } from 'chess.js';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export function temporalFeedbackPlan(experience, encoder, mapping, timing, {
  condition='informative', shuffledStatus=null,
}={}) {
  const {cueFrame,leadFrames,tailFrames,current}=timing;
  if(!['informative','absent','disabled','swapped','shuffled'].includes(condition)
    || ![cueFrame,leadFrames,tailFrames].every(Number.isSafeInteger)
    || leadFrames<1 || cueFrame<leadFrames || tailFrames<1 || cueFrame+tailFrames+1>32
    || !Number.isFinite(current) || current<=0 || current>1.5
    || (condition==='shuffled'?!['success','failure'].includes(shuffledStatus):shuffledStatus!==null))
    throw Error('Invalid registered temporal schedule or control');
  const context=experience?.context;
  if(typeof context?.pgn!=='string'||context.pgn.length>65536)throw Error('Missing bounded history');
  const board=new Chess();board.loadPgn(context.pgn);
  if(board.fen()!==context.fen||board.history().length>512)throw Error('Mismatched temporal feedback context');
  const checked=verifiedExperience(board,experience.move,context.task,experience.proof);
  for(const key of ['status','actor','learningAllowed','certificateSha256'])
    if(checked[key]!==experience[key])throw Error(`Mismatched temporal feedback ${key}`);
  if(checked.status==='unknown')return {skipped:true,frames:[],learningAllowed:false,reason:'Unknown consequence'};
  if(mapping?.schema!=='gamma2-rate-timing-map-v1'||mapping.groups.some(g=>g.danType!=='PPL103'||g.dan.length!==1))
    throw Error('Require registered gamma2 timing targets');
  const targets=[...new Set(mapping.groups.map(g=>g.dan[0].index))];
  if(!targets.length||targets.some(i=>!Number.isSafeInteger(i)||i<0))throw Error('Invalid temporal reinforcement cells');
  const cue=encoder.encode(board,experience.move,context.task);
  if(!Array.isArray(cue.stimulation)||!cue.stimulation.length
    ||cue.stimulation.some(c=>!Number.isSafeInteger(c.index)||c.index<0||!Number.isFinite(c.current)||c.current<=0||c.current>1.5)
    ||new Set(cue.stimulation.map(c=>c.index)).size!==cue.stimulation.length
    ||cue.stimulation.some(c=>targets.includes(c.index)))throw Error('Invalid or overlapping cue/pulse cells');
  const teachingStatus=condition==='shuffled'?shuffledStatus:condition==='swapped'
    ?(checked.status==='success'?'failure':'success'):checked.status;
  const pulseFrame=teachingStatus==='success'?cueFrame-leadFrames:cueFrame;
  const frames=Array.from({length:cueFrame+tailFrames+1},(_,index)=>({index,
    stimulation:[...(index===cueFrame?cue.stimulation.map(c=>({...c})):[]),
      ...(condition!=='absent'&&index===pulseFrame?targets.map(index=>({index,current})):[])],
    hasCue:index===cueFrame,hasPulse:condition!=='absent'&&index===pulseFrame}));
  const plan={schema:'verified-temporal-feedback-plan-v1',context:structuredClone(context),move:experience.move,
    certificateSha256:checked.certificateSha256,verifiedStatus:checked.status,teachingStatus,condition,
    plasticityEnabled:condition!=='disabled',cue,frames,timing:{...timing},
    scope:'Engineered temporal consequence code; source-motivated local receiver, not natural reward or sequence-credit validation'};
  return {...plan,identity:digest(plan),skipped:false,learningAllowed:true};
}
