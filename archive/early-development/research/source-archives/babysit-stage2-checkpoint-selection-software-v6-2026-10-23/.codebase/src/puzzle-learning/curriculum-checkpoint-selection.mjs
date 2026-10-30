// Prospective selection from the four published curriculum checkpoints. The
// independent evaluator supplies observations; no final-set inputs are accepted.
import assert from 'node:assert/strict';

const HASH=/^[a-f0-9]{64}$/;
const BLOCKS=[8,16,24,32];
const correct=row=>row.correct===true&&row.unique===true&&row.unaided===true;
const fields=['familyId','stratum','taskCriterion','positionSha256','boardHistorySha256',
  'candidateSetSha256','certificateSha256'];
const identity=rows=>JSON.stringify([...rows].sort((a,b)=>a.trialId.localeCompare(b.trialId))
  .map(row=>[row.trialId,...fields.map(field=>row[field])]));

export function selectCurriculumCheckpoint({stage,strata,candidates}={}){
  assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=12);
  assert(Array.isArray(strata)&&strata.length===4&&new Set(strata).size===4);
  const shell={schema:'curriculum-checkpoint-selection-v2',stage,selected:null,
    criterion:'Earliest of blocks 8/16/24/32 passing every validation and earlier-principle retention gate; controls use that same block',
    scope:'Independent validation observations only; does not certify additional interference retention or final transfer'};
  const unknown=reason=>({...shell,status:'unknown',reason});
  if(!Array.isArray(candidates)||!candidates.length||candidates.length>4)
    return unknown('Missing published validation checkpoints');
  const ordered=[...candidates].sort((a,b)=>(a?.blockIndex??-1)-(b?.blockIndex??-1));
  if(ordered.some((row,index)=>row?.blockIndex!==BLOCKS[index]
    ||!HASH.test(row.checkpointSha256??'')||!HASH.test(row.memorySha256??'')))
    return unknown('Checkpoint identities must be a complete prefix of blocks 8/16/24/32');
  const scored=[];let reference=null;
  for(const row of ordered){
    const choices=row.validationChoices;
    if(!Array.isArray(choices)||choices.length!==16||new Set(choices.map(choice=>choice?.trialId)).size!==16
      ||choices.some(choice=>typeof choice?.trialId!=='string'||typeof choice.familyId!=='string'
        ||typeof choice.taskCriterion!=='string'||!strata.includes(choice.stratum)
        ||fields.filter(field=>field.endsWith('Sha256')).some(field=>!HASH.test(choice[field]??''))
        ||['correct','unique','unaided'].some(field=>typeof choice[field]!=='boolean'))
      ||strata.some(stratum=>choices.filter(choice=>choice.stratum===stratum).length!==4))
      return unknown('Validation observations lack the same 16 trials and four semantic strata');
    const current=identity(choices);
    if(reference!==null&&reference!==current)return unknown('Validation task, candidate, certificate or family identities changed');
    reference=current;
    const earlier=row.earlierPrinciples??[];
    if(!Array.isArray(earlier)||earlier.length!==stage-1
      ||earlier.some((item,index)=>item.stage!==index+1||!Number.isSafeInteger(item.before)
        ||item.before<0||item.before>16||!Number.isSafeInteger(item.after)||item.after<0||item.after>16
        ||!Array.isArray(item.sentinels)||item.sentinels.length!==4
        ||item.sentinels.some(sentinel=>typeof sentinel?.correct!=='boolean')))
      return unknown('Earlier-principle validation and four training sentinels must be independently observed');
    const byStratum=Object.fromEntries(strata.map(stratum=>[stratum,
      choices.filter(choice=>choice.stratum===stratum&&correct(choice)).length]));
    const total=choices.filter(correct).length;
    const retention=earlier.every(item=>item.after>=item.before&&item.sentinels.every(item=>item.correct));
    scored.push({blockIndex:row.blockIndex,checkpointSha256:row.checkpointSha256,
      memorySha256:row.memorySha256,correct:total,byStratum,earlierRetentionIntact:retention,
      eligible:total>=14&&Object.values(byStratum).every(count=>count>=3)&&retention});
  }
  const selected=scored.find(row=>row.eligible)??null;
  return {...shell,status:selected?'selected':'gate-failed',selected,candidates:scored,
    ...(selected?{}:{reason:'No published checkpoint passes validation and earlier-principle retention'})};
}
